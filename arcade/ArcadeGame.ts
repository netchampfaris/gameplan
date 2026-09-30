import Phaser from 'phaser'
import type { Destination } from './bridge'
import { createGameConfig } from './config/gameConfig'
import { CommonRoomScene, COMMON_ROOM_SCENE_KEY } from './scenes/CommonRoomScene'
import { HOME_SCENE_KEY, HomeScene, type HomeSceneData } from './scenes/HomeScene'
import type { ArcadeServices, RoomSceneData } from './scenes/RoomScene'

export class ArcadeGame {
  private game: Phaser.Game | null = null
  private services: ArcadeServices | null = null
  private offTravel: (() => void) | null = null
  /** Counts travel requests, so a slow Home load cannot override a later choice. */
  private travels = 0

  /**
   * Starts the game at `destination`. Rooms reach the HUD and the server through
   * `services`; the HUD moves the player between Rooms with `bridge.travel`.
   */
  mount(parent: HTMLElement, services: ArcadeServices, destination: Destination = { kind: 'common' }) {
    this.destroy()
    this.services = services
    const game = new Phaser.Game(createGameConfig(parent, []))
    this.game = game
    // Scenes are added once the game boots, so none starts by itself before travel picks one.
    game.events.once(Phaser.Core.Events.READY, () => {
      game.scene.add(COMMON_ROOM_SCENE_KEY, new CommonRoomScene(services), false)
      game.scene.add(HOME_SCENE_KEY, new HomeScene(services), false)
      this.offTravel = services.bridge.commands.on('travel', (next) => void this.travel(next))
      void this.travel(destination)
    })
  }

  destroy() {
    this.offTravel?.()
    this.offTravel = null
    this.travels++
    this.game?.destroy(true)
    this.game = null
    this.services = null
  }

  private async travel(destination: Destination) {
    const services = this.services
    if (!services) return
    const request = ++this.travels
    if (destination.kind === 'common') {
      services.bridge.state.travelling = false
      this.start(COMMON_ROOM_SCENE_KEY, { spawn: destination.spawn } satisfies Partial<RoomSceneData>)
      return
    }

    const { bridge } = services
    bridge.state.travelling = true
    try {
      const record = await services.homes.load(destination.user)
      if (request !== this.travels) return
      this.start(HOME_SCENE_KEY, { record } satisfies HomeSceneData)
    } catch (error) {
      if (request !== this.travels) return
      bridge.state.notice = error instanceof Error ? error.message : 'Could not open that Home'
      // Somewhere to be: a deep link to a Home that cannot open lands in the Common Room.
      if (!this.activeScene()) this.start(COMMON_ROOM_SCENE_KEY, {})
    } finally {
      if (request === this.travels) bridge.state.travelling = false
    }
  }

  /** Always pass data: Phaser keeps a scene's previous data when it is started without any. */
  private start(key: string, data: object) {
    const game = this.game
    if (!game) return
    for (const scene of game.scene.getScenes(true)) {
      if (scene.scene.key !== key) scene.scene.stop()
    }
    // Starting a running scene restarts it with the new data, e.g. one Home to another.
    game.scene.start(key, data)
  }

  private activeScene(): Phaser.Scene | null {
    return this.game?.scene.getScenes(true)[0] ?? null
  }
}
