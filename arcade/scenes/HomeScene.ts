import Phaser from 'phaser'
import type { DecorateCommand } from '../bridge'
import { packAssetUrl, tilesetTextureKey } from '../config/assets'
import { PackFiles, type TilesetName } from '../config/packFiles'
import { composeHome, HOME_SPAWNS, type Home } from '../maps/home'
import { homeCategories } from '../maps/homeCatalog'
import { prefabs, prefabSize, type Prefab } from '../maps/prefabs'
import { TILE_SIZE } from '../maps/tiled'
import { queuePropSheet } from '../world/props'
import { HomeDecorator } from './HomeDecorator'
import { RoomScene, type ArcadeServices, type RoomSceneData } from './RoomScene'

export const HOME_SCENE_KEY = 'scene:home'

/** A Home as the server sends it, with a starter Home filled in when none is saved. */
export interface HomeRecord {
  user: string
  fullName: string
  home: Home
}

/** Where Homes come from. The HUD implements it with the Frappe API. */
export interface HomeSource {
  load(user: string): Promise<HomeRecord>
}

export interface HomeSceneData {
  record: HomeRecord
  spawn?: string
}

/**
 * Someone's Home. Its map is composed in the browser from the saved layout, and rebuilt
 * whenever the layout changes: while its owner decorates, and for visitors when the
 * owner saves.
 */
export class HomeScene extends RoomScene {
  private record: HomeRecord | null = null
  private decorator: HomeDecorator | null = null
  private reloads = 0

  constructor(services: ArcadeServices) {
    super(HOME_SCENE_KEY, services)
  }

  protected defaultRoom(): RoomSceneData {
    throw new Error('A Home scene starts with the Home to show')
  }

  init(data: Partial<HomeSceneData>) {
    if (!data.record) throw new Error('A Home scene starts with the Home to show')
    this.record = data.record
    this.framing = 'follow'
    this.inset = { right: 0, bottom: 0 }
    super.init({
      room: `home:${data.record.user}`,
      map: { data: composeHome(data.record.home) },
      spawn: data.spawn ?? HOME_SPAWNS.door,
    })
  }

  preload() {
    super.preload()
    // Decorating can bring in any sheet the catalog uses, not only the ones placed now.
    for (const [name, file] of Object.entries(PackFiles.tilesets)) {
      const key = tilesetTextureKey(name as TilesetName)
      if (!this.textures.exists(key)) this.load.image(key, packAssetUrl(file))
    }
    for (const id of homeCategories.flatMap((category) => category.items)) {
      const prefab: Prefab = prefabs[id]
      if (!prefab.sprite) continue
      const { width, height } = prefabSize(prefab)
      queuePropSheet(this, {
        image: PackFiles.props[prefab.sprite.sheet],
        frameWidth: width * TILE_SIZE,
        frameHeight: height * TILE_SIZE,
      })
    }
  }

  create() {
    super.create()
    const { bridge, net } = this.services
    const record = this.record
    if (!record) return
    bridge.state.home = { owner: record.user, ownerName: record.fullName }

    const offDecorate = bridge.commands.on('decorate', (command) => this.onDecorate(command))
    const offHome = net.events.on('home', ({ user }) => {
      if (user === this.record?.user && !this.decorator) void this.reload(user)
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offDecorate()
      offHome()
      this.decorator?.destroy()
      this.decorator = null
      bridge.state.decorate = null
      this.reloads++
      bridge.state.home = null
    })
  }

  private get isOwner(): boolean {
    return this.record?.user === this.services.bridge.state.occupants.find((entry) => entry.isSelf)?.user
  }

  private onDecorate(command: DecorateCommand) {
    const { bridge, net } = this.services
    const record = this.record
    if (!record) return
    if (command.action === 'start') {
      if (this.decorator || !this.isOwner) return
      this.framing = 'whole'
      this.setupCamera()
      this.decorator = new HomeDecorator(this, record.home, {
        onChange: (draft) => this.replaceMap(composeHome(draft)),
        publish: (state) => (bridge.state.decorate = state),
      })
      return
    }
    const decorator = this.decorator
    if (!decorator) return
    switch (command.action) {
      case 'hold':
        decorator.hold(command.prefab)
        break
      case 'drop':
        decorator.drop()
        break
      case 'remove':
        decorator.remove()
        break
      case 'surface':
        decorator.setSurface('wallpaper' in command ? { wallpaper: command.wallpaper } : { floor: command.floor })
        break
      case 'inset':
        this.inset = { right: command.right, bottom: command.bottom }
        this.setupCamera()
        break
      case 'end':
        this.endDecorating()
        if (command.saved) {
          this.record = { ...record, home: command.saved }
          net.homeSaved()
        }
        this.replaceMap(composeHome(this.record?.home ?? record.home))
        break
    }
  }

  private endDecorating() {
    this.decorator?.destroy()
    this.decorator = null
    this.services.bridge.state.decorate = null
    this.framing = 'follow'
    this.inset = { right: 0, bottom: 0 }
    this.setupCamera()
  }

  /** The owner saved while we were here: show the Home as it is now. */
  private async reload(user: string) {
    const request = ++this.reloads
    let record: HomeRecord
    try {
      record = await this.services.homes.load(user)
    } catch {
      return
    }
    if (request !== this.reloads || this.decorator) return
    this.record = record
    this.services.bridge.state.home = { owner: record.user, ownerName: record.fullName }
    this.replaceMap(composeHome(record.home))
  }
}
