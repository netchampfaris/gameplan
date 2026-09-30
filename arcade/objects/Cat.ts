import Phaser from 'phaser'
import type { RoomPerson } from '../interactions/registry'
import type { Facing, Interactable } from '../world/interactables'
import { floatUp, HEART_COLOR, pixelIcon, SLEEP_COLOR } from './pixelIcons'
import { loopAnimation, Sheets } from './sheets'

/**
 * The Room's cat. It naps on its bed, and now and then wanders a few tiles away, naps on
 * a free seat, or walks over to sit by its favourite person.
 *
 * There is no server state for where it is. Where the cat is follows from the time: time
 * is cut into cycles, and each cycle's plan comes from a random generator seeded with the
 * cycle's number. Every game in the Room computes the same plan, so everyone sees the cat
 * in the same place, give or take how far apart their clocks are.
 *
 * Two plans also look at who is in the Room, which every game knows from presence: which
 * seats are taken, and where the favourite person is. The cat decides when it leaves its
 * bed and keeps that choice for the cycle. If someone sits on its seat, it walks back to
 * its bed. A game that opens in the middle of a trip decides from what it sees then, so it
 * can briefly disagree with the others until the cycle ends.
 */

const TILE = 48
/** One plan per cycle. A cycle starts and ends with the cat on its bed. */
const CYCLE_MS = 60_000
/** How likely each plan is in a cycle. The rest of the time it naps on its bed. */
const CHANCE = { wander: 0.3, seat: 0.25, favourite: 0.25 }
/** How far from the bed it wanders, in tiles. */
const WANDER_RADIUS = 3
/** How far it walks to a seat or its favourite person, in steps from tile to tile. */
const TRIP_STEPS = 12
const WALK_SPEED = 36
const HOP_HEIGHT = 2
/** How long it perks up after being petted. */
const PETTED_MS = 3000
const SLEEP_EVERY_MS = 2400
const HEART_EVERY_MS = 3200

// The cat faces right on the sheet. Its paws are about 44 px down its 144x48 frame.
const ORIGIN = { x: 0.5, y: 44 / 48 }
const NAP_FRAME = 8
// The cat's head, above its feet, for hearts and z's.
const HEAD = { x: 22, y: -34 }
// Its feet stand this far above the bottom of the tile it is on.
const FEET = 6
// On a seat it is drawn this much higher, on the cushion rather than at the chair's feet.
const SEAT_LIFT = 14

type Mode = 'nap' | 'sit' | 'walk'
type Side = Extract<Facing, 'left' | 'right'>

interface CatPose {
  x: number
  y: number
  facing: Side
  mode: Mode
  /** Where it stays on a trip, once there. */
  spot?: 'seat' | 'favourite'
  /** Drawn this far above its feet, which still set what it is drawn in front of. */
  lift?: number
}

interface Point {
  x: number
  y: number
}

/** What the cat knows about its Room besides the map. */
export interface CatSurroundings {
  /** Seats it may nap on while nobody sits there. */
  seats: readonly Interactable[]
  /** Everyone in the Room as the game draws them now, the player included; empty until joined. */
  people(): readonly RoomPerson[]
  /** The user it walks over to when they are in the Room, or null. */
  favourite(): string | null
}

/** A walk from the bed to a seat or to the favourite person, and back, in one cycle. */
interface Trip {
  kind: 'seat' | 'favourite'
  /** From the bed to where it stays. */
  path: Point[]
  length: number
  /** Milliseconds into the cycle. */
  leaveAt: number
  stay: number
  facing: Side
  seat: Interactable | null
  /** Someone took the seat: when (ms into the cycle) and how far along the path the cat was. */
  interrupted: { at: number; distance: number } | null
}

interface SeatRoute {
  seat: Interactable
  path: Point[]
}

