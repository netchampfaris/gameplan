import { createEmptyLayer, gid, type MapDimensions } from './tiled.ts'

/**
 * Rooms: wallpapered walls and shadowed floors, built from Room_Builder kits.
 * See design-reference/DESIGN-GRAMMAR.md for where every tile id comes from.
 *
 * A room is drawn the way the LimeZu example designs draw one:
 *
 *   ┌┬──────────────┬┐  top wall: 3 rows of wallpaper (band, plain, baseboard)
 *   ││ wallpaper    ││  side walls: 1 column of the matching "3D" kit, whose
 *   ││──────────────││  corner pieces show the wallpaper in perspective
 *   ││ floor        ││
 *   └┴──────────────┴┘  bottom wall: a thin white band
 *
 * Rooms stack: a room below another uses its own top wall as the partition, and
 * its side columns join the columns above.
 */

/** How tall a room's top wall is, in tiles. Wall decor is sized to fit it. */
export const WALL_HEIGHT = 3
/** Width of a doorway through a top wall, in tiles. */
export const DOOR_WIDTH = 2

const ROOM_BUILDER_COLUMNS = 76
const rb = (row: number, column: number) => gid('room_builder', row * ROOM_BUILDER_COLUMNS + column)

interface Run {
  start: number
  mid: number
  end: number
}

interface SideWall {
  /** The three top-wall rows of the column where it starts at this room's top wall. */
  corner: [number, number, number]
  /** The same rows where the column continues a wall column from the room above. */
  joined: [number, number, number]
  /** Every row below the top wall. */
  body: number
}

export interface Wallpaper {
  /** Top wall rows, top to bottom. `start`/`end` close a run beside a doorway. */
  face: [Run, Run, Run]
  left: SideWall
  right: SideWall
}

interface SheetPosition {
  row: number
  column: number
}

/**
 * Pair a wallpaper swatch with the "3D" side-wall kit drawn in the same colour.
 *
 * Swatches are 10 x 2 blocks at columns 0, 11 and 22 of rows 11 to 46: the top
 * row holds the band (start, mid, end) at +0..2 and the plain pattern (start,
 * mid, end) at +4..6; the second row holds the baseboard at +0..2. Kits are
 * 8 x 7 blocks at columns 44, 52 and 60; offsets below are (column, row) from
 * the block's corner.
 */
function wallpaper(swatch: SheetPosition, kit: SheetPosition): Wallpaper {
  const s = (row: number, column: number) => rb(swatch.row + row, swatch.column + column)
  const k = (column: number, row: number) => rb(kit.row + row, kit.column + column)
  return {
    face: [
      { start: s(0, 0), mid: s(0, 1), end: s(0, 2) },
      { start: s(0, 4), mid: s(0, 5), end: s(0, 6) },
      { start: s(1, 0), mid: s(1, 1), end: s(1, 2) },
    ],
    left: { corner: [k(1, 1), k(1, 2), k(1, 3)], joined: [k(1, 0), k(1, 2), k(1, 3)], body: k(2, 2) },
    right: { corner: [k(6, 1), k(6, 2), k(6, 3)], joined: [k(6, 0), k(6, 2), k(6, 3)], body: k(5, 2) },
  }
}

/**
 * Wallpapers by stable id (saved Home layouts store the id). Each swatch was
 * pixel-matched to its kit, so corners and faces meet without a seam.
 */
export const wallpapers = {
  'wood-stripes': wallpaper({ row: 17, column: 11 }, { row: 82, column: 44 }),
  'brown': wallpaper({ row: 25, column: 11 }, { row: 54, column: 44 }),
  'beige-trim': wallpaper({ row: 33, column: 0 }, { row: 75, column: 52 }),
  'cream': wallpaper({ row: 23, column: 0 }, { row: 75, column: 60 }),
  'white-diamonds': wallpaper({ row: 11, column: 0 }, { row: 68, column: 44 }),
  'gray': wallpaper({ row: 15, column: 0 }, { row: 54, column: 52 }),
  'charcoal': wallpaper({ row: 45, column: 0 }, { row: 61, column: 52 }),
  'lavender': wallpaper({ row: 41, column: 11 }, { row: 54, column: 60 }),
  'blue': wallpaper({ row: 45, column: 11 }, { row: 61, column: 60 }),
  'light-blue': wallpaper({ row: 19, column: 22 }, { row: 90, column: 60 }),
  'teal': wallpaper({ row: 23, column: 22 }, { row: 90, column: 52 }),
  'sage': wallpaper({ row: 31, column: 22 }, { row: 90, column: 44 }),
  'red': wallpaper({ row: 43, column: 11 }, { row: 82, column: 60 }),
} satisfies Record<string, Wallpaper>

export type WallpaperId = keyof typeof wallpapers

// The thin bottom wall is colour-neutral white, shared by every wallpaper.
const BOTTOM_WALL: Run = { start: rb(59, 46), mid: rb(59, 47), end: rb(59, 49) }

/**
 * Room_Builder floors ship as 3 x 2 shadow-variant kits, not seamless swatches:
 * top row = corner shadow / top shadow / shadow runout, bottom row = left
 * shadow / plain. The painter picks the variant from the walls around a cell.
 */
export interface Floor {
  topLeft: number
  top: number
  left: number
  plain: number
}

