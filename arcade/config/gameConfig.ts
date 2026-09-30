import Phaser from 'phaser'

export const GAME_VIEWPORT = {
  width: 960,
  height: 720,
} as const

export function createGameConfig(parent: HTMLElement, scenes: Phaser.Scene[]): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || GAME_VIEWPORT.width,
    height: parent.clientHeight || GAME_VIEWPORT.height,
    backgroundColor: '#111111',
    pixelArt: true,
    roundPixels: true,
    scene: scenes,
    // Sheets come from the CDN in production; WebGL only uploads cross-origin
    // images that were fetched with CORS.
    loader: {
      crossOrigin: 'anonymous',
    },
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
