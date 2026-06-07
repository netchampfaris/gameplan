import { setCollisionTile, type MapDimensions } from './tiled.ts'

export type Edge = 'top' | 'bottom' | 'left' | 'right'

export interface Doorway {
  edge: Edge
  // Distance, in tiles, from the start of the edge (left for top/bottom,
  // top for left/right) to the first gap tile.
  offset: number
  // Gap width in tiles.
  width: number
}

/**
 * The LimeZu "3D" wall family, extracted from the Generic_Home_1 example
 * (see maps/design-reference/DESIGN-GRAMMAR.md). Horizontal walls are a
 * 2-row south-facing band; vertical walls are a 1-column body whose corner,
 * T-junction, and end tiles are picked automatically from the neighbourhood.
 */
export interface WallKit {
  // Horizontal band: face run plus caps where a run starts/ends beside floor.
  faceTop: number
  faceBottom: number
  runStartTop: number
  runStartBottom: number
  runEndTop: number
  runEndBottom: number
  // 1-wide south face shown where a vertical wall ends above open floor
  // (doorway gaps); museum example stacks these two tiles.
  stubTop: number
  stubBottom: number
  // Vertical bodies: east-facing walls show their beveled face to the east
  // (rooms to their right), west-facing the mirror.
  bodyEast: number
  bodyWest: number
  // Junction pairs where a horizontal band crosses or caps a vertical column.
  nwTop: number
  neTop: number
  tEastTop: number
  tWestTop: number
  eastBottom: number
  westBottom: number
}

/**
 * Room_Builder floors ship as 3x2 shadow-variant kits, not seamless swatches:
 * top row = corner-shadow / top-shadow / shadow-runout, bottom row =
 * left-shadow / plain field. Painting picks the variant from the walls around
 * each cell; tiling all six tiles (the old behaviour) bakes stray shadow
 * seams across open floor.
 */
export interface FloorKit {
  topLeft: number
  top: number
  topFade: number
  left: number
  plain: number
}

export interface Room {
  rect: { x: number; y: number; width: number; height: number }
  floorKit: FloorKit
  // Which edges to paint. Defaults to all four when omitted.
  walls?: Edge[]
  doorways?: Doorway[]
}

const EAST = 1
const WEST = 2

/**
 * Wall masks for a whole map plus the painters that depend on them. Walls are
 * resolved globally (not per room) so shared partitions, junctions, and floor
 * shadows all agree on where walls actually are.
 */
export class WallPlan {
  private readonly horizontal: boolean[]
  private readonly vertical: number[]
  private readonly dimensions: MapDimensions

  constructor(rooms: Room[], dimensions: MapDimensions) {
    this.dimensions = dimensions
    this.horizontal = new Array(dimensions.width * dimensions.height).fill(false)
    this.vertical = new Array(dimensions.width * dimensions.height).fill(0)
    for (const room of rooms) {
      this.markRoom(room)
    }
  }

  private index(x: number, y: number) {
    return y * this.dimensions.width + x
  }

  private inBounds(x: number, y: number) {
    return x >= 0 && x < this.dimensions.width && y >= 0 && y < this.dimensions.height
  }

  isWall(x: number, y: number) {
    // Outside the map counts as wall so map-edge runs do not grow caps.
    if (!this.inBounds(x, y)) return true
    return this.horizontal[this.index(x, y)] || this.vertical[this.index(x, y)] !== 0
  }

  private isHorizontal(x: number, y: number) {
    return this.inBounds(x, y) && this.horizontal[this.index(x, y)]
  }

  private verticalFacing(x: number, y: number) {
    if (!this.inBounds(x, y)) return 0
    return this.vertical[this.index(x, y)]
  }

  // Floor shadows fall south of walls and east of east-facing vertical walls
  // (matching the baked shadows in the example layouts).
  castsShadowEast(x: number, y: number) {
    return this.verticalFacing(x, y) === EAST
  }

