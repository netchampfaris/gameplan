import {
  applyPlacements,
  createCollisionLayer,
  setCollisionTile,
  type MapDimensions,
  type Placement,
  type Prefab,
} from './tiled.ts'

export type Edge = 'top' | 'bottom' | 'left' | 'right'

export interface Doorway {
  edge: Edge
  // Distance, in tiles, from the start of the edge (left for top/bottom,
  // top for left/right) to the first gap tile.
  offset: number
  // Gap width in tiles.
  width: number
}

// A wall style describes how to paint a room's perimeter. Only the segments
// needed by the current rooms are required; missing edges are simply not
// painted, which lets the common room express its single top wall faithfully.
export interface WallStyle {
  // Horizontal wall segment, repeated along top/bottom edges. Its tile width
  // must divide the room width minus doorway gaps cleanly for top/bottom edges
  // (the common room tiles a 4-wide segment across a 20-wide room).
  horizontal: Prefab
}

export interface Room {
  rect: { x: number; y: number; width: number; height: number }
  floorPattern: number[][]
  wallStyle: WallStyle
  // Which edges to paint. Defaults to all four when omitted.
  walls?: Edge[]
  doorways?: Doorway[]
}

interface PaintedWalls {
  // Placements to apply onto the Floor layer (walls are painted into floor so
  // furniture can overlap them on the objects layers).
  floorPlacements: Placement[]
  // Collision applied directly to the collision layer (per-tile), so wall
  // gaps for doorways stay walkable.
  applyCollision: (collisionLayer: number[], dimensions: MapDimensions) => void
}

function isGap(position: number, doorways: Doorway[], edge: Edge): boolean {
  return doorways.some(
    (doorway) =>
      doorway.edge === edge && position >= doorway.offset && position < doorway.offset + doorway.width,
  )
}

/**
 * Paint a room's walls into the Floor layer and emit wall collision, leaving
 * gaps where doorways are declared. Mirrors how the common room previously
 * tiled its top wall segment manually, but generalised to any edge.
 */
export function paintRoomWalls(room: Room): PaintedWalls {
  const { rect, wallStyle } = room
  const edges = room.walls ?? ['top', 'bottom', 'left', 'right']
  const doorways = room.doorways ?? []
  const floorPlacements: Placement[] = []

  const segment = wallStyle.horizontal
  const segmentWidth = segment.tiles[0]?.length ?? 1
  const segmentHeight = segment.tiles.length

  // Track which perimeter tiles are solid so collision matches painted walls.
  const solidTiles: Array<{ x: number; y: number }> = []

  const markSegmentCollision = (originX: number, originY: number) => {
    segment.tiles.forEach((tileRow, rowIndex) => {
      tileRow.forEach((tileGid, columnIndex) => {
        if (tileGid === 0) return
        solidTiles.push({ x: originX + columnIndex, y: originY + rowIndex })
      })
    })
  }

  if (edges.includes('top')) {
    for (let column = 0; column < rect.width; column += segmentWidth) {
      if (isGap(column, doorways, 'top')) continue
      const originX = rect.x + column
      const originY = rect.y
      floorPlacements.push({ prefab: segment, x: originX, y: originY })
      markSegmentCollision(originX, originY)
    }
  }

  if (edges.includes('bottom')) {
    for (let column = 0; column < rect.width; column += segmentWidth) {
      if (isGap(column, doorways, 'bottom')) continue
      const originX = rect.x + column
      const originY = rect.y + rect.height - segmentHeight
      floorPlacements.push({ prefab: segment, x: originX, y: originY })
      markSegmentCollision(originX, originY)
    }
  }

  if (edges.includes('left')) {
    for (let row = 0; row < rect.height; row += segmentHeight) {
      if (isGap(row, doorways, 'left')) continue
      const originX = rect.x
      const originY = rect.y + row
      floorPlacements.push({ prefab: segment, x: originX, y: originY })
      markSegmentCollision(originX, originY)
    }
  }

  if (edges.includes('right')) {
    for (let row = 0; row < rect.height; row += segmentHeight) {
      if (isGap(row, doorways, 'right')) continue
      const originX = rect.x + rect.width - segmentWidth
      const originY = rect.y + row
      floorPlacements.push({ prefab: segment, x: originX, y: originY })
      markSegmentCollision(originX, originY)
    }
  }

  const applyCollision = (collisionLayer: number[], dimensions: MapDimensions) => {
    for (const tile of solidTiles) {
      setCollisionTile(collisionLayer, tile.x, tile.y, dimensions)
    }
  }

  return { floorPlacements, applyCollision }
}

// Convenience re-exports so layout modules import room helpers from one place.
export { applyPlacements, createCollisionLayer }
