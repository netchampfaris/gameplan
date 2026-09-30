import Phaser from 'phaser'
import { registerEmoteAnimations } from '../avatar/textures'
import type { ArcadeBridge, KeyboardOwner, PresenceEntry } from '../bridge'
import { GameAssetKeys, GameAssetPaths, packAssetUrl, tilesetTextureKey } from '../config/assets'
import { Depth } from '../config/depths'
import type { SeasonId } from '../config/seasons'
import { KeyboardMovementController } from '../input/KeyboardMovementController'
import { nearestInteractable, RoomInteractions, type InteractionContext } from '../interactions'
import type { ArcadeNet } from '../net/ArcadeNet'
import { MAX_SAY_LENGTH, type Occupant, type RoomId } from '../net/protocol'
import { EMOTE_CELL } from '../avatar/emotes'
import { LocalPlayer } from '../objects/LocalPlayer'
import { RemotePlayer } from '../objects/RemotePlayer'
import { preloadSheets } from '../objects/sheets'
import { readInteractables, type Interactable } from '../world/interactables'
import { addWorldProps, queueWorldPropSheets, type TiledMapData } from '../world/props'
import type { CelebrationSource } from '../interactions/party'
import type { CatSource } from '../interactions/pet'
import type { PlantSource } from '../interactions/plant'
import type { RoomPerson } from '../interactions/registry'
import type { HomeSource } from './HomeScene'

/** What every Room needs from outside the game. `Arcade.vue` builds these once. */
export interface ArcadeServices {
  bridge: ArcadeBridge
  net: ArcadeNet
  homes: HomeSource
  plants: PlantSource
  celebrations: CelebrationSource
  cats: CatSource
  /** Decorates the Common Room for the whole session: a season is picked once, on entering the Arcade. */
  season: SeasonId | null
}

/** A map to load from a URL, or Tiled JSON already in memory (e.g. a generated Home). */
export type RoomMap = { url: string } | { data: TiledMapData }

/**
 * Passed as scene data, so switching Rooms is `this.scene.start(key, data)`. A scene
 * started without a map uses its own `defaultRoom()`, at `spawn` if one is given.
 */
export interface RoomSceneData {
  room: RoomId
  map: RoomMap
  /** Name of an object in the map's `Spawn Points` layer. */
  spawn?: string
}

const DEFAULT_SPAWN = 'spawn-center'
const TILE = 48
// Play zoom: a whole number, so every tile covers the same screen pixels, picked to
// show about this many tiles across, and at least MIN_TILES_DOWN tiles down.
const TILES_ACROSS = { min: 14, max: 22 }
const MIN_TILES_DOWN = 7
const MAX_ZOOM = 6
const SPAWN_SPREAD = 64
const SPAWN_ATTEMPTS = 8

/**
 * A place people can be together: a map, the player, everyone else in the same Room,
 * and the things they can use. Each Room in the game is a subclass that names its map.
 */
export abstract class RoomScene extends Phaser.Scene {
  protected readonly services: ArcadeServices
  protected room!: RoomSceneData
  protected map!: Phaser.Tilemaps.Tilemap
  protected player: LocalPlayer | null = null
  protected interactables: Interactable[] = []
  /** `whole` frames the entire Room and stops following the player (decorating). */
  protected framing: 'follow' | 'whole' = 'follow'
  /** Screen pixels on the right and bottom that the HUD covers. */
  protected inset = { right: 0, bottom: 0 }
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null
  private collider: Phaser.Physics.Arcade.Collider | null = null
  private props: Phaser.GameObjects.Sprite[] = []
  private mapKey = ''
  private readonly remotes = new Map<string, RemotePlayer>()
  private roomInteractions: RoomInteractions | null = null
  /** The player as the server knows them, once joined. */
  private self: Occupant | null = null
  private readonly cleanups: (() => void)[] = []

  constructor(key: string, services: ArcadeServices) {
    super(key)
    this.services = services
  }

  /** The Room this scene shows when it is started without data. */
  protected abstract defaultRoom(): RoomSceneData

