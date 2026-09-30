import Phaser from 'phaser'
import type { Facing } from '../world/interactables'

export interface MovementInput {
  /** Unit vector, or zero when no direction key is down. Diagonals are normalised. */
  direction: Phaser.Math.Vector2
  /** The way to face: the direction of travel, or the last one while standing still. */
  facing: Facing
  isMoving: boolean
  /** Shift is held. */
  isRunning: boolean
}

/** WASD or the arrow keys to walk, Shift to run. */
export class KeyboardMovementController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys
  private readonly keys: Record<'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>
  private facing: Facing = 'down'

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.cursors = keyboard.createCursorKeys()
    const { W, A, S, D } = Phaser.Input.Keyboard.KeyCodes
    this.keys = { w: keyboard.addKey(W), a: keyboard.addKey(A), s: keyboard.addKey(S), d: keyboard.addKey(D) }
  }

  read(): MovementInput {
    const direction = new Phaser.Math.Vector2(0, 0)
    if (this.cursors.left.isDown || this.keys.a.isDown) direction.x -= 1
    if (this.cursors.right.isDown || this.keys.d.isDown) direction.x += 1
    if (this.cursors.up.isDown || this.keys.w.isDown) direction.y -= 1
    if (this.cursors.down.isDown || this.keys.s.isDown) direction.y += 1

    const isMoving = direction.lengthSq() > 0
    if (isMoving) {
      direction.normalize()
      // On a diagonal, keep the current facing if it is one of the two keys held, so
      // the Avatar does not flip while walking diagonally.
      const horizontal: Facing = direction.x > 0 ? 'right' : 'left'
      const vertical: Facing = direction.y > 0 ? 'down' : 'up'
      if (direction.x === 0) this.facing = vertical
      else if (direction.y === 0) this.facing = horizontal
      else if (this.facing !== horizontal && this.facing !== vertical) this.facing = horizontal
    }
    return { direction, facing: this.facing, isMoving, isRunning: this.cursors.shift.isDown }
  }
}
