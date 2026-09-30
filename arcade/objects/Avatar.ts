import Phaser from 'phaser'
import type { AvatarAppearance } from '../avatar/catalog'
import { FRAME_HEIGHT, FRAME_WIDTH, resolvePose, type AvatarState } from '../avatar/sheet'
import { avatarAnimationKey, ensureAvatarTexture } from '../avatar/textures'
import { Depth } from '../config/depths'
import type { EmoteId, HeldItem } from '../net/protocol'
import type { Facing } from '../world/interactables'
import { crispText } from './crispText'
import { EmoteBubble } from './EmoteBubble'
import { HeldItemSprite } from './HeldItem'
import { SpeechBubble } from './SpeechBubble'

// A Character Generator frame is 48x96 with the feet on the bottom edge; the top of the
// hair is about 69 px above them.
const HEAD_HEIGHT = 70
const NAME_TAG_GAP = 2
const OVERLAY_GAP = 2
/** Where the emote trail starts, relative to the feet. */
const EMOTE_OFFSET_X = -6

const PLACEHOLDER_TEXTURE = 'avatar:placeholder'

/**
 * How one person looks in a Room: the animated body, the name tag under the feet, what
 * they hold, and whatever they last said or emoted over the head.
 *
 * The sprite is passed in, so the local player can use a physics sprite and everyone else
 * a plain one. Until the appearance is composed, the sprite shows a transparent frame of
 * the same size, so the physics body does not move when the real sheet arrives.
 */
export class Avatar {
  readonly sprite: Phaser.GameObjects.Sprite
  private readonly scene: Phaser.Scene
  private readonly nameTag: Phaser.GameObjects.Text
  private bubble: SpeechBubble | null = null
  private emoteBubble: EmoteBubble | null = null
  private held: HeldItemSprite | null = null
  private textureKey: string | null = null
  private appearanceRequest = 0
  private state: AvatarState = 'idle'
  private facing: Facing = 'down'

  constructor(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, fullName: string, appearance: AvatarAppearance) {
    this.scene = scene
    this.sprite = sprite
    ensurePlaceholder(scene)
    sprite.setTexture(PLACEHOLDER_TEXTURE).setOrigin(0.5, 1)
    this.nameTag = crispText(scene, fullName, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: 'rgba(23, 23, 23, 0.6)',
      padding: { x: 4, y: 1 },
    })
      .setOrigin(0.5, 0)
      .setDepth(Depth.OVERLAY)
      .setVisible(Boolean(fullName))
    this.setAppearance(appearance)
    this.update()
  }

  get pose(): { state: AvatarState; facing: Facing } {
    return { state: this.state, facing: this.facing }
  }

  get holding(): HeldItem | null {
    return this.held?.item ?? null
  }

  /** Puts an item in the Avatar's hand, or empties it with `null`. */
  hold(item: HeldItem | null) {
    if (this.holding === item) return
    this.held?.destroy()
    this.held = item ? new HeldItemSprite(this.scene, item) : null
    this.update()
  }

  setName(fullName: string) {
    this.nameTag.setText(fullName).setVisible(Boolean(fullName))
  }

  setAppearance(appearance: AvatarAppearance) {
    const request = ++this.appearanceRequest
    ensureAvatarTexture(this.scene.game, appearance)
      .then((key) => {
        // A newer look was asked for meanwhile, or the Avatar is gone.
        if (request !== this.appearanceRequest || !this.sprite.active) return
        this.textureKey = key
        this.sprite.setTexture(key)
        this.playPose()
      })
      .catch((error: unknown) => console.error(error))
  }

  setPose(state: AvatarState, facing: Facing) {
    if (state === this.state && facing === this.facing) return
    this.state = state
    this.facing = facing
    this.playPose()
  }

  say(text: string) {
    this.bubble?.destroy()
    const bubble = new SpeechBubble(this.scene, text, () => {
      if (this.bubble === bubble) this.bubble = null
    })
    this.bubble = bubble
    this.update()
  }

  emote(emote: EmoteId) {
    this.emoteBubble?.destroy()
    const bubble = new EmoteBubble(this.scene, emote, () => {
      if (this.emoteBubble === bubble) this.emoteBubble = null
    })
    this.emoteBubble = bubble
    this.update()
  }

  /** Keeps the draw order and the overlays in step with the sprite. Call every frame. */
  update() {
    const { x, y } = this.sprite
    this.sprite.setDepth(y)
    this.held?.place(x, y, this.state, this.facing)
    this.nameTag.setPosition(Math.round(x), Math.round(y + NAME_TAG_GAP))
    let top = y - HEAD_HEIGHT
    if (this.bubble) {
      this.bubble.setPosition(x, top - OVERLAY_GAP)
      top -= this.bubble.height + OVERLAY_GAP
    }
    this.emoteBubble?.setPosition(x + EMOTE_OFFSET_X, top)
  }

  destroy() {
    this.appearanceRequest++
    this.bubble?.destroy()
    this.emoteBubble?.destroy()
    this.held?.destroy()
    this.nameTag.destroy()
    this.sprite.destroy()
  }

  private playPose() {
    if (!this.textureKey) return
    const pose = resolvePose(this.state, this.facing)
    this.sprite.play(avatarAnimationKey(this.textureKey, pose.state, pose.facing), true)
  }
}

function ensurePlaceholder(scene: Phaser.Scene) {
  if (!scene.textures.exists(PLACEHOLDER_TEXTURE)) {
    scene.textures.createCanvas(PLACEHOLDER_TEXTURE, FRAME_WIDTH, FRAME_HEIGHT)
  }
}
