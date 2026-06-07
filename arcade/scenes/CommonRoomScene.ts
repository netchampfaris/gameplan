import Phaser from 'phaser'
import { GameAssetKeys, GameAssetPaths, TiledTilesetNames } from '../config/assets'
import { registerSpriteAtlasFrames } from '../config/spriteAtlas'
import { KeyboardMovementController } from '../input/KeyboardMovementController'
import { PlayerAvatar } from '../objects/PlayerAvatar'

const COMMON_ROOM_SCENE_KEY = 'scene:common-room'
const PLAYER_ATLAS_NAME = 'character_01'

export class CommonRoomScene extends Phaser.Scene {
  private player: PlayerAvatar | null = null
  private movement: KeyboardMovementController | null = null
  private map: Phaser.Tilemaps.Tilemap | null = null
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null
  private commonRoomMapKey = GameAssetKeys.maps.world

  constructor() {
    super(COMMON_ROOM_SCENE_KEY)
  }

  preload() {
    this.commonRoomMapKey = import.meta.env.DEV
      ? `${GameAssetKeys.maps.world}:${Date.now()}`
      : GameAssetKeys.maps.world
    const commonRoomMapPath = import.meta.env.DEV
      ? `${GameAssetPaths.maps.world}?v=${Date.now()}`
      : GameAssetPaths.maps.world

    this.load.image(GameAssetKeys.characters.player, GameAssetPaths.characters.player)
    this.load.json(GameAssetKeys.spriteAtlases, GameAssetPaths.spriteAtlases)
    this.load.tilemapTiledJSON(this.commonRoomMapKey, commonRoomMapPath)
    this.load.image(GameAssetKeys.tilesets.roomBuilder, GameAssetPaths.tilesets.roomBuilder)
    this.load.image(GameAssetKeys.tilesets.livingRoom, GameAssetPaths.tilesets.livingRoom)
    this.load.image(GameAssetKeys.tilesets.generic, GameAssetPaths.tilesets.generic)
    this.load.image(GameAssetKeys.tilesets.kitchen, GameAssetPaths.tilesets.kitchen)
    this.load.image(
      GameAssetKeys.tilesets.conferenceHall,
      GameAssetPaths.tilesets.conferenceHall,
    )
    this.load.image(
      GameAssetKeys.tilesets.classroomLibrary,
      GameAssetPaths.tilesets.classroomLibrary,
    )
    this.load.image(GameAssetKeys.tilesets.basement, GameAssetPaths.tilesets.basement)
  }