const floor = (topLeftId: number): Floor => ({
  topLeft: gid('room_builder', topLeftId),
  top: gid('room_builder', topLeftId + 1),
  left: gid('room_builder', topLeftId + ROOM_BUILDER_COLUMNS),
  plain: gid('room_builder', topLeftId + ROOM_BUILDER_COLUMNS + 1),
})

/** Floors by stable id (saved Home layouts store the id). */
export const floors = {
  'golden-wood': floor(1630),
  'diagonal-wood': floor(2998),
  'parquet': floor(1634),
  'stone-tile': floor(3314),
  'dark-stone': floor(2098),
  'beige-squares': floor(874),
  'medallion': floor(2246),
} satisfies Record<string, Floor>

export type FloorId = keyof typeof floors

export interface Room {
  id: string
  /** Outer bounds in tiles, walls included. The floor starts WALL_HEIGHT rows down. */
  x: number
  y: number
  width: number
  height: number
  wallpaper: WallpaperId
  floor: FloorId
  /** Left x of each DOOR_WIDTH-wide opening through the top wall, from the room's left edge. */
  doors?: number[]
  /** Paint the thin bottom wall. Off when the room below closes this one with its top wall. */
  bottomWall?: boolean
  /** Left x of each DOOR_WIDTH-wide opening through the bottom wall, from the room's left edge. */
  bottomDoors?: number[]
}

/** What a map cell is once rooms are painted: outside every room, wall, or walkable floor. */
export type Cell = 'void' | 'wall' | 'floor'

type Part =
  | { kind: 'floor' }
  | { kind: 'door' }
  | { kind: 'face'; row: number }
  | { kind: 'side'; side: 'left' | 'right'; row: number }
  | { kind: 'bottom' }

export interface Ground {
  /** The Floor tile layer: floors and walls. */
  tiles: number[]
  cells: Cell[]
}

/**
 * Paint rooms into a Floor layer. Rooms may share edges but must not overlap
 * otherwise: a room's top wall can close the room above, and two rooms side by
 * side can share one side column. Where they share cells, the later room in the
 * list paints them.
 */
export function paintGround(rooms: Room[], dimensions: MapDimensions): Ground {
  const { width, height } = dimensions
  const index = (x: number, y: number) => y * width + x
  const inside = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height
  const owners = new Array<{ room: Room; part: Part } | undefined>(width * height)

  for (const room of rooms) {
    const doors = room.doors ?? []
    const bottomWall = room.bottomWall ?? true
    const inDoor = (openings: number[], x: number) =>
      openings.some((door) => x - room.x >= door && x - room.x < door + DOOR_WIDTH)
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        if (!inside(x, y)) throw new Error(`Room ${room.id} runs off the map at ${x},${y}`)
        const row = y - room.y
        const side = x === room.x ? 'left' : x === room.x + room.width - 1 ? 'right' : undefined
        let part: Part
        if (bottomWall && y === room.y + room.height - 1) part = { kind: inDoor(room.bottomDoors ?? [], x) ? 'door' : 'bottom' }
        else if (side) part = { kind: 'side', side, row }
        else if (row < WALL_HEIGHT && inDoor(doors, x)) part = { kind: 'door' }
        else if (row < WALL_HEIGHT) part = { kind: 'face', row }
        else part = { kind: 'floor' }
        owners[index(x, y)] = { room, part }
      }
    }
  }

  const cellAt = (x: number, y: number): Cell => {
    const owner = inside(x, y) ? owners[index(x, y)] : undefined
    if (!owner) return 'void'
    return owner.part.kind === 'floor' || owner.part.kind === 'door' ? 'floor' : 'wall'
  }
  const isSide = (x: number, y: number) => inside(x, y) && owners[index(x, y)]?.part.kind === 'side'
  const isLeftSide = (x: number, y: number) => {
    const part = inside(x, y) ? owners[index(x, y)]?.part : undefined
    return part?.kind === 'side' && part.side === 'left'
  }

  const tiles = createEmptyLayer(dimensions)
  const cells = new Array<Cell>(width * height).fill('void')
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const owner = owners[index(x, y)]
      if (!owner) continue
      const { room, part } = owner
      const kit = wallpapers[room.wallpaper]
      const ground = floors[room.floor]
      cells[index(x, y)] = cellAt(x, y)
      let tile: number
      switch (part.kind) {
        case 'floor': {
          const shadowNorth = cellAt(x, y - 1) === 'wall'
          const shadowWest = isLeftSide(x - 1, y)
          tile = shadowNorth && shadowWest ? ground.topLeft : shadowNorth ? ground.top : shadowWest ? ground.left : ground.plain
          break
        }
        case 'door':
          tile = ground.plain
          break
        case 'face': {
          const run = kit.face[part.row]
          // A run closes beside a doorway, where floor shows through the wall.
          if (cellAt(x - 1, y) === 'floor') tile = run.start
          else if (cellAt(x + 1, y) === 'floor') tile = run.end
          else tile = run.mid
          break
        }
        case 'side': {
          const wall = kit[part.side]
          if (part.row >= WALL_HEIGHT) tile = wall.body
          else tile = (isSide(x, room.y - 1) ? wall.joined : wall.corner)[part.row]
          break
        }
        case 'bottom':
          tile = x === room.x ? BOTTOM_WALL.start : x === room.x + room.width - 1 ? BOTTOM_WALL.end : BOTTOM_WALL.mid
          break
      }
      tiles[index(x, y)] = tile
    }
  }
  return { tiles, cells }
}
