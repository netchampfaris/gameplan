import Phaser from 'phaser'
import type { MovementDirection } from '../input/KeyboardMovementController'

const PLAYER_SPEED = 150
const AVATAR_ID = '01'
const ANIMATION_FRAME_COUNT = 6
const DIRECTIONS: MovementDirection[] = ['down', 'left', 'right', 'up']
const SIT_DIRECTIONS = ['left', 'right'] as const
const ANIMATION_FRAME_RATES = {
  idle: 4,
  walk: 8,
  sit: 4,
} as const
type PlayerAnimationState = keyof typeof ANIMATION_FRAME_RATES
type SitDirection = (typeof SIT_DIRECTIONS)[number]

function mappedFrameName(state: PlayerAnimationState, direction: MovementDirection | SitDirection, index?: number) {
  if (state === 'sit') {
    const framePrefix = `avatar_${AVATAR_ID}_sit_${direction}_idle`
    return index === undefined ? `${framePrefix}_00` : `${framePrefix}_${index.toString().padStart(2, '0')}`
  }

  const framePrefix = `avatar_${AVATAR_ID}_${state}_${direction}`
  return index === undefined ? framePrefix : `${framePrefix}_${index.toString().padStart(2, '0')}`
}

function animationKey(state: PlayerAnimationState, direction: MovementDirection | SitDirection) {
  return `avatar_${AVATAR_ID}:${state}:${direction}`
}

function isSitDirection(direction: MovementDirection): direction is SitDirection {
  return direction === 'left' || direction === 'right'
}

export class PlayerAvatar extends Phaser.Physics.Arcade.Sprite {
  private lastSitDirection: SitDirection = 'right'

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number) {
    super(scene, x, y, textureKey)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setOrigin(0.5, 1)
    this.setScale(1)
    this.setSize(28, 18)
    this.setOffset(10, 78)
    this.setDepth(y)
    this.createAnimations(textureKey)
    this.playAnimation('idle', 'down')
  }

  move(velocity: Phaser.Math.Vector2, direction: MovementDirection, isSitting: boolean) {
    this.setVelocity(velocity.x * PLAYER_SPEED, velocity.y * PLAYER_SPEED)
    this.setDepth(this.y)

    if (isSitDirection(direction)) {
      this.lastSitDirection = direction
    }

    if (velocity.lengthSq() === 0 && isSitting) {
      this.playAnimation('sit', this.lastSitDirection)
      return
    }

    this.playAnimation(velocity.lengthSq() === 0 ? 'idle' : 'walk', direction)
  }

  private createAnimations(textureKey: string) {
    for (const state of ['idle', 'walk'] as const) {
      for (const direction of DIRECTIONS) {
        this.createAnimation(textureKey, state, direction)
      }
    }

    for (const direction of SIT_DIRECTIONS) {
      this.createAnimation(textureKey, 'sit', direction)
    }
  }

  private createAnimation(
    textureKey: string,
    state: PlayerAnimationState,
    direction: MovementDirection | SitDirection,
  ) {
    const key = animationKey(state, direction)

    if (this.scene.anims.exists(key)) return

    const frames = Array.from({ length: ANIMATION_FRAME_COUNT }, (_, index) => ({
      key: textureKey,
      frame: mappedFrameName(state, direction, index),
    }))

    this.scene.anims.create({
      key,
      frames,
      frameRate: ANIMATION_FRAME_RATES[state],
      repeat: -1,
    })
  }

  private playAnimation(state: PlayerAnimationState, direction: MovementDirection | SitDirection) {
    const key = animationKey(state, direction)

    if (this.anims.currentAnim?.key === key) return

    if (this.scene.anims.exists(key)) {
      this.play(key)
      return
    }

    this.stop()
    this.setFrame(mappedFrameName('idle', direction))
  }
}