  create() {
    registerSpriteAtlasFrames(this, PLAYER_ATLAS_NAME, GameAssetKeys.characters.player)
    this.createRoomMap()
    this.createPlayer()
    this.setupCamera()
    this.addDebugLabel()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeRoom, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeRoom, this)
    })
  }

  update() {
    if (!this.player || !this.movement) return

    const input = this.movement.read()
    this.player.move(input.velocity, input.direction, input.isSitting)
  }

  private createRoomMap() {
    this.map = this.make.tilemap({ key: this.commonRoomMapKey })

    const roomBuilderTileset = this.map.addTilesetImage(
      TiledTilesetNames.roomBuilder,
      GameAssetKeys.tilesets.roomBuilder,
    )
    const livingRoomTileset = this.map.addTilesetImage(
      TiledTilesetNames.livingRoom,
      GameAssetKeys.tilesets.livingRoom,
    )
    const genericTileset = this.map.addTilesetImage(
      TiledTilesetNames.generic,
      GameAssetKeys.tilesets.generic,
    )
    const kitchenTileset = this.map.addTilesetImage(
      TiledTilesetNames.kitchen,
      GameAssetKeys.tilesets.kitchen,
    )
    const conferenceHallTileset = this.map.addTilesetImage(
      TiledTilesetNames.conferenceHall,
      GameAssetKeys.tilesets.conferenceHall,
    )
    const classroomLibraryTileset = this.map.addTilesetImage(
      TiledTilesetNames.classroomLibrary,
      GameAssetKeys.tilesets.classroomLibrary,
    )
    const basementTileset = this.map.addTilesetImage(
      TiledTilesetNames.basement,
      GameAssetKeys.tilesets.basement,
    )

    if (
      !roomBuilderTileset ||
      !livingRoomTileset ||
      !genericTileset ||
      !kitchenTileset ||
      !conferenceHallTileset ||
      !classroomLibraryTileset ||
      !basementTileset
    ) {
      throw new Error('Common Room tilesets could not be loaded')
    }

    const tilesets = [
      roomBuilderTileset,
      livingRoomTileset,
      genericTileset,
      kitchenTileset,
      conferenceHallTileset,
      classroomLibraryTileset,
      basementTileset,
    ]
    this.createVisibleLayer(['Floor'], tilesets, -30)
    this.createVisibleLayer(['Decor'], tilesets, -25, { optional: true })
    this.createVisibleLayer(['Objects Back', 'Objects'], tilesets, -10)
    this.createVisibleLayer(['Objects Front'], tilesets, 10, { optional: true })
    this.collisionLayer = this.createVisibleLayer(['Collision'], tilesets, -20)
    this.collisionLayer.setVisible(false)
    this.collisionLayer.setCollisionByExclusion([-1])
  }

  private createPlayer() {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is not available')
    }

    this.player = new PlayerAvatar(
      this,
      GameAssetKeys.characters.player,
      this.playerSpawnPoint.x,
      this.playerSpawnPoint.y,
    )
    this.player.setCollideWorldBounds(true)
    if (this.collisionLayer) {
      this.physics.add.collider(this.player, this.collisionLayer)
    }
    this.movement = new KeyboardMovementController(this.input.keyboard)
  }

  private setupCamera() {
    const width = this.map?.widthInPixels ?? this.scale.width
    const height = this.map?.heightInPixels ?? this.scale.height

    this.physics.world.setBounds(0, 0, width, height)
    this.cameras.main.setBounds(0, 0, width, height)

    // Cover zoom: scale up until the map fills the viewport so no void shows.
    const coverZoom = Math.max(1, this.scale.width / width, this.scale.height / height)
    this.cameras.main.setZoom(coverZoom)

    if (this.player) {
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    }
  }

  private resizeRoom() {
    this.setupCamera()
  }

  private createVisibleLayer(
    layerNames: string[],
    tilesets: Phaser.Tilemaps.Tileset[],
    depth: number,
    options: { optional?: boolean } = {},
  ) {
    if (!this.map) {
      throw new Error('Common Room map has not been created')
    }

    const layerIndex = this.map.layers.findIndex((layer) => layerNames.includes(layer.name))

    if (layerIndex === -1) {
      if (options.optional) return null

      const availableLayers = this.map.layers.map((layer) => layer.name).join(', ')
      throw new Error(
        `Common Room layer not found: ${layerNames.join(' or ')}. Available layers: ${availableLayers}`,
      )
    }

    const layer = this.map.createLayer(layerIndex, tilesets, 0, 0)

    if (!layer) {
      if (options.optional) return null

      throw new Error(`Common Room layer not found: ${layerNames.join(' or ')}`)
    }

    layer.setDepth(depth)
    return layer
  }

  private get playerSpawnPoint() {
    const fallback = {
      x: this.map?.widthInPixels ? this.map.widthInPixels / 2 : this.scale.width / 2,
      y: this.map?.heightInPixels ? this.map.heightInPixels / 2 : this.scale.height / 2,
    }
    const spawnObject = this.map
      ?.getObjectLayer('Spawn Points')
      ?.objects.find((object) => object.name === 'spawn-center')

    if (!spawnObject?.x || !spawnObject.y) {
      return fallback
    }

    return {
      x: spawnObject.x,
      y: spawnObject.y,
    }
  }

  private addDebugLabel() {
    if (!import.meta.env.DEV) return

    this.add
      .text(12, 12, 'Arcade: World', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(10_000)
  }
}
