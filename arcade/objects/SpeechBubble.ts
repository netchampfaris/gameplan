import Phaser from 'phaser'
import { Depth } from '../config/depths'
import { crispText } from './crispText'

const MAX_TEXT_WIDTH = 160
const PADDING_X = 7
const PADDING_Y = 5
const TAIL = 5
const RADIUS = 6
const VISIBLE_MS = 6000
const FADE_MS = 400

/**
 * What an Avatar just said, over its head. It wraps long messages, fades out after six
 * seconds, and the Avatar replaces it when it says something new.
 */
export class SpeechBubble {
  readonly container: Phaser.GameObjects.Container
  /** From the tip of the tail to the top edge. */
  readonly height: number
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene, text: string, onGone: () => void) {
    this.scene = scene
    const label = crispText(scene, text, {
      fontSize: '11px',
      color: '#171717',
      align: 'center',
      lineSpacing: 1,
      wordWrap: { width: MAX_TEXT_WIDTH, useAdvancedWrap: true },
    }).setOrigin(0.5, 1)

    const width = Math.ceil(label.width) + PADDING_X * 2
    const height = Math.ceil(label.height) + PADDING_Y * 2
    label.setPosition(0, -TAIL - PADDING_Y)
    this.height = height + TAIL

    const background = scene.add.graphics()
    background.fillStyle(0xffffff, 0.96)
    background.lineStyle(1, 0x404040, 1)
    background.fillRoundedRect(-width / 2, -TAIL - height, width, height, RADIUS)
    background.strokeRoundedRect(-width / 2, -TAIL - height, width, height, RADIUS)
    background.fillTriangle(-TAIL, -TAIL - 0.5, TAIL, -TAIL - 0.5, 0, 0)
    background.lineBetween(-TAIL, -TAIL, 0, 0)
    background.lineBetween(TAIL, -TAIL, 0, 0)

    this.container = scene.add.container(0, 0, [background, label]).setDepth(Depth.OVERLAY).setScale(0.85)
    scene.tweens.add({ targets: this.container, scale: 1, duration: 120, ease: 'Back.Out' })
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

  setPosition(x: number, bottom: number) {
    this.container.setPosition(Math.round(x), Math.round(bottom))
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.container)
    this.container.destroy()
  }
}