export class Cat {
  private readonly scene: Phaser.Scene
  private readonly sprite: Phaser.GameObjects.Sprite
  private readonly bed: Point
  private readonly spots: Point[]
  private readonly seed: number
  private readonly surroundings: CatSurroundings
  private readonly routes: Routes
  /** Seats it can reach, in map order, so every game has the same list. */
  private readonly seatRoutes: SeatRoute[]
  private mode: Mode | null = null
  private spot: CatPose['spot'] = undefined
  private pettedUntil = 0
  private nextZ = 0
  private nextHeart = 0
  /** The cycle whose trip is decided, and the trip (null: it stays on its bed). */
  private tripCycle = -1
  private trip: Trip | null = null

  /**
   * @param bed Where the cat naps: its feet, in map pixels.
   * @param seed Anything that names this cat, so cats in different places differ.
   */
  constructor(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    bed: Point,
    seed: string,
    surroundings: CatSurroundings,
  ) {
    this.scene = scene
    this.bed = bed
    this.seed = hash(seed)
    this.surroundings = surroundings
    this.spots = freeSpotsAround(map, bed)
    this.routes = new Routes(map, bed)
    this.seatRoutes = surroundings.seats.flatMap((seat) => {
      const feet = { x: seat.x + seat.width / 2, y: seat.y + seat.height - FEET }
      const path = this.routes.to(feet, feet)
      return path ? [{ seat, path }] : []
    })
    this.sprite = scene.add
      .sprite(bed.x, bed.y, Sheets.cat.key, NAP_FRAME)
      .setOrigin(ORIGIN.x, ORIGIN.y)
    this.update(Date.now())
  }

  /** Where the cat's feet are now. */
  get position(): Point {
    return { x: this.sprite.x, y: this.sprite.y }
  }

  /** Napping on a seat. Someone who walks up to it can sit there, and the cat moves on. */
  get onSeat(): boolean {
    return this.spot === 'seat'
  }

  update(now: number) {
    const pose = this.poseAt(now)
    const petted = this.scene.time.now < this.pettedUntil
    const mode = pose.mode === 'nap' && petted ? 'sit' : pose.mode
    const hop = mode === 'walk' ? Math.abs(Math.sin(now / 90)) * HOP_HEIGHT : 0
    this.sprite.setPosition(Math.round(pose.x), Math.round(pose.y - hop - (pose.lift ?? 0)))
    this.sprite.setFlipX(pose.facing === 'left')
    this.sprite.setDepth(pose.y)

    if (mode !== this.mode) {
      this.mode = mode
      if (mode === 'nap') this.sprite.stop().setFrame(NAP_FRAME)
      else this.sprite.play(loopAnimation(this.scene, Sheets.cat, mode === 'walk' ? 14 : 8))
    }
    if (pose.spot !== this.spot) {
      this.spot = pose.spot
      this.nextHeart = 0
    }
    const head = this.head()
    if (mode === 'nap' && this.scene.time.now >= this.nextZ) {
      this.nextZ = this.scene.time.now + SLEEP_EVERY_MS
      floatUp(this.scene, pixelIcon(this.scene, 'z', SLEEP_COLOR), head.x, head.y, {
        rise: 26,
        sway: 3,
        duration: 2000,
      })
    }
    if (pose.spot === 'favourite' && this.scene.time.now >= this.nextHeart) {
      this.nextHeart = this.scene.time.now + HEART_EVERY_MS
      floatUp(this.scene, pixelIcon(this.scene, 'heart', HEART_COLOR), head.x, head.y, {
        rise: 22,
        sway: 2,
        duration: 1600,
      })
    }
  }

  /** Someone petted the cat: it perks up and hearts rise over it. */
  pet() {
    this.pettedUntil = this.scene.time.now + PETTED_MS
    const head = this.head()
    const heart = pixelIcon(this.scene, 'heart', HEART_COLOR)
    for (let index = 0; index < 4; index++) {
      floatUp(this.scene, heart, head.x + (index - 1.5) * 12, head.y, {
        rise: 30 + index * 6,
        sway: 4,
        duration: 1400,
        delay: index * 140,
      })
    }
  }

  destroy() {
    this.sprite.destroy()
  }

  private head(): Point {
    const side = this.sprite.flipX ? -1 : 1
    return { x: this.sprite.x + HEAD.x * side, y: this.sprite.y + HEAD.y }
  }

