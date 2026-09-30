/**
 * Arcade presence: who is in which Room, where they stand, what they say and hold, and
 * the things they use (the cat, the jukebox, a board of notes).
 *
 * The client side of this protocol, with its types, is `arcade/net/protocol.ts`. This
 * file repeats its limits and shapes; change both together.
 *
 * Presence is kept in memory, per site namespace, and is lost when the server restarts.
 * Clients join again on reconnect, so a restart costs a moment of empty Rooms.
 * Each Room is a socket.io room named `arcade:<room id>`. Every event goes to the other
 * occupants only: the sender draws its own Avatar without waiting for the server.
 */

const ROOM_ID = /^(common|home:\S{1,140})$/
const EMOTES = new Set(['heart', 'exclaim', 'question', 'music', 'sleep', 'star', 'angry', 'dots'])
const FACINGS = new Set(['down', 'left', 'right', 'up'])
const HELD_ITEMS = new Set(['coffee'])
// An Interactable's id in the map. Clients ignore ids their map does not have.
const TARGET_ID = /^[\w-]{1,64}$/
const STATES = new Set(['idle', 'walk', 'sit'])
const MAX_SAY_LENGTH = 140
// The largest whole number a `use` can carry, like a dart's score.
const MAX_USE_VALUE = 999
// Anything longer is not a chat message; refuse it before trimming.
const MAX_RAW_SAY_LENGTH = 2000
// Maps are a few thousand pixels across.
const MAX_COORDINATE = 100000
// Part numbers come from the pack's file names (see gp_arcade_profile.py).
const MAX_PART_NUMBER = 99

// Token buckets per socket: sustained rate per second, and burst.
const LIMITS = {
  join: [0.5, 3],
  move: [20, 20],
  say: [1, 3],
  emote: [2, 3],
  appearance: [0.5, 3],
  hold: [1, 3],
  use: [1, 3],
  home: [0.5, 3],
  rooms: [1, 5],
}

const PLAYER_ENDPOINT = '/api/v2/method/GP%20Arcade%20Profile/get_player'

module.exports = function setupArcade(socket) {
  const rooms = presence(socket.nsp)
  const buckets = Object.fromEntries(
    Object.entries(LIMITS).map(([name, [rate, burst]]) => [name, tokenBucket(rate, burst)]),
  )
  /** The Room this socket is in, and its occupant record there. */
  let current = null
  let player = null
  let joinAttempt = 0

  on('arcade:join', async (payload, ack) => {
    if (typeof ack !== 'function') return
    const attempt = ++joinAttempt
    if (!buckets.join.take()) return ack(refusal('Too many attempts to join. Try again shortly.'))
    if (!socket.user || socket.user === 'Guest') return ack(refusal('Sign in to enter the Arcade.'))
    const room = payload && payload.room
    const appearance = toAppearance(payload && payload.appearance)
    const pose = toPose(payload && payload.pose)
    if (!isRoomId(room) || !appearance || !pose)
      return ack(refusal('That join request is not valid.'))

    try {
      player ??= await fetchPlayer(socket)
    } catch (error) {
      return ack(refusal(error.message))
    }
    // The socket left, or asked to join somewhere else, while the lookup ran.
    if (!socket.connected) return
    if (attempt !== joinAttempt) return ack(refusal('A newer join replaced this one.'))

    leave()
    const occupant = {
      id: socket.id,
      user: player.user,
      fullName: player.full_name,
      appearance,
      holding: null,
      ...pose,
    }
    const occupants = [...(rooms.get(room) ?? new Map()).values()]
    if (!rooms.has(room)) rooms.set(room, new Map())
    rooms.get(room).set(socket.id, occupant)
    current = { room, occupant }
    socket.join(channel(room))
    socket.to(channel(room)).emit('arcade:joined', occupant)
    ack({ ok: true, self: occupant, occupants })
  })

  on('arcade:move', (payload) => {
    const pose = toPose(payload)
    if (!current || !pose || !buckets.move.take()) return
    Object.assign(current.occupant, pose)
    broadcast('arcade:moved', { id: socket.id, ...pose })
  })

  on('arcade:say', (payload) => {
    const raw = payload && payload.text
    if (!current || typeof raw !== 'string' || raw.length > MAX_RAW_SAY_LENGTH) return
    const text = Array.from(raw.trim()).slice(0, MAX_SAY_LENGTH).join('').trim()
    if (!text || !buckets.say.take()) return
    broadcast('arcade:said', { id: socket.id, text })
  })

  on('arcade:emote', (payload) => {
    const emote = payload && payload.emote
    if (!current || !EMOTES.has(emote) || !buckets.emote.take()) return
    broadcast('arcade:emoted', { id: socket.id, emote })
  })

  on('arcade:appearance', (payload) => {
    const appearance = toAppearance(payload && payload.appearance)
    if (!current || !appearance || !buckets.appearance.take()) return
    current.occupant.appearance = appearance
    broadcast('arcade:appearance', { id: socket.id, appearance })
  })

  on('arcade:hold', (payload) => {
    const item = payload && payload.item
    if (!current || (item !== null && !HELD_ITEMS.has(item)) || !buckets.hold.take()) return
    current.occupant.holding = item
    broadcast('arcade:held', { id: socket.id, item })
  })

  on('arcade:use', (payload) => {
    const target = payload && payload.target
    const value = payload && payload.value
    const hasValue = value !== undefined
    if (hasValue && !(Number.isInteger(value) && value >= 0 && value <= MAX_USE_VALUE)) return
    if (!current || typeof target !== 'string' || !TARGET_ID.test(target) || !buckets.use.take())
      return
    broadcast(
      'arcade:used',
      hasValue ? { id: socket.id, target, value } : { id: socket.id, target },
    )
  })

  // The owner saved their Home. Only the owner, from inside it, can say so, and the
  // payload names nobody: visitors reload the Home they are in.
  on('arcade:home', () => {
    if (!current || !player || current.room !== `home:${player.user}` || !buckets.home.take())
      return
    broadcast('arcade:home', { user: player.user })
  })

  // How many people are in each Room, for the Home directory. Counts people, not tabs.
  on('arcade:rooms', (_payload, ack) => {
    if (typeof ack !== 'function') return
    if (!player || !buckets.rooms.take()) return ack({ ok: false, error: 'Not in the Arcade.' })
    const counts = {}
    for (const [room, occupants] of rooms) {
      counts[room] = new Set([...occupants.values()].map((occupant) => occupant.user)).size
    }
    ack({ ok: true, rooms: counts })
  })

  on('arcade:leave', () => {
    joinAttempt++
    leave()
  })

  on('disconnect', () => leave())

  function leave() {
    if (!current) return
    const { room } = current
    const occupants = rooms.get(room)
    occupants?.delete(socket.id)
    if (occupants && occupants.size === 0) rooms.delete(room)
    socket.to(channel(room)).emit('arcade:left', { id: socket.id })
    socket.leave(channel(room))
    current = null
  }

  function broadcast(event, payload) {
    socket.to(channel(current.room)).emit(event, payload)
  }

  // A malformed payload must never take the server down with an uncaught error.
  function on(event, handler) {
    socket.on(event, async (...args) => {
      try {
        await handler(...args)
      } catch (error) {
        console.warn(`[arcade] ${event} from ${socket.user} failed`, error)
      }
    })
  }
}

