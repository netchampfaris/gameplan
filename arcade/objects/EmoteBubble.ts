import Phaser from 'phaser'
import { EMOTE_CELL, EMOTE_INTRO, EMOTE_TRAIL } from '../avatar/emotes'
import { EMOTE_INTRO_ANIMATION, EMOTE_TRAIL_ANIMATION, emoteIconAnimation } from '../avatar/textures'
import { GameAssetKeys } from '../config/assets'
import { Depth } from '../config/depths'
import type { EmoteId } from '../net/protocol'

const VISIBLE_MS = 3000
const FADE_MS = 300

/**
 * A thought bubble over an Avatar's head: a trail of dots rises, the bubble grows, then
 * the emote's icon flips between its two frames until it fades.
 */
export class EmoteBubble {
  readonly container: Phaser.GameObjects.Container
  /** From the bottom of the trail to the top of the bubble. */
  readonly height = EMOTE_CELL * 2
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene, emote: EmoteId, onGone: () => void) {
    this.scene = scene
    // The sheet draws the trail rising from the lower left, so the pair sits a little
    // to the right of the head, as the sample animation does.
    const trail = scene.add.sprite(0, 0, GameAssetKeys.emotes, EMOTE_TRAIL[0]).setOrigin(0, 1)
    const bubble = scene.add.sprite(0, -EMOTE_CELL, GameAssetKeys.emotes, EMOTE_INTRO[0]).setOrigin(0, 1)
    trail.play(EMOTE_TRAIL_ANIMATION)
    bubble.play(EMOTE_INTRO_ANIMATION).chain(emoteIconAnimation(emote))

    this.container = scene.add.container(0, 0, [trail, bubble]).setDepth(Depth.OVERLAY)
    scene.tweens.add({
      targets: this.container,
      alpha: 0,
      delay: VISIBLE_MS,
      duration: FADE_MS,
      onComplete: () => {
        this.destroy()
        onGone()
      },
    })
  }

  /** Places the trail's lower-left corner. */
  setPosition(left: number, bottom: number) {
    this.container.setPosition(Math.round(left), Math.round(bottom))
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.container)
    this.container.destroy()
  }
}
