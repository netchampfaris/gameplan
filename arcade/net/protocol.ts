import type { AvatarAppearance } from '../avatar/catalog.ts'
import type { AvatarState } from '../avatar/sheet.ts'
import type { Facing } from '../world/interactables.ts'

/**
 * The Arcade's realtime protocol: what a client and `realtime/arcade.js` send each
 * other over Frappe's socket. The server is plain JavaScript, so it repeats these
 * shapes and limits; change both sides together.
 *
 * Every event is prefixed `arcade:`. A client joins one Room at a time. The server
 * knows who a socket belongs to from its session, never from a payload.
 */

/** `common` for the Common Room, `home:<user>` for a user's Home. */
export type RoomId = 'common' | `home:${string}`

export const EMOTES = ['heart', 'exclaim', 'question', 'music', 'sleep', 'star', 'angry', 'dots'] as const
export type EmoteId = (typeof EMOTES)[number]

/** What an Avatar can hold. The holder drops it after `HOLD_MS` and says so. */
export const HELD_ITEMS = ['coffee'] as const
export type HeldItem = (typeof HELD_ITEMS)[number]
export const HOLD_MS = 60_000

/** An Interactable's id in the Room's map, as `use` names it: letters, digits, `-`, `_`. */
export const TARGET_ID = /^[\w-]{1,64}$/

/** The largest `value` a `use` can carry: a whole number from 0 up to this. */
export const MAX_USE_VALUE = 999

/** Longest chat message, in characters. The server trims to this. */
export const MAX_SAY_LENGTH = 140

export interface Pose {
  x: number
  y: number
  facing: Facing
  state: AvatarState
}

/** One socket in a Room. A user with two tabs open is two occupants. */
export interface Occupant extends Pose {
  /** The socket id. Stable for as long as the occupant stays in the Room. */
  id: string
  user: string
  fullName: string
  appearance: AvatarAppearance
  /** What they have in hand, if anything. */
  holding: HeldItem | null
}

export type JoinResult = { ok: true; self: Occupant; occupants: Occupant[] } | { ok: false; error: string }

/** How many people are in each Room right now. Rooms nobody is in are left out. */
export type RoomCounts = Partial<Record<RoomId, number>>

export type RoomsResult = { ok: true; rooms: RoomCounts } | { ok: false; error: string }

/** Client to server. `join` is acknowledged with a `JoinResult`. */
export interface ClientEvents {
  'arcade:join': { room: RoomId; appearance: AvatarAppearance; pose: Pose }
  'arcade:move': Pose
  'arcade:say': { text: string }
  'arcade:emote': { emote: EmoteId }
  'arcade:appearance': { appearance: AvatarAppearance }
  'arcade:hold': { item: HeldItem | null }
  /**
   * Used an Interactable in a way the Room should see: petted the cat, pinned a note.
   * `value` is a whole number the use carries, like a dart's score.
   */
  'arcade:use': { target: string; value?: number }
  /** The owner saved the Home they are in, so visitors should reload it. */
  'arcade:home': Record<string, never>
  /** Acknowledged with a `RoomsResult`. */
  'arcade:rooms': Record<string, never>
  'arcade:leave': Record<string, never>
}

/** Server to every other occupant of the sender's Room. */
export interface ServerEvents {
  'arcade:joined': Occupant
  'arcade:moved': Pose & { id: string }
  'arcade:said': { id: string; text: string }
  'arcade:emoted': { id: string; emote: EmoteId }
  'arcade:appearance': { id: string; appearance: AvatarAppearance }
  'arcade:held': { id: string; item: HeldItem | null }
  'arcade:used': { id: string; target: string; value?: number }
  /** The Home's owner saved it. */
  'arcade:home': { user: string }
  'arcade:left': { id: string }
}

export const SERVER_EVENTS = [
  'arcade:joined',
  'arcade:moved',
  'arcade:said',
  'arcade:emoted',
  'arcade:appearance',
  'arcade:held',
  'arcade:used',
  'arcade:home',
  'arcade:left',
] as const satisfies readonly (keyof ServerEvents)[]