  /** The plan for the cycle `now` falls in, evaluated at `now`. */
  private poseAt(now: number): CatPose {
    const cycle = Math.floor(now / CYCLE_MS)
    const elapsed = now - cycle * CYCLE_MS
    const random = mulberry32(this.seed ^ cycle)
    const home: CatPose = { ...this.bed, facing: 'right', mode: 'nap' }
    const roll = random()

    if (roll < CHANCE.wander) return this.spots.length ? this.wander(random, elapsed) ?? home : home
    if (roll >= CHANCE.wander + CHANCE.seat + CHANCE.favourite) return home

    const kind = roll < CHANCE.wander + CHANCE.seat ? 'seat' : 'favourite'
    const leaveAt = 2000 + random() * 4000
    const first = random()
    if (elapsed < leaveAt) return home
    if (this.tripCycle !== cycle) {
      // Before joining, the game knows nobody in the Room yet; decide once it does.
      if (!this.surroundings.people().length) return home
      this.tripCycle = cycle
      this.trip = kind === 'seat' ? this.seatTrip(first, leaveAt) : this.favouriteTrip(leaveAt)
    }
    if (!this.trip) return home
    this.checkSeat(this.trip, elapsed)
    return this.tripPose(this.trip, elapsed) ?? home
  }

  /** A short walk to a free tile near the bed, a sit, and back. */
  private wander(random: () => number, elapsed: number): CatPose | null {
    const spot = this.spots[Math.floor(random() * this.spots.length)]
    const leaveAt = 4000 + random() * 8000
    const linger = 6000 + random() * 6000
    const walk = (Math.hypot(spot.x - this.bed.x, spot.y - this.bed.y) / WALK_SPEED) * 1000
    const outward: Side = spot.x < this.bed.x ? 'left' : 'right'
    const back: Side = outward === 'left' ? 'right' : 'left'

    let t = elapsed - leaveAt
    if (t < 0) return null
    if (t < walk) return { ...lerp(this.bed, spot, t / walk), facing: outward, mode: 'walk' }
    t -= walk
    if (t < linger) return { ...spot, facing: back, mode: 'sit' }
    t -= linger
    if (t < walk) return { ...lerp(spot, this.bed, t / walk), facing: back, mode: 'walk' }
    return null
  }

  /** The first free seat it can reach, counting round from a seat the cycle picks. */
  private seatTrip(first: number, leaveAt: number): Trip | null {
    const people = this.surroundings.people()
    const count = this.seatRoutes.length
    const start = Math.floor(first * count)
    for (let index = 0; index < count; index++) {
      const { seat, path } = this.seatRoutes[(start + index) % count]
      if (isTaken(seat, people)) continue
      const facing = seat.facing === 'left' || seat.facing === 'right' ? seat.facing : sideOf(path)
      return makeTrip('seat', path, leaveAt, facing, seat)
    }
    return null
  }

  /** A walk to the tile beside the favourite person, facing them. */
  private favouriteTrip(leaveAt: number): Trip | null {
    const user = this.surroundings.favourite()
    const person = user ? this.surroundings.people().find((entry) => entry.user === user) : null
    if (!person) return null
    // Stop one tile short of them: the last step of the way there.
    const path = this.routes.to(person, null)
    if (!path || path.length < 2) return null
    const facing: Side = person.x < path[path.length - 1].x ? 'left' : 'right'
    return makeTrip('favourite', path, leaveAt, facing, null)
  }

  /** Someone sat on the seat the cat is heading to or napping on: it turns back. */
  private checkSeat(trip: Trip, elapsed: number) {
    if (!trip.seat || trip.interrupted) return
    const walk = walkTime(trip.length)
    const t = elapsed - trip.leaveAt
    if (t < 0 || t >= walk + trip.stay) return
    if (!isTaken(trip.seat, this.surroundings.people())) return
    trip.interrupted = { at: elapsed, distance: Math.min(trip.length, (t / 1000) * WALK_SPEED) }
  }

