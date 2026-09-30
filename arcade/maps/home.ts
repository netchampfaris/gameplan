import { composeMap, LayoutError, type LayoutProblem, type Placement } from './compose.ts'
import { isPrefabId, prefabs, prefabSize, type PrefabId } from './prefabs.ts'
import { floors, WALL_HEIGHT, wallpapers, type FloorId, type Room, type WallpaperId } from './rooms.ts'
import type { TiledMap, TiledTileLayer } from './tiled.ts'
import { findMapProblems } from './validate.ts'

/**
 * A Home: one room its owner furnishes, stored on their GP Arcade Profile as
 * `{ wallpaper, floor, items }`. This file turns that record into the map HomeScene
 * loads, and decides what a valid Home is. The decorator asks `homeProblem` before
 * every placement, so what the owner can place and what the scene can load never
 * disagree. gp_arcade_profile.py checks the same shape and bounds on save.
 *
 *   x 0          6 7         13
 *     ┌──────────────────────┐  rows 0-2: wall, where wall decor hangs
 *     │                      │  rows 3-11: floor
 *     │                      │
 *     └───────┐ mat ┌────────┘  row 12: bottom wall with the doorway, doormat inside it
 */

export const HOME_WIDTH = 14
export const HOME_HEIGHT = 13
/** Matches MAX_HOME_ITEMS in gp_arcade_profile.py. */
export const MAX_HOME_ITEMS = 60
/** Left column of the doorway through the bottom wall. */
export const HOME_DOOR_X = 6
/** Interactable ids: the Home's way out and its guestbook. */
export const DOOR_ID = 'door'
export const GUESTBOOK_ID = 'guestbook'
/** Where people appear: on arrival, and anywhere else. */
export const HOME_SPAWNS = { door: 'door', center: 'spawn-center' } as const

export interface HomeItem {
  prefab: PrefabId
  x: number
  y: number
}

export interface Home {
  wallpaper: WallpaperId
  floor: FloorId
  items: HomeItem[]
}

/** Why a Home, or one placement in it, is not allowed. */
export type HomeProblem = LayoutProblem | 'outside' | 'off-face' | 'door' | 'unreachable' | 'full'

const DOORMAT: Placement = { prefab: 'doormat', x: HOME_DOOR_X, y: HOME_HEIGHT - 2, id: DOOR_ID }
const SPAWNS = [
  { name: HOME_SPAWNS.center, x: 7, y: 7 },
  { name: HOME_SPAWNS.door, x: 7, y: 10 },
]
// Kept clear so nobody can wall the way out off: the doormat and the row above it.
const DOOR_CELLS = [HOME_HEIGHT - 3, HOME_HEIGHT - 2, HOME_HEIGHT - 1].flatMap((y) => [
  { x: HOME_DOOR_X, y },
  { x: HOME_DOOR_X + 1, y },
])
const DEFAULT_GUESTBOOK: HomeItem = { prefab: 'guestbook', x: 9, y: 8 }

function room(home: Home): Room {
  return {
    id: 'home',
    x: 0,
    y: 0,
    width: HOME_WIDTH,
    height: HOME_HEIGHT,
    wallpaper: home.wallpaper,
    floor: home.floor,
    bottomDoors: [HOME_DOOR_X],
  }
}

/** The Tiled map of a Home. Throws a LayoutError if the items do not fit; check first. */
export function composeHome(home: Home): TiledMap {
  const placements: Placement[] = home.items.map((item) =>
    item.prefab === 'guestbook' ? { ...item, id: GUESTBOOK_ID } : { ...item },
  )
  return composeMap({
    width: HOME_WIDTH,
    height: HOME_HEIGHT,
    rooms: [{ room: room(home), placements: [DOORMAT, ...placements], spawns: SPAWNS }],
  })
}

/** What is wrong with a Home, or null when it can be saved and loaded. */
export function homeProblem(home: Home): HomeProblem | null {
  if (home.items.length > MAX_HOME_ITEMS) return 'full'
  for (const item of home.items) {
    const problem = boundsProblem(item)
    if (problem) return problem
  }
  let map: TiledMap
  try {
    map = composeHome(home)
  } catch (error) {
    if (error instanceof LayoutError) return error.problem
    throw error
  }
  const collision = map.layers.find(
    (layer): layer is TiledTileLayer => layer.type === 'tilelayer' && layer.name === 'Collision',
  )
  if (DOOR_CELLS.some(({ x, y }) => collision?.data[y * HOME_WIDTH + x])) return 'door'
  return findMapProblems(map, HOME_SPAWNS.center).length ? 'unreachable' : null
}

function boundsProblem(item: HomeItem): HomeProblem | null {
  const { width, height } = prefabSize(prefabs[item.prefab])
  if (item.x < 0 || item.y < 0 || item.x + width > HOME_WIDTH || item.y + height > HOME_HEIGHT) return 'outside'
  // compose.ts accepts any wall cell; in a Home, decor hangs on the top wall's face only.
  const onFace = item.x >= 1 && item.x + width <= HOME_WIDTH - 1 && item.y + height <= WALL_HEIGHT
  if (prefabs[item.prefab].kind === 'wall' && !onFace) return 'off-face'
  return null
}