  init(data: Partial<RoomSceneData>) {
    this.room =
      data.room && data.map
        ? { room: data.room, map: data.map, spawn: data.spawn }
        : { ...this.defaultRoom(), ...(data.spawn ? { spawn: data.spawn } : {}) }
    // In dev the map JSON changes while the game runs; a fresh key skips Phaser's cache.
    this.mapKey = import.meta.env.DEV ? `map:${this.room.room}:${Date.now()}` : `map:${this.room.room}`
  }

  preload() {
    if (!this.textures.exists(GameAssetKeys.emotes)) {
      this.load.spritesheet(GameAssetKeys.emotes, GameAssetPaths.emotes, { frameWidth: EMOTE_CELL, frameHeight: EMOTE_CELL })
    }
    preloadSheets(this)

    const { map } = this.room
    if ('data' in map) {
      this.cache.tilemap.add(this.mapKey, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: map.data })
      this.queueMapSheets(map.data)
      return
    }
    this.load.tilemapTiledJSON(this.mapKey, import.meta.env.DEV ? `${map.url}?v=${Date.now()}` : map.url)
    // The map names its own tilesets and props, so queue their sheets once it has loaded.
    this.load.once(`filecomplete-tilemapJSON-${this.mapKey}`, (_key: string, _type: string, data: TiledMapData) =>
      this.queueMapSheets(data),
    )
  }

  create() {
    const keyboard = this.input.keyboard
    if (!keyboard) throw new Error('Keyboard input is not available')

    registerEmoteAnimations(this.game)
    this.createMap()
    this.interactables = readInteractables(this.map)

    const spawn = this.spawnPoint()
    this.player = new LocalPlayer(this, {
      ...spawn,
      fullName: '',
      appearance: this.services.bridge.state.appearance,
      movement: new KeyboardMovementController(keyboard),
    })
    this.addCollider()
    keyboard.on('keydown-E', this.interact, this)
    this.roomInteractions = new RoomInteractions(this.interactables, this.interactionContext(this.player))

    this.setupCamera()
    this.connectBridge()
    this.connectNet()

    this.scale.on(Phaser.Scale.Events.RESIZE, this.setupCamera, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this)
    void this.services.net.join(this.room.room, this.services.bridge.state.appearance, this.player.pose)
  }

  update(time: number, delta: number) {
    const player = this.player
    if (!player) return
    player.update(delta)
    for (const remote of this.remotes.values()) remote.update()
    this.roomInteractions?.update(time, delta)

    const nearest = player.isSitting ? null : nearestInteractable(this.interactables, player.sprite.x, player.sprite.y)
    const label = nearest ? (nearest.target.label ?? nearest.handler.label) : null
    const current = this.services.bridge.state.prompt
    if (current?.label !== label || current?.target !== nearest?.target.id) {
      this.services.bridge.state.prompt = nearest && label ? { label, target: nearest.target.id } : null
    }

    this.services.net.sendPose(player.pose)
  }

  private interact() {
    const player = this.player
    if (!player) return
    if (player.isSitting) {
      player.standUp()
      return
    }
    const nearest = nearestInteractable(this.interactables, player.sprite.x, player.sprite.y)
    if (!nearest) return
    nearest.handler.interact(nearest.target, this.interactionContext(player))
  }

  private interactionContext(player: LocalPlayer): InteractionContext {
    const { bridge, net, plants, celebrations, cats } = this.services
    return {
      scene: this,
      map: this.map,
      room: this.room.room,
      interactables: this.interactables,
      player,
      bridge,
      net,
      plants,
      celebrations,
      cats,
      people: () => this.people(player),
    }
  }

  private people(player: LocalPlayer): RoomPerson[] {
    if (!this.self) return []
    const self = { user: this.self.user, x: player.sprite.x, y: player.sprite.y, sitting: player.isSitting }
    const others = [...this.remotes.values()].map(({ occupant, avatar }) => ({
      user: occupant.user,
      x: avatar.sprite.x,
      y: avatar.sprite.y,
      sitting: avatar.pose.state === 'sit',
    }))
    return [self, ...others]
  }

  private queueMapSheets(data: TiledMapData) {
    for (const tileset of data.tilesets) {
      const key = tilesetTextureKey(tileset.name)
      if (!this.textures.exists(key)) this.load.image(key, packAssetUrl(tileset.image))
    }
    queueWorldPropSheets(this, data)
  }

  /**
   * Swaps in a new map for the same Room, e.g. a Home its owner just refurnished. Every
   * sheet the new map uses must be loaded already. The player stays where they are,
   * unless furniture now stands there.
   */
  protected replaceMap(data: TiledMapData) {
    const player = this.player
    this.collider?.destroy()
    this.collider = null
    for (const prop of this.props.splice(0)) prop.destroy()
    this.roomInteractions?.destroy()
    this.map.destroy()
    this.cache.tilemap.remove(this.mapKey)

    this.mapKey = `map:${this.room.room}:${Date.now()}`
    this.cache.tilemap.add(this.mapKey, { format: Phaser.Tilemaps.Formats.TILED_JSON, data })
    this.createMap()
    this.interactables = readInteractables(this.map)
    if (player) {
      this.addCollider()
      this.roomInteractions = new RoomInteractions(this.interactables, this.interactionContext(player))
      if (this.collisionLayer?.getTileAtWorldXY(player.sprite.x, player.sprite.y)?.collides) {
        const spawn = this.spawnPoint()
        player.sprite.body?.reset(spawn.x, spawn.y)
      }
    }
    this.setupCamera()
  }

  private addCollider() {
    if (this.player && this.collisionLayer) this.collider = this.physics.add.collider(this.player.sprite, this.collisionLayer)
  }

  private createMap() {
    this.map = this.make.tilemap({ key: this.mapKey })
    const tilesets = this.map.tilesets.map((tileset) => {
      const added = this.map.addTilesetImage(tileset.name, tilesetTextureKey(tileset.name))
      if (!added) throw new Error(`Tileset could not be loaded: ${tileset.name}`)
      return added
    })
    this.createLayer(['Floor'], tilesets, Depth.FLOOR)
    this.createLayer(['Decor'], tilesets, Depth.DECOR, { optional: true })
    this.createLayer(['Objects Back', 'Objects'], tilesets, Depth.OBJECTS_BACK)
    this.createLayer(['Objects Front'], tilesets, Depth.OBJECTS_FRONT, { optional: true })
    // Tops of tall furniture: drawn over avatars, which are y-sorted by their feet.
    this.createLayer(['Above'], tilesets, Depth.ABOVE, { optional: true })
    this.collisionLayer = this.createLayer(['Collision'], tilesets, Depth.COLLISION)
    this.collisionLayer.setVisible(false)
    this.collisionLayer.setCollisionByExclusion([-1])
    this.props = addWorldProps(this, this.map)
  }

  private createLayer(
    names: string[],
    tilesets: Phaser.Tilemaps.Tileset[],
    depth: number,
    options: { optional: true },
  ): Phaser.Tilemaps.TilemapLayer | null
  private createLayer(names: string[], tilesets: Phaser.Tilemaps.Tileset[], depth: number): Phaser.Tilemaps.TilemapLayer
  private createLayer(
    names: string[],
    tilesets: Phaser.Tilemaps.Tileset[],
    depth: number,
    options: { optional?: boolean } = {},
  ): Phaser.Tilemaps.TilemapLayer | null {
    const index = this.map.layers.findIndex((layer) => names.includes(layer.name))
    const layer = index === -1 ? null : this.map.createLayer(index, tilesets, 0, 0)
    if (!layer) {
      if (options.optional) return null
      const available = this.map.layers.map((item) => item.name).join(', ')
      throw new Error(`Map layer not found: ${names.join(' or ')}. Available layers: ${available}`)
    }
    return layer.setDepth(depth)
  }

  /**
   * A free spot near the Room's spawn point. People arriving together land a little apart
   * instead of on top of each other.
   */
  private spawnPoint(): { x: number; y: number } {
    const name = this.room.spawn ?? DEFAULT_SPAWN
    const spawn = this.map.getObjectLayer('Spawn Points')?.objects.find((object) => object.name === name)
    const center = spawn?.x && spawn.y ? { x: spawn.x, y: spawn.y } : { x: this.map.widthInPixels / 2, y: this.map.heightInPixels / 2 }
    for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt++) {
      const x = center.x + Phaser.Math.Between(-SPAWN_SPREAD, SPAWN_SPREAD)
      const y = center.y + Phaser.Math.Between(-SPAWN_SPREAD, SPAWN_SPREAD) / 2
      if (!this.collisionLayer?.getTileAtWorldXY(x, y)?.collides) return { x, y }
    }
    return center
  }

  /**
   * Zooms by a whole number, so pixel art stays crisp and tiles meet without seams, and
   * centres a Room smaller than the screen over the dark background. While decorating,
   * frames the whole Room beside the HUD instead of following the player.
   */
  protected setupCamera() {
    const camera = this.cameras.main
    const width = this.map.widthInPixels
    const height = this.map.heightInPixels
    this.physics.world.setBounds(0, 0, width, height)

    const viewWidth = Math.max(1, this.scale.width - this.inset.right)
    const viewHeight = Math.max(1, this.scale.height - this.inset.bottom)
    camera.setViewport(0, 0, viewWidth, viewHeight)
    const zoom = this.framing === 'whole' ? wholeRoomZoom(viewWidth, viewHeight, width, height) : playZoom(viewWidth, viewHeight)
    camera.setZoom(zoom)

    // A camera cannot centre bounds smaller than its view, so pad them out to the view,
    // by whole screen pixels to keep tiles on the pixel grid.
    const padX = Math.max(0, Math.floor((viewWidth - width * zoom) / 2)) / zoom
    const padY = Math.max(0, Math.floor((viewHeight - height * zoom) / 2)) / zoom
    camera.setBounds(-padX, -padY, Math.max(width + padX * 2, viewWidth / zoom), Math.max(height + padY * 2, viewHeight / zoom))

    if (this.framing === 'whole' || !this.player) {
      camera.stopFollow()
      camera.centerOn(width / 2, height / 2)
    } else {
      camera.startFollow(this.player.sprite, true, 0.12, 0.12)
    }
  }

  /** Commands from the HUD. */
  private connectBridge() {
    const { bridge, net } = this.services
    this.cleanups.push(
      bridge.commands.on('say', ({ text }) => {
        const message = Array.from(text.trim()).slice(0, MAX_SAY_LENGTH).join('')
        if (!message) return
        this.player?.avatar.say(message)
        net.say(message)
      }),
      bridge.commands.on('emote', ({ emote }) => {
        this.player?.avatar.emote(emote)
        net.emote(emote)
      }),
      bridge.commands.on('appearance', ({ appearance }) => {
        this.player?.avatar.setAppearance(appearance)
        net.setAppearance(appearance)
        this.publishPresence()
      }),
      bridge.commands.on('keyboard', ({ owner }) => this.applyKeyboardOwner(owner)),
    )
    // The HUD may have taken the keyboard before this Room existed (the welcome
    // customizer opens as the game starts), so take the current owner, not only changes.
    this.applyKeyboardOwner(bridge.state.keyboard)
  }

  private applyKeyboardOwner(owner: KeyboardOwner) {
    const keyboard = this.input.keyboard
    if (!keyboard) return
    // While the HUD has the keyboard, Phaser must neither move the Avatar nor call
    // preventDefault on keys the player is typing.
    if (owner === 'hud') {
      keyboard.enabled = false
      keyboard.disableGlobalCapture()
      keyboard.resetKeys()
      this.player?.halt()
    } else {
      keyboard.enabled = true
      keyboard.enableGlobalCapture()
    }
  }

  /** Everyone else in the Room. */
  private connectNet() {
    const { bridge, net } = this.services
    this.cleanups.push(
      net.events.on('snapshot', ({ self, occupants }) => {
        this.self = self
        this.player?.avatar.setName(self.fullName)
        for (const remote of this.remotes.values()) remote.destroy()
        this.remotes.clear()
        for (const occupant of occupants) this.addRemote(occupant)
        bridge.state.connection = 'connected'
        bridge.state.error = null
        bridge.state.room = this.room.room
        // A rejoin after a reconnect starts with empty hands on the server.
        const holding = this.player?.avatar.holding
        if (holding) net.hold(holding)
        this.publishPresence()
      }),
      net.events.on('joined', (occupant) => {
        this.addRemote(occupant)
        this.publishPresence()
      }),
      net.events.on('moved', ({ id, ...pose }) => this.remotes.get(id)?.receive(pose)),
      net.events.on('said', ({ id, text }) => this.remotes.get(id)?.avatar.say(text)),
      net.events.on('emoted', ({ id, emote }) => this.remotes.get(id)?.avatar.emote(emote)),
      net.events.on('held', ({ id, item }) => this.remotes.get(id)?.avatar.hold(item)),
      net.events.on('used', ({ id, target, value }) => {
        const remote = this.remotes.get(id)
        this.roomInteractions?.observe(target, {
          actor: remote?.avatar ?? null,
          fullName: remote?.occupant.fullName ?? null,
          value: value ?? null,
        })
      }),
      net.events.on('appearance', ({ id, appearance }) => {
        this.remotes.get(id)?.setAppearance(appearance)
        this.publishPresence()
      }),
      net.events.on('left', ({ id }) => {
        this.remotes.get(id)?.destroy()
        this.remotes.delete(id)
        this.publishPresence()
      }),
      net.events.on('error', ({ message }) => {
        bridge.state.connection = 'failed'
        bridge.state.error = message
      }),
    )
  }

  private addRemote(occupant: Occupant) {
    if (occupant.id === this.self?.id) return
    this.remotes.get(occupant.id)?.destroy()
    this.remotes.set(occupant.id, new RemotePlayer(this, occupant))
  }

  private publishPresence() {
    const { bridge } = this.services
    const entry = ({ id, user, fullName, appearance }: Occupant, isSelf: boolean): PresenceEntry => ({
      id,
      user,
      fullName,
      appearance,
      isSelf,
    })
    const others = [...this.remotes.values()]
      .map((remote) => entry(remote.occupant, false))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
    bridge.state.occupants = this.self
      ? [entry({ ...this.self, appearance: bridge.state.appearance }, true), ...others]
      : others
  }

  private shutdown() {
    for (const cleanup of this.cleanups.splice(0)) cleanup()
    this.roomInteractions?.destroy()
    this.roomInteractions = null
    this.scale.off(Phaser.Scale.Events.RESIZE, this.setupCamera, this)
    this.input.keyboard?.off('keydown-E', this.interact, this)
    // No `net.leave()` here: Phaser can create the next Room before shutting this one
    // down, and a late leave would undo that Room's join. Joining a Room leaves the last
    // one on the server, and leaving the Arcade for good is `net.destroy()`.
    for (const remote of this.remotes.values()) remote.destroy()
    this.remotes.clear()
    this.player?.destroy()
    this.player = null
    this.services.bridge.state.occupants = []
    this.services.bridge.state.prompt = null
    this.services.bridge.state.board = null
    this.services.bridge.state.room = null
  }
}

/** The whole-number zoom that shows closest to TILES_ACROSS tiles across. */
function playZoom(viewWidth: number, viewHeight: number): number {
  let best = 1
  let bestMiss = Infinity
  for (let zoom = 1; zoom <= MAX_ZOOM; zoom++) {
    if (zoom > 1 && viewHeight / (TILE * zoom) < MIN_TILES_DOWN) break
    const across = viewWidth / (TILE * zoom)
    const miss = Math.max(0, TILES_ACROSS.min - across, across - TILES_ACROSS.max)
    if (miss < bestMiss) {
      best = zoom
      bestMiss = miss
    }
  }
  return best
}

/** The largest whole-number zoom that fits the Room; below 1, the largest that keeps tiles whole pixels. */
function wholeRoomZoom(viewWidth: number, viewHeight: number, width: number, height: number): number {
  const fit = Math.min(viewWidth / width, viewHeight / height)
  // Below 1, shrink by whole screen pixels per tile, so tiles still meet on the pixel grid.
  return fit >= 1 ? Math.floor(fit) : Math.max(1, Math.floor(fit * TILE)) / TILE
}
