import type Phaser from 'phaser'
import type { AvatarState } from '../avatar/sheet'
import type { HeldItem } from '../net/protocol'
import type { Facing } from '../world/interactables'
import { loopAnimation, Sheets } from './sheets'

// The mug fills about 26x28 px at the bottom of its 48x96 frame; half size suits a hand.
const SCALE = 0.5
// The bottom middle of the mug in its frame, as a fraction of the frame.
const ORIGIN = { x: 25 / 48, y: 78 / 96 }
const STEAM_FPS = 6

/**
 * Where the hand is, relative to the Avatar's feet, for each way it can face. Facing up,
 * the cup is behind the body.
 */
const HAND: Record<Facing, { x: number; y: number; behind: boolean }> = {
  down: { x: 16, y: -11, behind: false },
  right: { x: 11, y: -11, behind: false },
  left: { x: -11, y: -11, behind: false },
  up: { x: -16, y: -12, behind: true },
}
// Sitting sideways, the hands rest a little higher and further forward.
const SITTING_HAND: Partial<Record<Facing, { x: number; y: number; behind: boolean }>> = {
  right: { x: 13, y: -17, behind: false },
  left: { x: -13, y: -17, behind: false },
}

/** Something an Avatar holds in its hand, drawn beside it and moved with it. */
export class HeldItemSprite {
  readonly item: HeldItem
  private readonly sprite: Phaser.GameObjects.Sprite

  constructor(scene: Phaser.Scene, item: HeldItem) {
    this.item = item
    const sheet = Sheets.coffee
    this.sprite = scene.add.sprite(0, 0, sheet.key, 0).setOrigin(ORIGIN.x, ORIGIN.y).setScale(SCALE)
    this.sprite.play(loopAnimation(scene, sheet, STEAM_FPS))
  }

  /** Puts the item in the hand of an Avatar whose feet are at `x`, `y`. */
  place(x: number, y: number, state: AvatarState, facing: Facing) {
    const hand = (state === 'sit' && SITTING_HAND[facing]) || HAND[facing]
    this.sprite.setPosition(Math.round(x + hand.x), Math.round(y + hand.y))
    this.sprite.setDepth(y + (hand.behind ? -0.5 : 0.5))
  }

  destroy() {
    this.sprite.destroy()
  }
}
