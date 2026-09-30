import { PackFiles } from '../config/packFiles.ts'
import { INTERACTABLES_LAYER } from '../world/interactables.ts'
import { prefabs, prefabSize, type Prefab, type PrefabId } from './prefabs.ts'
import { paintGround, type Cell, type Room } from './rooms.ts'
import {
  createObjectLayer,
  createTiledMap,
  createTileLayer,
  TILE_SIZE,
  type MapDimensions,
  type TiledMap,
  type TiledObject,
  type TiledProperty,
} from './tiled.ts'

/**
 * Turns rooms and prefab placements into the Tiled map the scene loads. Runs in
 * Node for the world map and in the browser for Homes, so it must stay free of
 * Node-only APIs.
 */

/** One prefab in a room, in tiles from the room's top-left corner (walls included). */
export interface Placement {
  prefab: PrefabId
  x: number
  y: number
  /** Stable id for the interactable. Defaults to `<prefab>-<x>-<y>` in map tiles. */
  id?: string
  /** Replaces the prefab's own prompt, e.g. "Play Pong". */
  label?: string
}

/** A named place to appear, in tiles from the room's top-left corner. */
export interface SpawnPoint {
  name: string
  x: number
  y: number
}

export interface RoomLayout {
  room: Room
  placements: Placement[]
  spawns?: SpawnPoint[]
}

export interface MapLayout extends MapDimensions {
  rooms: RoomLayout[]
}

export const SPAWN_LAYER = 'Spawn Points'
// Read by world/props.ts, which cannot be imported here: it pulls in Vite-only asset URLs.
export const ANIMATED_PROPS_LAYER = 'Animated Props'

/** Why a placement does not fit, for editors that explain it (the Home decorator). */
export type LayoutProblem = 'overlap' | 'off-floor' | 'off-wall'

export class LayoutError extends Error {
  readonly problem: LayoutProblem

  constructor(problem: LayoutProblem, message: string) {
    super(message)
    this.problem = problem
  }
}

// Any tile id marks a collision cell; the scene collides with every non-empty tile.
const COLLIDES = 1

// A tile layer being filled in. Refuses to put two tiles in one cell, so
// overlapping placements fail loudly instead of hiding each other.
class Grid {
  readonly name: string
  readonly data: number[]
  private readonly dimensions: MapDimensions

  constructor(name: string, dimensions: MapDimensions) {
    this.name = name
    this.dimensions = dimensions
    this.data = new Array<number>(dimensions.width * dimensions.height).fill(0)
  }

  get(x: number, y: number): number {
    return this.data[y * this.dimensions.width + x] ?? 0
  }

  set(x: number, y: number, tile: number, owner: string) {
    const index = y * this.dimensions.width + x
    if (this.data[index]) throw new LayoutError('overlap', `${owner} overlaps another tile on ${this.name} at ${x},${y}`)
    this.data[index] = tile
  }
}

interface Placed {
  placement: Placement
  prefab: Prefab
  /** Map tiles. */
  x: number
  y: number
  width: number
  height: number
  owner: string
}

