import type Phaser from 'phaser'
import { packAssetUrl } from '../config/assets'
import { PackFiles } from '../config/packFiles'

/**
 * Sheets for things the game draws by itself, not the map: a held coffee cup, the cat and
 * the shared plant's sprout. Every Room loads them, since anyone who walks in may be
 * holding a cup.
 */

interface Sheet {
  key: string
  file: string
  frameWidth: number
  frameHeight: number
  frames: number
}

export const Sheets = {
  // A mug on a saucer with rising steam: 6 frames of 48x96, the mug at the bottom.
  coffee: {
    key: 'item:coffee',
    file: PackFiles.props.coffee,
    frameWidth: 48,
    frameHeight: 96,
    frames: 6,
  },
  // A cat sitting and flicking its tail: 12 frames of 144x48, facing right.
  cat: {
    key: 'npc:cat',
    file: PackFiles.sprites.cat,
    frameWidth: 144,
    frameHeight: 48,
    frames: 12,
  },
  // A seedling in a clay pot, swaying: 4 frames of 48x96, the pot at the bottom.
  sprout: {
    key: 'plant:sprout',
    file: PackFiles.sprites.sprout,
    frameWidth: 48,
    frameHeight: 96,
    frames: 4,
  },
} as const satisfies Record<string, Sheet>

export function preloadSheets(scene: Phaser.Scene) {
  for (const sheet of Object.values(Sheets)) {
    if (scene.textures.exists(sheet.key)) continue
    scene.load.spritesheet(sheet.key, packAssetUrl(sheet.file), {
      frameWidth: sheet.frameWidth,
      frameHeight: sheet.frameHeight,
    })
  }
}

/** The key of a looping animation over a whole sheet, created on first use. */
export function loopAnimation(scene: Phaser.Scene, sheet: Sheet, fps: number): string {
  const key = `${sheet.key}:loop:${fps}`
  if (!scene.anims.exists(key)) {
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(sheet.key, { start: 0, end: sheet.frames - 1 }),
      frameRate: fps,
      repeat: -1,
    })
  }
  return key
}
