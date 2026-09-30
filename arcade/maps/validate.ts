import { INTERACTABLES_LAYER } from '../world/interactables.ts'
import { SPAWN_LAYER } from './compose.ts'
import {
  TILE_SIZE,
  type TiledMap,
  type TiledObject,
  type TiledObjectLayer,
  type TiledTileLayer,
} from './tiled.ts'

// Matches REACH in interactions/registry.ts, which cannot be imported here: it
// pulls in the scene runtime.
const REACH = 40

/**
 * Checks that people can get everywhere a map invites them: every spawn point
 * and every interactable is reachable on foot from `spawn-center`. Returns one
 * message per problem; an empty list means the map is playable.
 */
export function findMapProblems(map: TiledMap, start = 'spawn-center'): string[] {
  const walk = walkFrom(map, start)
  if (typeof walk === 'string') return [walk]

  const problems: string[] = []
  for (const spawn of objects(map, SPAWN_LAYER)) {
    const { x, y } = tileOf(spawn)
    if (!walk.isReached(x, y)) problems.push(`Spawn point "${spawn.name}" is out of reach`)
  }
  for (const object of objects(map, INTERACTABLES_LAYER)) {
    if (!walk.cells.some((cell) => walk.isReached(cell.x, cell.y) && canUse(cell, object))) {
      problems.push(`${object.type} "${object.name}" is out of reach`)
    }
  }
  return problems
}

/**
 * Checks that a season's decorations leave the Room working as it did without them.
 * Nothing they stand on may be a cell someone uses a seat, a board or any other
 * interactable from, or a spawn point, and every cell people could walk to before
 * must still be reachable, so no walkway or doorway is cut off.
 */
export function findDecorationProblems(
  base: TiledMap,
  decorated: TiledMap,
  start = 'spawn-center',
): string[] {
  const before = walkFrom(base, start)
  const after = walkFrom(decorated, start)
  if (typeof before === 'string') return [before]
  if (typeof after === 'string') return [after]

  const interactables = objects(base, INTERACTABLES_LAYER)
  const spawns = objects(base, SPAWN_LAYER).map(tileOf)
  const problems: string[] = []
  for (const cell of before.cells) {
    if (!before.isReached(cell.x, cell.y)) continue
    const at = `${cell.x},${cell.y}`
    if (after.isOpen(cell.x, cell.y)) {
      if (!after.isReached(cell.x, cell.y)) problems.push(`Decorations cut off ${at}`)
      continue
    }
    const used = interactables.find((object) => canUse(cell, object))
    if (used)
      problems.push(`Decorations stand at ${at}, where people use ${used.type} "${used.name}"`)
    if (spawns.some((spawn) => spawn.x === cell.x && spawn.y === cell.y)) {
      problems.push(`Decorations stand on a spawn point at ${at}`)
    }
  }
  return problems
}

interface Cell {
  x: number
  y: number
}

interface Walk {
  cells: Cell[]
  isOpen: (x: number, y: number) => boolean
  isReached: (x: number, y: number) => boolean
}

/** Flood fills the walkable cells from a spawn point, or says why it cannot start. */
function walkFrom(map: TiledMap, start: string): Walk | string {
  const { width, height } = map
  const collision = map.layers.find(
    (layer): layer is TiledTileLayer => layer.type === 'tilelayer' && layer.name === 'Collision',
  )
  if (!collision) return 'The map has no Collision layer'
  const origin = objects(map, SPAWN_LAYER).find((spawn) => spawn.name === start)
  if (!origin) return `The map has no "${start}" spawn point`

  const inside = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height
  const isOpen = (x: number, y: number) => inside(x, y) && !collision.data[y * width + x]
  const reached = new Array<boolean>(width * height).fill(false)
  const first = tileOf(origin)
  if (!isOpen(first.x, first.y)) return `"${start}" is inside a wall or furniture`
  const queue = [first]
  reached[first.y * width + first.x] = true
  for (let cell = queue.shift(); cell; cell = queue.shift()) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = cell.x + dx
      const y = cell.y + dy
      if (isOpen(x, y) && !reached[y * width + x]) {
        reached[y * width + x] = true
        queue.push({ x, y })
      }
    }
  }
  const cells = Array.from({ length: width * height }, (_, index) => ({
    x: index % width,
    y: Math.floor(index / width),
  }))
  return { cells, isOpen, isReached: (x, y) => inside(x, y) && (reached[y * width + x] ?? false) }
}

function objects(map: TiledMap, name: string): TiledObject[] {
  return (
    map.layers.find(
      (layer): layer is TiledObjectLayer => layer.type === 'objectgroup' && layer.name === name,
    )?.objects ?? []
  )
}

function tileOf(object: TiledObject): Cell {
  return { x: Math.floor(object.x / TILE_SIZE), y: Math.floor((object.y - 1) / TILE_SIZE) }
}

/** Whether someone standing in the middle of `cell` is within REACH of an interactable, as the scene measures from the feet. */
function canUse(cell: Cell, object: TiledObject): boolean {
  const feet = { x: cell.x * TILE_SIZE + TILE_SIZE / 2, y: cell.y * TILE_SIZE + TILE_SIZE / 2 }
  const dx = Math.max(object.x - feet.x, 0, feet.x - (object.x + object.width))
  const dy = Math.max(object.y - feet.y, 0, feet.y - (object.y + object.height))
  return Math.hypot(dx, dy) <= REACH
}
