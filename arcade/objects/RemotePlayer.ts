import type Phaser from 'phaser'
import type { AvatarAppearance } from '../avatar/catalog'
import type { Occupant, Pose } from '../net/protocol'
import { Avatar } from './Avatar'

/**
 * Positions arrive about 10 times a second. Drawing them this far in the past means
 * there is almost always a sample on each side of the drawn moment to blend between.
 */
const INTERPOLATION_DELAY_MS = 120
/** A jump longer than this is a teleport (a seat, a reconnect), not a walk. */
const TELEPORT_DISTANCE = 300
const MAX_SAMPLES = 20

interface Sample extends Pose {
  at: number
}

/** Someone else in the Room, drawn smoothly from the positions the server relays. */
export class RemotePlayer {
  readonly avatar: Avatar
  /** Who they are and how they look. The pose here is the one they joined with. */
  occupant: Occupant
  private samples: Sample[] = []

  constructor(scene: Phaser.Scene, occupant: Occupant) {
    this.occupant = occupant
    this.avatar = new Avatar(scene, scene.add.sprite(occupant.x, occupant.y, '__DEFAULT'), occupant.fullName, occupant.appearance)
    this.avatar.setPose(occupant.state, occupant.facing)
    this.avatar.hold(occupant.holding)
    this.samples = [{ ...pickPose(occupant), at: performance.now() }]
  }

  setAppearance(appearance: AvatarAppearance) {
    this.occupant = { ...this.occupant, appearance }
    this.avatar.setAppearance(appearance)
  }

  receive(pose: Pose) {
    const now = performance.now()
    const last = this.samples[this.samples.length - 1]
    if (last && Math.hypot(pose.x - last.x, pose.y - last.y) > TELEPORT_DISTANCE) this.samples = []
    this.samples.push({ ...pickPose(pose), at: now })
    if (this.samples.length > MAX_SAMPLES) this.samples.shift()
  }

  update() {
    const renderAt = performance.now() - INTERPOLATION_DELAY_MS
    // Drop samples that are fully in the past, keeping the one just before `renderAt`.
    while (this.samples.length > 2 && this.samples[1].at <= renderAt) this.samples.shift()

    const [from, to] = this.samples
    const t = to && renderAt > from.at ? Math.min(1, (renderAt - from.at) / (to.at - from.at)) : 0
    const end = to ?? from
    const target = t > 0 ? end : from
    this.avatar.sprite.setPosition(from.x + (end.x - from.x) * t, from.y + (end.y - from.y) * t)
    // Still gliding toward where they stopped: keep the legs moving until they arrive.
    const gliding = to !== undefined && t > 0 && t < 1 && (to.x !== from.x || to.y !== from.y)
    this.avatar.setPose(gliding && target.state !== 'sit' ? 'walk' : target.state, target.facing)
    this.avatar.update()
  }

  destroy() {
    this.avatar.destroy()
  }
}

function pickPose({ x, y, facing, state }: Pose): Pose {
  return { x, y, facing, state }
}