export function composeMap(layout: MapLayout): TiledMap {
  const dimensions = { width: layout.width, height: layout.height }
  const { width, height } = dimensions
  const ground = paintGround(
    layout.rooms.map(({ room }) => room),
    dimensions,
  )
  const cellAt = (x: number, y: number): Cell =>
    x >= 0 && x < width && y >= 0 && y < height ? (ground.cells[y * width + x] ?? 'void') : 'void'

  const placed: Placed[] = layout.rooms.flatMap(({ room, placements }) =>
    placements.map((placement) => {
      const prefab: Prefab = prefabs[placement.prefab]
      const size = prefabSize(prefab)
      const x = room.x + placement.x
      const y = room.y + placement.y
      return { placement, prefab, x, y, ...size, owner: `${placement.prefab} at ${x},${y} (${room.id})` }
    }),
  )

  // Collision first: whether an upper tile draws above avatars depends on
  // whether anything collides beneath it.
  const collision = new Grid('Collision', dimensions)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (cellAt(x, y) !== 'floor') collision.set(x, y, COLLIDES, 'wall')
    }
  }
  for (const item of placed) {
    if (item.prefab.kind !== 'furniture') continue
    const footprint = item.prefab.footprint ?? item.height
    for (let row = item.height - footprint; row < item.height; row += 1) {
      for (let column = 0; column < item.width; column += 1) {
        // Empty cells of a tiled prefab stay walkable; a sprite, or anything else the game
        // draws itself, fills its whole footprint.
        if (!item.prefab.sprite && !item.prefab.solid && !item.prefab.tiles[row]?.[column]) continue
        const x = item.x + column
        const y = item.y + row
        if (cellAt(x, y) !== 'floor') throw new LayoutError('off-floor', `${item.owner} stands on a wall at ${x},${y}`)
        collision.set(x, y, COLLIDES, item.owner)
      }
    }
  }
  const walkable = (x: number, y: number) => cellAt(x, y) === 'floor' && !collision.get(x, y)

  const decor = new Grid('Decor', dimensions)
  const back = new Grid('Objects Back', dimensions)
  const front = new Grid('Objects Front', dimensions)
  const above = new Grid('Above', dimensions)

  for (const item of placed) {
    const { prefab } = item
    const footprintTop = item.height - (prefab.footprint ?? item.height)
    const draw = (tiles: number[][], standing: Grid, frontOnly: boolean) =>
      tiles.forEach((row, rowIndex) =>
        row.forEach((tile, column) => {
          if (!tile) return
          const x = item.x + column
          const y = item.y + rowIndex
          const cell = cellAt(x, y)
          if (prefab.kind === 'rug') {
            if (cell !== 'floor') throw new LayoutError('off-floor', `${item.owner} lies on a wall at ${x},${y}`)
            decor.set(x, y, tile, item.owner)
          } else if (prefab.kind === 'wall') {
            if (cell !== 'wall') throw new LayoutError('off-wall', `${item.owner} hangs off the wall at ${x},${y}`)
            decor.set(x, y, tile, item.owner)
          } else {
            // Upper rows over open floor hide whoever walks behind them.
            const upper = frontOnly || rowIndex < footprintTop
            const target = upper && walkable(x, y) ? above : standing
            target.set(x, y, tile, item.owner)
          }
        }),
      )
    draw(prefab.tiles, prefab.kind === 'tabletop' ? front : back, prefab.kind === 'tabletop')
    if (prefab.overlay) draw(prefab.overlay, front, true)
  }

  // ---- Objects ---------------------------------------------------------------

  let nextObjectId = 1
  const object = (fields: Omit<TiledObject, 'id' | 'visible'>): TiledObject => ({
    id: nextObjectId++,
    visible: true,
    ...fields,
  })
  const string = (name: string, value: string): TiledProperty => ({ name, type: 'string', value })
  const int = (name: string, value: number): TiledProperty => ({ name, type: 'int', value })

  const spawns = layout.rooms.flatMap(({ room, spawns = [] }) =>
    spawns.map((spawn) =>
      object({
        name: spawn.name,
        type: 'spawn',
        // Feet position: centred, and low enough in the tile for the body to fit.
        x: (room.x + spawn.x) * TILE_SIZE + TILE_SIZE / 2,
        y: (room.y + spawn.y) * TILE_SIZE + (TILE_SIZE * 3) / 4,
        width: 0,
        height: 0,
        point: true,
      }),
    ),
  )

  const interactables: TiledObject[] = []
  for (const item of placed) {
    const { prefab, placement } = item
    const id = placement.id ?? `${placement.prefab}-${item.x}-${item.y}`
    prefab.seats?.forEach((seat, index) => {
      interactables.push(
        object({
          name: prefab.seats && prefab.seats.length > 1 ? `${id}-seat-${index + 1}` : `${id}-seat`,
          type: 'seat',
          x: (item.x + seat.x) * TILE_SIZE,
          y: (item.y + seat.y) * TILE_SIZE,
          width: (seat.width ?? 1) * TILE_SIZE,
          height: TILE_SIZE,
          properties: seat.facing ? [string('facing', seat.facing)] : undefined,
        }),
      )
    })
    if (prefab.use) {
      const area = reachDown(item, walkable, height)
      interactables.push(
        object({
          name: id,
          type: prefab.use.kind,
          x: area.x * TILE_SIZE,
          y: area.y * TILE_SIZE,
          width: area.width * TILE_SIZE,
          height: area.height * TILE_SIZE,
          properties: placement.label ? [string('label', placement.label)] : undefined,
        }),
      )
    }
  }

  const props = placed.flatMap((item) => {
    const sprite = item.prefab.sprite
    if (!sprite) return []
    return [
      object({
        name: item.placement.id ?? `${item.placement.prefab}-${item.x}-${item.y}`,
        type: sprite.sheet,
        x: item.x * TILE_SIZE,
        y: item.y * TILE_SIZE,
        width: item.width * TILE_SIZE,
        height: item.height * TILE_SIZE,
        properties: [
          string('image', PackFiles.props[sprite.sheet]),
          int('frameWidth', item.width * TILE_SIZE),
          int('frameHeight', item.height * TILE_SIZE),
          int('frames', sprite.frames),
          int('fps', sprite.fps),
        ],
      }),
    ]
  })

  let layerId = 1
  const tileLayer = (grid: Grid, options: { visible?: boolean; collision?: boolean } = {}) =>
    createTileLayer({ id: layerId++, name: grid.name, data: grid.data, dimensions, ...options })
  const layers = [
    createTileLayer({ id: layerId++, name: 'Floor', data: ground.tiles, dimensions }),
    tileLayer(decor),
    tileLayer(back),
    tileLayer(front),
    tileLayer(above),
    tileLayer(collision, { visible: false, collision: true }),
    createObjectLayer(layerId++, SPAWN_LAYER, spawns),
    createObjectLayer(layerId++, INTERACTABLES_LAYER, interactables),
    createObjectLayer(layerId++, ANIMATED_PROPS_LAYER, props),
  ]
  return createTiledMap(layers, nextObjectId, dimensions)
}

/**
 * The area of a prefab you can use, in map tiles. Things mounted on a wall or
 * standing on a counter are out of reach from the floor, so their area extends
 * down until it borders a walkable cell.
 */
function reachDown(
  item: Placed,
  walkable: (x: number, y: number) => boolean,
  mapHeight: number,
): { x: number; y: number; width: number; height: number } {
  const area = { x: item.x, y: item.y, width: item.width, height: item.height }
  const bordersFloor = () => {
    for (let x = area.x - 1; x <= area.x + area.width; x += 1) {
      for (let y = area.y - 1; y <= area.y + area.height; y += 1) {
        const corner = (x < area.x || x >= area.x + area.width) && (y < area.y || y >= area.y + area.height)
        if (!corner && walkable(x, y)) return true
      }
    }
    return false
  }
  while (!bordersFloor() && area.y + area.height < mapHeight) area.height += 1
  return area
}