  private tripPose(trip: Trip, elapsed: number): CatPose | null {
    const walk = walkTime(trip.length)
    const cut = trip.interrupted
    if (cut && elapsed >= cut.at) {
      const distance = cut.distance - ((elapsed - cut.at) / 1000) * WALK_SPEED
      return distance > 0 ? { ...along(trip.path, distance, 'back'), mode: 'walk' } : null
    }
    let t = elapsed - trip.leaveAt
    if (t < 0) return null
    if (t < walk) return { ...along(trip.path, (t / 1000) * WALK_SPEED, 'out'), mode: 'walk' }
    t -= walk
    if (t < trip.stay) {
      const end = trip.path[trip.path.length - 1]
      if (trip.kind === 'favourite') return { ...end, facing: trip.facing, mode: 'sit', spot: 'favourite' }
      return { ...end, facing: trip.facing, mode: 'nap', spot: 'seat', lift: SEAT_LIFT }
    }
    t -= trip.stay
    if (t < walk) return { ...along(trip.path, trip.length - (t / 1000) * WALK_SPEED, 'back'), mode: 'walk' }
    return null
  }
}

function makeTrip(kind: Trip['kind'], path: Point[], leaveAt: number, facing: Side, seat: Interactable | null): Trip {
  const length = pathLength(path)
  // Back on the bed a second before the cycle ends.
  const stay = Math.max(0, CYCLE_MS - 1000 - leaveAt - 2 * walkTime(length))
  return { kind, path, length, leaveAt, stay, facing, seat, interrupted: null }
}

function walkTime(length: number): number {
  return (length / WALK_SPEED) * 1000
}

function isTaken(seat: Interactable, people: readonly RoomPerson[]): boolean {
  // A seated Avatar's feet are at the bottom middle of the seat.
  return people.some(
    (person) =>
      person.sitting &&
      person.x >= seat.x &&
      person.x <= seat.x + seat.width &&
      person.y >= seat.y &&
      person.y <= seat.y + seat.height + 1,
  )
}

/** The point `distance` pixels along the path, and the way the cat faces walking it. */
function along(path: Point[], distance: number, direction: 'out' | 'back'): Point & { facing: Side } {
  let left = Math.max(0, distance)
  for (let index = 1; index < path.length; index++) {
    const from = path[index - 1]
    const to = path[index]
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    if (left <= length || index === path.length - 1) {
      const t = length ? Math.min(1, left / length) : 1
      // A straight up or down stretch keeps the way the whole walk goes.
      const dx = to.x - from.x || path[path.length - 1].x - path[0].x
      const outward: Side = dx < 0 ? 'left' : 'right'
      return { ...lerp(from, to, t), facing: direction === 'out' ? outward : outward === 'left' ? 'right' : 'left' }
    }
    left -= length
  }
  return { ...path[0], facing: 'right' }
}

function sideOf(path: Point[]): Side {
  return path[path.length - 1].x < path[0].x ? 'left' : 'right'
}

function pathLength(path: Point[]): number {
  let length = 0
  for (let index = 1; index < path.length; index++) {
    length += Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y)
  }
  return length
}

/**
 * Every tile the cat can walk to from its bed within TRIP_STEPS steps, and the shortest
 * way there, found once. A tile in the Collision layer (a chair, a sofa) can be the end of
 * a route, but never a step on the way.
 */
class Routes {
  private readonly map: Phaser.Tilemaps.Tilemap
  private readonly bed: Point
  private readonly bedTile: number
  /** Each tile reached, by its key, and the tile it was reached from. */
  private readonly parents = new Map<number, number>()

