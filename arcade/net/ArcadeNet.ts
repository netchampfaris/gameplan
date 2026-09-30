import type { Socket } from 'socket.io-client'
import { defaultAppearance, toAppearance, type AvatarAppearance } from '../avatar/catalog.ts'
import { Emitter } from '../util/emitter.ts'
import {
  HELD_ITEMS,
  SERVER_EVENTS,
  type ClientEvents,
  type EmoteId,
  type HeldItem,
  type JoinResult,
  type Occupant,
  type Pose,
  type RoomCounts,
  type RoomId,
  type ServerEvents,
} from './protocol.ts'

/** What an `ArcadeNet` tells the game. Server events keep their names without the prefix. */
export interface NetEvents {
  /** The full Room, after joining and again after every reconnect. */
  snapshot: { self: Occupant; occupants: Occupant[] }
  joined: Occupant
  moved: ServerEvents['arcade:moved']
  said: ServerEvents['arcade:said']
  emoted: ServerEvents['arcade:emoted']
  appearance: ServerEvents['arcade:appearance']
  held: ServerEvents['arcade:held']
  used: ServerEvents['arcade:used']
  home: ServerEvents['arcade:home']
  left: ServerEvents['arcade:left']
  /** A join the server refused, or a connection that dropped. */
  error: { message: string }
}

type NetEventName = Exclude<keyof NetEvents, 'snapshot' | 'error'>

/** How often a moving Avatar reports its position: 10 times a second. */
const MOVE_INTERVAL_MS = 100
const JOIN_TIMEOUT_MS = 5000

interface Membership {
  room: RoomId
  appearance: AvatarAppearance
  pose: Pose
}

/**
 * The Arcade's side of Frappe's socket. It knows nothing about Phaser, so the scene,
 * the HUD and the bot (`scripts/bot.ts`) all use it.
 *
 * It remembers the Room it is in, the appearance and the last pose, and joins again with
 * them whenever the socket reconnects: the server forgets a socket when it drops.
 */
export class ArcadeNet {
  readonly events = new Emitter<NetEvents>()
  private membership: Membership | null = null
  private lastSent: Pose | null = null
  private lastSentAt = 0
  private pendingPose: Pose | null = null
  private pendingTimer: ReturnType<typeof setTimeout> | null = null
  private readonly unbind: (() => void)[] = []
  private readonly socket: Socket

  constructor(socket: Socket) {
    this.socket = socket
    for (const event of SERVER_EVENTS) {
      const name = event.slice('arcade:'.length) as NetEventName
      const listener = (payload: ServerEvents[typeof event]) => this.receive(name, payload)
      socket.on(event, listener)
      this.unbind.push(() => socket.off(event, listener))
    }
    // `reconnect` fires only after a dropped connection comes back, unlike the socket's
    // `connect`, which also fires for the first connection that a buffered join rides on.
    const rejoin = () => {
      if (this.membership) void this.connect(this.membership)
    }
    socket.io.on('reconnect', rejoin)
    this.unbind.push(() => socket.io.off('reconnect', rejoin))
  }

  get room(): RoomId | null {
    return this.membership?.room ?? null
  }

  async join(room: RoomId, appearance: AvatarAppearance, pose: Pose): Promise<JoinResult> {
    this.membership = { room, appearance, pose }
    return this.connect(this.membership)
  }

  /**
   * Reports the local Avatar's pose. A change of state or facing goes out at once;
   * movement goes out at most every 100 ms, and the last position always follows.
   */
  sendPose(pose: Pose): void {
    if (!this.membership) return
    this.membership.pose = pose
    const last = this.lastSent
    if (last && last.x === pose.x && last.y === pose.y && last.state === pose.state && last.facing === pose.facing) return

    const turned = !last || last.state !== pose.state || last.facing !== pose.facing
    const wait = MOVE_INTERVAL_MS - (Date.now() - this.lastSentAt)
    if (turned || wait <= 0) {
      this.flushPose(pose)
      return
    }
    this.pendingPose = pose
    this.pendingTimer ??= setTimeout(() => {
      this.pendingTimer = null
      if (this.pendingPose) this.flushPose(this.pendingPose)
    }, wait)
  }

  say(text: string): void {
    const trimmed = text.trim()
    if (trimmed) this.send('arcade:say', { text: trimmed })
  }

  emote(emote: EmoteId): void {
    this.send('arcade:emote', { emote })
  }