  private markRoom(room: Room) {
    const { rect } = room
    const edges = room.walls ?? ['top', 'bottom', 'left', 'right']
    const doorways = room.doorways ?? []

    const gap = (edge: Edge, position: number) =>
      doorways.some(
        (doorway) =>
          doorway.edge === edge &&
          position >= doorway.offset &&
          position < doorway.offset + doorway.width,
      )

    if (edges.includes('top')) {
      for (let column = 0; column < rect.width; column += 1) {
        if (gap('top', column)) continue
        this.horizontal[this.index(rect.x + column, rect.y)] = true
        this.horizontal[this.index(rect.x + column, rect.y + 1)] = true
      }
    }
    if (edges.includes('bottom')) {
      for (let column = 0; column < rect.width; column += 1) {
        if (gap('bottom', column)) continue
        this.horizontal[this.index(rect.x + column, rect.y + rect.height - 2)] = true
        this.horizontal[this.index(rect.x + column, rect.y + rect.height - 1)] = true
      }
    }
    if (edges.includes('left')) {
      for (let row = 0; row < rect.height; row += 1) {
        if (gap('left', row)) continue
        this.vertical[this.index(rect.x, rect.y + row)] = EAST
      }
    }
    if (edges.includes('right')) {
      for (let row = 0; row < rect.height; row += 1) {
        if (gap('right', row)) continue
        this.vertical[this.index(rect.x + rect.width - 1, rect.y + row)] = WEST
      }
    }
  }

  /** Resolve and paint every wall cell into a tile layer. */
  paintWalls(layer: number[], kit: WallKit) {
    const { width, height } = this.dimensions
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const facing = this.verticalFacing(x, y)
        if (facing !== 0) {
          layer[this.index(x, y)] = this.verticalTile(x, y, facing, kit)
        } else if (this.isHorizontal(x, y)) {
          layer[this.index(x, y)] = this.horizontalTile(x, y, kit)
        }
      }
    }
  }

  private verticalTile(x: number, y: number, facing: number, kit: WallKit) {
    if (this.isHorizontal(x, y)) {
      // A horizontal band crosses this column: junction pair. The band is two
      // rows; the upper row carries the trim piece, the lower the bevel.
      const isTopRow = !this.isHorizontal(x, y - 1)
      if (!isTopRow) return facing === EAST ? kit.eastBottom : kit.westBottom
      const bandWest = this.isHorizontal(x - 1, y)
      const bandEast = this.isHorizontal(x + 1, y)
      if (facing === EAST) {
        return bandEast && !bandWest ? kit.nwTop : kit.tEastTop
      }
      return bandWest && !bandEast ? kit.neTop : kit.tWestTop
    }
    // Pure column cell: show the south face stub where the run ends above
    // open floor (doorway gaps and free-standing ends).
    if (!this.isWall(x, y + 1)) return kit.stubBottom
    if (!this.isWall(x, y + 2) && !this.isHorizontal(x, y + 1)) return kit.stubTop
    return facing === EAST ? kit.bodyEast : kit.bodyWest
  }

  private horizontalTile(x: number, y: number, kit: WallKit) {
    const isTopRow = !this.isHorizontal(x, y - 1)
    const wallWest = this.isWall(x - 1, y)
    const wallEast = this.isWall(x + 1, y)
    if (!wallWest) return isTopRow ? kit.runStartTop : kit.runStartBottom
    if (!wallEast) return isTopRow ? kit.runEndTop : kit.runEndBottom
    return isTopRow ? kit.faceTop : kit.faceBottom
  }

  /**
   * Paint a room's floor, picking shadow variants from the resolved walls:
   * top shadow south of any wall, left shadow east of an east-facing vertical
   * wall, the corner tile where both apply. Wall cells get plain fill so
   * doorway thresholds and wall underlays never show holes.
   */
  paintFloor(layer: number[], room: Room) {
    const { rect, floorKit } = room
    for (let row = 0; row < rect.height; row += 1) {
      for (let column = 0; column < rect.width; column += 1) {
        const x = rect.x + column
        const y = rect.y + row
        let tile = floorKit.plain
        if (!this.isWall(x, y)) {
          const shadowNorth = this.isWall(x, y - 1)
          const shadowWest = this.castsShadowEast(x - 1, y)
          if (shadowNorth && shadowWest) tile = floorKit.topLeft
          else if (shadowNorth) tile = floorKit.top
          else if (shadowWest) tile = floorKit.left
        }
        layer[this.index(x, y)] = tile
      }
    }
  }

  applyCollision(collisionLayer: number[]) {
    const { width, height } = this.dimensions
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (this.horizontal[this.index(x, y)] || this.vertical[this.index(x, y)] !== 0) {
          setCollisionTile(collisionLayer, x, y, this.dimensions)
        }
      }
    }
  }
}