/** Rooms of one site: room id to (socket id to occupant). Kept on the namespace. */
function presence(nsp) {
  nsp.arcadeRooms ??= new Map()
  return nsp.arcadeRooms
}

function channel(room) {
  return `arcade:${room}`
}

function refusal(error) {
  return { ok: false, error }
}

function isRoomId(value) {
  return typeof value === 'string' && ROOM_ID.test(value)
}

/** Asks Frappe, with the socket's own session, who this is and whether they may enter. */
async function fetchPlayer(socket) {
  const response = await socket.frappe_request(PLAYER_ENDPOINT)
  const body = await response.json().catch(() => null)
  const data = body && body.data
  if (!response.ok || !data || typeof data.user !== 'string') {
    const message = body && body.errors && body.errors[0] && body.errors[0].message
    throw new Error(message || 'Only Gameplan members can enter the Arcade.')
  }
  if (data.user !== socket.user) throw new Error('The session changed. Reload the page.')
  return { user: data.user, full_name: String(data.full_name || data.user) }
}

function toPose(value) {
  if (typeof value !== 'object' || value === null) return null
  const { x, y, facing, state } = value
  if (!isCoordinate(x) || !isCoordinate(y) || !FACINGS.has(facing) || !STATES.has(state))
    return null
  return { x: Math.round(x), y: Math.round(y), facing, state }
}

function isCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE
}

/** The same shape check as GPArcadeProfile.validate. Returns a clean copy, or null. */
function toAppearance(value) {
  if (typeof value !== 'object' || value === null) return null
  const { body, eyes, outfit, hairstyle, accessory } = value
  if (!isPartNumber(body) || !isPartNumber(eyes)) return null
  const parts = {
    outfit: toColoredPart(outfit),
    hairstyle: toColoredPart(hairstyle),
  }
  if (!parts.outfit || !parts.hairstyle) return null
  const appearance = { body, eyes, ...parts }
  if (accessory !== undefined && accessory !== null) {
    appearance.accessory = toColoredPart(accessory)
    if (!appearance.accessory) return null
  }
  return appearance
}

function toColoredPart(value) {
  if (typeof value !== 'object' || value === null) return null
  const { style, color } = value
  return isPartNumber(style) && isPartNumber(color) ? { style, color } : null
}

function isPartNumber(value) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_PART_NUMBER
}

function tokenBucket(ratePerSecond, burst) {
  let tokens = burst
  let last = Date.now()
  return {
    take() {
      const now = Date.now()
      tokens = Math.min(burst, tokens + ((now - last) / 1000) * ratePerSecond)
      last = now
      if (tokens < 1) return false
      tokens -= 1
      return true
    },
  }
}
