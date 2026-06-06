import Phaser from 'phaser'
import { createGameConfig } from './config/gameConfig'

export class ArcadeGame {
  private game: Phaser.Game | null = null

  mount(parent: HTMLElement) {
    this.destroy()
    this.game = new Phaser.Game(createGameConfig(parent))
  }

  destroy() {
    this.game?.destroy(true)
    this.game = null
  }
}