/** Words for the decorator. No em dashes: this is UI copy. */
export const homeProblemText: Record<HomeProblem, string> = {
  'overlap': 'Something is already there',
  'off-floor': 'That goes on the floor',
  'off-wall': 'Hang that on the wall',
  'outside': 'That does not fit in the room',
  'off-face': 'Hang that on the back wall',
  'door': 'Keep the doorway clear',
  'unreachable': 'That would block the way',
  'full': `A Home holds at most ${MAX_HOME_ITEMS} things`,
}

/**
 * A Home from stored JSON. Anything it does not recognise is dropped rather than
 * failing the whole Home: a prefab renamed since, or an item that no longer fits. The
 * result always has exactly one guestbook. Returns null when there is no Home yet.
 */
export function parseHome(value: unknown): Home | null {
  if (!isRecord(value)) return null
  const wallpaper = typeof value.wallpaper === 'string' && isWallpaperId(value.wallpaper) ? value.wallpaper : 'cream'
  const floor = typeof value.floor === 'string' && isFloorId(value.floor) ? value.floor : 'golden-wood'
  const items = Array.isArray(value.items) ? value.items.flatMap((item) => toItem(item) ?? []) : []
  return settle({ wallpaper, floor, items: [] }, items)
}

/**
 * Adds items one by one, keeping each only if the Home stays valid, then makes sure
 * the guestbook is there.
 */
function settle(base: Home, items: HomeItem[]): Home {
  const home: Home = { ...base, items: [] }
  const add = (item: HomeItem) => {
    const next = { ...home, items: [...home.items, item] }
    if (homeProblem(next)) return false
    home.items = next.items
    return true
  }
  let hasGuestbook = false
  for (const item of items) {
    if (item.prefab === 'guestbook' && hasGuestbook) continue
    if (add(item) && item.prefab === 'guestbook') hasGuestbook = true
  }
  if (!hasGuestbook && !add(DEFAULT_GUESTBOOK)) {
    // Something sits where the guestbook goes: it gives way.
    home.items = home.items.filter((item) => !overlaps(item, DEFAULT_GUESTBOOK))
    add(DEFAULT_GUESTBOOK)
  }
  return home
}

function overlaps(a: HomeItem, b: HomeItem): boolean {
  const sa = prefabSize(prefabs[a.prefab])
  const sb = prefabSize(prefabs[b.prefab])
  return a.x < b.x + sb.width && b.x < a.x + sa.width && a.y < b.y + sb.height && b.y < a.y + sa.height
}

function toItem(value: unknown): HomeItem | null {
  if (!isRecord(value)) return null
  const { prefab, x, y } = value
  if (typeof prefab !== 'string' || !isPrefabId(prefab)) return null
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null
  return { prefab, x: Number(x), y: Number(y) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isWallpaperId(id: string): id is WallpaperId {
  return Object.hasOwn(wallpapers, id)
}

export function isFloorId(id: string): id is FloorId {
  return Object.hasOwn(floors, id)
}

// A few wallpaper and floor pairs that suit a first Home; each user gets one of them.
const STARTER_LOOKS: { wallpaper: WallpaperId; floor: FloorId }[] = [
  { wallpaper: 'cream', floor: 'golden-wood' },
  { wallpaper: 'sage', floor: 'parquet' },
  { wallpaper: 'light-blue', floor: 'diagonal-wood' },
  { wallpaper: 'lavender', floor: 'golden-wood' },
  { wallpaper: 'beige-trim', floor: 'parquet' },
]
const STARTER_BEDS: PrefabId[] = ['bed-double-blue', 'bed-double-green', 'bed-double-sky', 'bed-double-yellow']

/** The Home someone has before they decorate: a bed, a couch on a rug, a lamp, plants, a guestbook. */
export function starterHome(user: string): Home {
  // FNV-1a, so similar names still land on different looks.
  const seed = [...user].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261)
  const look = STARTER_LOOKS[seed % STARTER_LOOKS.length] ?? { wallpaper: 'cream', floor: 'golden-wood' }
  const bed = STARTER_BEDS[Math.floor(seed / STARTER_LOOKS.length) % STARTER_BEDS.length] ?? 'bed-double-blue'
  return settle({ ...look, items: [] }, [
    { prefab: 'window-curtains-beige', x: 4, y: 0 },
    { prefab: 'painting-sunset', x: 10, y: 1 },
    { prefab: bed, x: 1, y: 2 },
    { prefab: 'nightstand-oak', x: 3, y: 2 },
    { prefab: 'rug-round-brown', x: 9, y: 5 },
    { prefab: 'couch-gray', x: 9, y: 3 },
    { prefab: 'floor-lamp-red', x: 12, y: 1 },
    { prefab: 'plant-tall', x: 8, y: 1 },
    { prefab: 'plant-small', x: 1, y: 9 },
    { prefab: 'plant-palm', x: 11, y: 9 },
    DEFAULT_GUESTBOOK,
  ])
}
