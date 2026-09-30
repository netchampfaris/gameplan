import Phaser from 'phaser'
import type { AvatarAppearance } from '../avatar/catalog'
import type { KeyboardMovementController } from '../input/KeyboardMovementController'
import type { Pose } from '../net/protocol'
import type { Facing, Interactable } from '../world/interactables'
import { Avatar } from './Avatar'

const WALK_SPEED = 150
const RUN_SPEED = 240
/** How quickly the velocity closes on the target speed, per second. High enough to feel
 * immediate, low enough that starting and turning are not a single-frame snap. */
const RESPONSIVENESS = 18
// The body is the feet only, so the Avatar can walk in front of furniture it overlaps.
const BODY = { width: 28, height: 18, offsetX: 10, offsetY: 78 }

/**
 * The player's own Avatar: moved by the keyboard, blocked by the map's Collision layer,
 * and able to sit down on a seat and get up again.
 */
export class LocalPlayer {
  readonly avatar: Avatar
  private readonly body: Phaser.Physics.Arcade.Sprite
  private readonly movement: KeyboardMovementController
  /** Where the player stood before sitting, to step back to on getting up. */
  private standingSpot: { x: number; y: number } | null = null

  constructor(
    scene: Phaser.Scene,
    options: { x: number; y: number; fullName: string; appearance: AvatarAppearance; movement: KeyboardMovementController },
  ) {
    this.body = scene.physics.add.sprite(options.x, options.y, '__DEFAULT')
    this.avatar = new Avatar(scene, this.body, options.fullName, options.appearance)
    this.body.setSize(BODY.width, BODY.height).setOffset(BODY.offsetX, BODY.offsetY)
    this.body.setCollideWorldBounds(true)
    this.movement = options.movement
  }

  get sprite(): Phaser.Physics.Arcade.Sprite {
    return this.body
  }

  get isSitting(): boolean {
    return this.standingSpot !== null
  }

  get pose(): Pose {
    return { x: this.body.x, y: this.body.y, ...this.avatar.pose }
  }

  /** Reads the keyboard and moves. A movement key while seated stands up first. */
  update(deltaMs: number) {
    const input = this.movement.read()
    if (this.isSitting) {
      if (input.isMoving) this.standUp()
      else {
        this.avatar.update()
        return
      }
    }
    const speed = input.isRunning ? RUN_SPEED : WALK_SPEED
    const blend = 1 - Math.exp((-RESPONSIVENESS * deltaMs) / 1000)
    const velocity = this.body.body?.velocity ?? new Phaser.Math.Vector2()
    const vx = Phaser.Math.Linear(velocity.x, input.direction.x * speed, blend)
    const vy = Phaser.Math.Linear(velocity.y, input.direction.y * speed, blend)
    // Settle to a true stop rather than creeping for many frames.
    this.body.setVelocity(Math.abs(vx) < 1 ? 0 : vx, Math.abs(vy) < 1 ? 0 : vy)
    this.avatar.setPose(input.isMoving ? 'walk' : 'idle', input.facing)
    this.avatar.update()
  }

  /**
   * Sits on a seat: the feet go to the bottom middle of its footprint, facing the way the
   * seat faces, or the way the player already faces when the seat does not say.
   */
  sit(seat: Interactable) {
    if (this.isSitting) return
    this.standingSpot = { x: this.body.x, y: this.body.y }
    this.body.setVelocity(0, 0)
    this.setBodyEnabled(false)
    this.body.setPosition(seat.x + seat.width / 2, seat.y + seat.height)
    this.avatar.setPose('sit', seat.facing ?? sideFacing(this.avatar.pose.facing))
    this.avatar.update()
  }

  standUp() {
    if (!this.standingSpot) return
    this.body.setPosition(this.standingSpot.x, this.standingSpot.y)
    this.standingSpot = null
    this.setBodyEnabled(true)
    this.avatar.setPose('idle', this.avatar.pose.facing)
  }

  /** Stops walking, e.g. while the keyboard belongs to the HUD. */
  halt() {
    this.body.setVelocity(0, 0)
    if (!this.isSitting) this.avatar.setPose('idle', this.avatar.pose.facing)
  }

  destroy() {
    this.avatar.destroy()
  }

  private setBodyEnabled(enabled: boolean) {
    const body = this.body.body
    if (body) body.enable = enabled
    // A disabled body no longer syncs the sprite; reset it so it starts from the new spot.
    if (enabled && body instanceof Phaser.Physics.Arcade.Body) body.reset(this.body.x, this.body.y)
  }
}

/** The pack draws sitting only from the side. */
function sideFacing(facing: Facing): Facing {
  return facing === 'left' ? 'left' : 'right'
}