  constructor(map: Phaser.Tilemaps.Tilemap, bed: Point) {
    this.map = map
    this.bed = bed
    this.bedTile = this.key(Math.floor(bed.x / TILE), Math.floor((bed.y - 1) / TILE))
    this.parents.set(this.bedTile, this.bedTile)
    let frontier = [this.bedTile]
    for (let step = 0; step < TRIP_STEPS && frontier.length; step++) {
      const next: number[] = []
      for (const tile of frontier) {
        const x = tile % map.width
        const y = Math.floor(tile / map.width)
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue
          const neighbour = this.key(nx, ny)
          if (this.parents.has(neighbour)) continue
          this.parents.set(neighbour, tile)
          if (!this.blocked(nx, ny)) next.push(neighbour)
        }
      }
      frontier = next
    }
  }

  /**
   * The way from the bed to the tile under `target`, straightened where nothing is in
   * the way, or null if it is out of reach. It ends at `end`; with null, one tile short.
   */
  to(target: Point, end: Point | null): Point[] | null {
    const goal = this.key(Math.floor(target.x / TILE), Math.floor((target.y - 1) / TILE))
    if (!this.parents.has(goal) || goal === this.bedTile) return null
    const tiles = [goal]
    while (tiles[0] !== this.bedTile) tiles.unshift(this.parents.get(tiles[0]) ?? this.bedTile)
    if (!end) tiles.pop()
    const points = tiles.map((tile, index) => (index === 0 ? this.bed : this.centre(tile)))
    if (end) points[points.length - 1] = end
    if (points.length < 2) return null
    return this.straighten(points, tiles[tiles.length - 1])
  }

  /** Skips corners wherever the cat can walk straight past them. */
  private straighten(points: Point[], goal: number): Point[] {
    const result = [points[0]]
    let from = 0
    while (from < points.length - 1) {
      let to = points.length - 1
      while (to > from + 1 && !this.clear(points[from], points[to], goal)) to--
      result.push(points[to])
      from = to
    }
    return result
  }

  private clear(from: Point, to: Point, goal: number): boolean {
    const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 8)
    for (let step = 1; step <= steps; step++) {
      const { x, y } = lerp(from, to, step / steps)
      const tileX = Math.floor(x / TILE)
      const tileY = Math.floor(y / TILE)
      const tile = this.key(tileX, tileY)
      if (tile !== this.bedTile && tile !== goal && this.blocked(tileX, tileY)) return false
    }
    return true
  }

  private blocked(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return true
    return this.map.getLayer('Collision') !== null && this.map.getTileAt(x, y, false, 'Collision') !== null
  }

  private centre(tile: number): Point {
    const x = tile % this.map.width
    const y = Math.floor(tile / this.map.width)
    return { x: x * TILE + TILE / 2, y: y * TILE + TILE - FEET }
  }

  private key(x: number, y: number): number {
    return y * this.map.width + x
  }
}

/**
 * Tile centres near the bed that the cat can reach in a straight line without crossing
 * anything in the Collision layer. The same map gives the same list, in the same order,
 * in every game.
 */
function freeSpotsAround(map: Phaser.Tilemaps.Tilemap, bed: Point): Point[] {
  const collision = map.getLayer('Collision') ? 'Collision' : null
  const bedTile = { x: Math.floor(bed.x / TILE), y: Math.floor((bed.y - 1) / TILE) }
  const blocked = (x: number, y: number) => {
    const tileX = Math.floor(x / TILE)
    const tileY = Math.floor(y / TILE)
    if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) return true
    if (tileX === bedTile.x && tileY === bedTile.y) return false
    return collision !== null && map.getTileAt(tileX, tileY, false, collision) !== null
  }
  const spots: Point[] = []
  for (let dy = -WANDER_RADIUS; dy <= WANDER_RADIUS; dy++) {
    for (let dx = -WANDER_RADIUS; dx <= WANDER_RADIUS; dx++) {
      if (Math.abs(dx) + Math.abs(dy) < 2) continue
      const spot = { x: (bedTile.x + dx) * TILE + TILE / 2, y: (bedTile.y + dy) * TILE + TILE - FEET }
      const steps = Math.ceil(Math.hypot(spot.x - bed.x, spot.y - bed.y) / 8)
      let clear = true
      for (let step = 1; step <= steps && clear; step++) {
        const point = lerp(bed, spot, step / steps)
        clear = !blocked(point.x, point.y)
      }
      if (clear) spots.push(spot)
    }
  }
  return spots
}

function lerp(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
}

function hash(text: string): number {
  let value = 2166136261
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

/** A small seeded random generator: the same seed gives the same numbers everywhere. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
