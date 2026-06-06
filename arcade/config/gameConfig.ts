import Phaser from 'phaser'
import { CommonRoomScene } from '../scenes/CommonRoomScene'

export const GAME_VIEWPORT = {
  width: 960,
  height: 720,
} as const

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || GAME_VIEWPORT.width,
    height: parent.clientHeight || GAME_VIEWPORT.height,
    backgroundColor: '#111111',
    pixelArt: true,
    roundPixels: true,
    scene: [CommonRoomScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
  }
}
