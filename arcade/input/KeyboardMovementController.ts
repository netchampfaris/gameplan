import Phaser from 'phaser'

export type MovementDirection = 'down' | 'left' | 'right' | 'up'

export interface MovementInputState {
  velocity: Phaser.Math.Vector2
  direction: MovementDirection
  isMoving: boolean
  isSitting: boolean
}

export class KeyboardMovementController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys
  private keys: Record<'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>
  private sitKey: Phaser.Input.Keyboard.Key
  private lastDirection: MovementDirection = 'down'

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.cursors = keyboard.createCursorKeys()
    this.keys = {
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    this.sitKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
  }

  read(): MovementInputState {
    const velocity = new Phaser.Math.Vector2(0, 0)

    if (this.cursors.left.isDown || this.keys.a.isDown) velocity.x -= 1
    if (this.cursors.right.isDown || this.keys.d.isDown) velocity.x += 1
    if (this.cursors.up.isDown || this.keys.w.isDown) velocity.y -= 1
    if (this.cursors.down.isDown || this.keys.s.isDown) velocity.y += 1

    const isMoving = velocity.lengthSq() > 0

    if (isMoving) {
      velocity.normalize()
      this.lastDirection = this.resolveDirection(velocity)
    }

    return {
      velocity,
      direction: this.lastDirection,
      isMoving,
      isSitting: this.sitKey.isDown,
    }
  }

  private resolveDirection(velocity: Phaser.Math.Vector2): MovementDirection {
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      return velocity.x > 0 ? 'right' : 'left'
    }

    return velocity.y > 0 ? 'down' : 'up'
  }
}