  setAppearance(appearance: AvatarAppearance): void {
    if (this.membership) this.membership.appearance = appearance
    this.send('arcade:appearance', { appearance })
  }

  /** Shows everyone what the player holds, or that they put it down (`null`). */
  hold(item: HeldItem | null): void {
    this.send('arcade:hold', { item })
  }

  /**
   * Tells the Room the player used an Interactable, by its id in the map, with a whole
   * number the use carries if it has one (a dart's score).
   */
  use(target: string, value?: number): void {
    this.send('arcade:use', value === undefined ? { target } : { target, value })
  }

  /** Tells visitors that the player saved the Home they are both in. */
  homeSaved(): void {
    this.send('arcade:home', {})
  }

  /** How many people are in each Room right now. */
  async roomCounts(): Promise<RoomCounts> {
    const reply: unknown = await this.socket
      .timeout(JOIN_TIMEOUT_MS)
      .emitWithAck('arcade:rooms', {} satisfies ClientEvents['arcade:rooms'])
    if (typeof reply !== 'object' || reply === null || !('ok' in reply) || !reply.ok || !('rooms' in reply)) {
      throw new Error('The Arcade server did not say who is where')
    }
    return reply.rooms as RoomCounts
  }

  leave(): void {
    if (!this.membership) return
    this.send('arcade:leave', {})
    this.membership = null
    this.lastSent = null
    this.clearPending()
  }

  destroy(): void {
    this.leave()
    for (const unbind of this.unbind) unbind()
    this.events.clear()
  }

  private async connect(membership: Membership): Promise<JoinResult> {
    const { room, appearance, pose } = membership
    let result: JoinResult
    try {
      const reply: unknown = await this.socket
        .timeout(JOIN_TIMEOUT_MS)
        .emitWithAck('arcade:join', { room, appearance, pose } satisfies ClientEvents['arcade:join'])
      result = toJoinResult(reply)
    } catch {
      result = { ok: false, error: 'The Arcade server did not answer' }
    }
    // The player left, or moved to another Room, while this join was on its way.
    if (membership !== this.membership) return result
    if (result.ok) {
      this.lastSent = pose
      this.lastSentAt = Date.now()
      this.events.emit('snapshot', { self: result.self, occupants: result.occupants })
    } else {
      this.events.emit('error', { message: result.error })
    }
    return result
  }

  private flushPose(pose: Pose) {
    this.clearPending()
    this.lastSent = pose
    this.lastSentAt = Date.now()
    this.send('arcade:move', pose)
  }

  private clearPending() {
    if (this.pendingTimer) clearTimeout(this.pendingTimer)
    this.pendingTimer = null
    this.pendingPose = null
  }

  private send<K extends keyof ClientEvents>(event: K, payload: ClientEvents[K]) {
    if (this.membership && this.socket.connected) this.socket.emit(event, payload)
  }

  private receive<K extends NetEventName>(name: K, payload: NetEvents[K]) {
    if (!this.membership) return
    // Appearances are drawn from the catalog on this side; one it cannot draw falls
    // back to that user's default look rather than breaking the Avatar.
    if (name === 'joined') {
      this.events.emit('joined', sanitize(payload as Occupant))
      return
    }
    if (name === 'appearance') {
      const { id, appearance } = payload as NetEvents['appearance']
      const fallback = defaultAppearance(id)
      this.events.emit('appearance', { id, appearance: toAppearance(appearance, fallback) })
      return
    }
    if (name === 'held') {
      const { id, item } = payload as NetEvents['held']
      this.events.emit('held', { id, item: toHeldItem(item) })
      return
    }
    this.events.emit(name, payload)
  }
}

function sanitize(occupant: Occupant): Occupant {
  return {
    ...occupant,
    appearance: toAppearance(occupant.appearance, defaultAppearance(occupant.user)),
    holding: toHeldItem(occupant.holding),
  }
}

/** An item this client can draw, or nothing. */
function toHeldItem(value: unknown): HeldItem | null {
  return HELD_ITEMS.find((item) => item === value) ?? null
}

function toJoinResult(reply: unknown): JoinResult {
  if (typeof reply !== 'object' || reply === null || !('ok' in reply)) {
    return { ok: false, error: 'The Arcade server sent an unexpected reply' }
  }
  const result = reply as JoinResult
  if (!result.ok) return result
  return { ok: true, self: sanitize(result.self), occupants: result.occupants.map(sanitize) }
}
