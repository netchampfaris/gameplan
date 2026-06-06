import {
  applyPlacements,
  createCollisionLayer,
  createEmptyLayer,
  createObjectPaletteLayer,
  createSpawnLayer,
  createTileLayer,
  createTiledMap,
  fillRectWithPattern,
  type MapDimensions,
  type Placement,
} from './tiled.ts'
import { paintRoomWalls, type Room } from './rooms.ts'
import { objectPalettePrefabs, prefabs, roomTiles } from './prefabs.ts'

const dimensions: MapDimensions = { width: 60, height: 40 }

// World is split into a center column (common room hub) flanked by two sealed
// rooms on the left and the café / game room on the right. Shared partition
// walls are owned by a single room so they never double up.
const COMMON = { x: 20, y: 0, width: 20, height: 40 }
const CAFE = { x: 40, y: 0, width: 20, height: 20 }
const GAME = { x: 40, y: 20, width: 20, height: 20 }
const LEFT_TOP = { x: 0, y: 0, width: 20, height: 20 }
const LEFT_BOTTOM = { x: 0, y: 20, width: 20, height: 20 }

// Doorway rows on the common room's right wall (room-local offsets from y=0).
const CAFE_DOOR = { edge: 'right' as const, offset: 8, width: 3 }
const GAME_DOOR = { edge: 'right' as const, offset: 28, width: 3 }

const wallStyle = { horizontal: prefabs.wallSegment, vertical: prefabs.wallVertical }

// The common room owns the vertical partitions it shares with its neighbours:
// the sealed left wall (no doorway) and the right wall with two doorways into
// the café and game room. Top and bottom edges give it finished walls so the
// room is fully sealed.
const commonRoom: Room = {
  rect: COMMON,
  floorPattern: roomTiles.floorPattern,
  wallStyle,
  walls: ['top', 'bottom', 'left', 'right'],
  doorways: [CAFE_DOOR, GAME_DOOR],
}

// Right-hand rooms skip their shared left wall (owned by the common room) so
// the doorways line up; the café also skips its bottom wall (shared divider,
// owned by the game room) so the two rooms read as a stacked pair.
const cafe: Room = {
  rect: CAFE,
  floorPattern: roomTiles.floorCafe,
  wallStyle,
  walls: ['top', 'right'],
}

const gameRoom: Room = {
  rect: GAME,
  floorPattern: roomTiles.floorGameRoom,
  wallStyle,
  // top edge is the café/game divider; bottom + right close the room.
  walls: ['top', 'bottom', 'right'],
}

// Sealed left rooms: full perimeter, no doorways. They share the common room's
// left wall, so they only paint their own top/bottom/left edges; the divider
// between them is owned by the top room's bottom edge.
const leftTop: Room = {
  rect: LEFT_TOP,
  floorPattern: roomTiles.floorSealed,
  wallStyle,
  walls: ['top', 'bottom', 'left'],
}

const leftBottom: Room = {
  rect: LEFT_BOTTOM,
  floorPattern: roomTiles.floorSealed,
  wallStyle,
  walls: ['bottom', 'left'],
}

const rooms = [commonRoom, cafe, gameRoom, leftTop, leftBottom]

// Common-room furniture in map coordinates. The original 20x15 arrangement is
// ported and extended down the taller (40-tall) room so it does not feel empty:
// a back identity wall, two lounge clusters, a reading nook, a long table, and
// greenery framing the space.
const cx = COMMON.x // 20

const backPlacements: Placement[] = [
  // back identity wall: plants flanking bookshelves with a fireplace centerpiece
  { prefab: prefabs.tallPlant, x: cx + 0, y: 1 },
  { prefab: prefabs.bookshelfWide, x: cx + 2, y: 0 },
  { prefab: prefabs.paintingLandscape, x: cx + 8, y: 1 },
  { prefab: prefabs.fireplace, x: cx + 9, y: 0 },
  { prefab: prefabs.paintingOrange, x: cx + 11, y: 1 },
  { prefab: prefabs.bookshelfWide, x: cx + 12, y: 0 },
  { prefab: prefabs.tallPlant, x: cx + 18, y: 1 },

  // upper lounge: couch + armchair around a coffee table (ported)
  { prefab: prefabs.armchairOrange, x: cx + 2, y: 6 },
  { prefab: prefabs.couchGray, x: cx + 4, y: 5 },
  { prefab: prefabs.lampBlue, x: cx + 7, y: 5 },
  { prefab: prefabs.coffeeTable, x: cx + 4, y: 8 },

  // upper chat nook on the right
  { prefab: prefabs.couchBrown, x: cx + 14, y: 6 },
  { prefab: prefabs.tableLamp, x: cx + 17, y: 6 },
  { prefab: prefabs.armchairOrange, x: cx + 13, y: 6 },

  // mid-room long table flanked by side tables and a plant
  { prefab: prefabs.coffeeTable, x: cx + 8, y: 18 },
  { prefab: prefabs.armchairOrange, x: cx + 6, y: 18 },
  { prefab: prefabs.armchairOrange, x: cx + 12, y: 18 },
  { prefab: prefabs.tallPlant, x: cx + 1, y: 17 },
  { prefab: prefabs.tallPlant, x: cx + 17, y: 17 },

  // lower lounge cluster mirrors the upper one to fill the bottom half
  { prefab: prefabs.couchBrown, x: cx + 3, y: 27 },
  { prefab: prefabs.armchairOrange, x: cx + 2, y: 27 },
  { prefab: prefabs.tableLamp, x: cx + 6, y: 27 },
  // right-hand lower lounge: gray couch with a coffee table in front and a
  // floor lamp to the side, spaced like the clean upper lounge.
  { prefab: prefabs.couchGray, x: cx + 12, y: 27 },
  { prefab: prefabs.lampBlue, x: cx + 15, y: 27 },
  { prefab: prefabs.coffeeTable, x: cx + 12, y: 30 },

  // greenery framing the lower corners (sits in front of the bottom wall)
  { prefab: prefabs.slimPlant, x: cx + 1, y: 35 },
  { prefab: prefabs.bookshelf, x: cx + 4, y: 35 },
  { prefab: prefabs.tallPlant, x: cx + 9, y: 35 },
  { prefab: prefabs.bookshelf, x: cx + 14, y: 35 },
  { prefab: prefabs.slimPlant, x: cx + 18, y: 35 },
]

// Game Room furniture in map coordinates. The room is GAME = {40,20,20,20};
// the doorway from the common room lands at x=40, y=28..30, kept clear. Pool
// table is the centerpiece with walk-around clearance, ping-pong in its own
// corner, arcade cabinets along the top wall, and a TV + bean-bag spectator
// corner along the bottom.
const gx = GAME.x // 40
const gy = GAME.y // 20

const gameRoomBack: Placement[] = [
  // arcade row along the top wall, facing down into the room
  { prefab: prefabs.arcadeCabinetBlue, x: gx + 13, y: gy + 1 },
  { prefab: prefabs.arcadeCabinetCyan, x: gx + 15, y: gy + 1 },
  { prefab: prefabs.arcadeCabinetRed, x: gx + 17, y: gy + 1 },

  // ping-pong table in the upper-left corner with its own clearance
  { prefab: prefabs.pingPongTable, x: gx + 2, y: gy + 3 },

  // pool table centerpiece, clear on every play side
  { prefab: prefabs.poolTable, x: gx + 7, y: gy + 8 },
  // stools flanking the pool table for players waiting their turn
  { prefab: prefabs.stoolYellow, x: gx + 6, y: gy + 12 },
  { prefab: prefabs.stoolRed, x: gx + 11, y: gy + 12 },

  // spectator corner: TV + media unit against the bottom wall
  { prefab: prefabs.tvMediaUnit, x: gx + 2, y: gy + 15 },
  // bean-bag poufs facing the TV
  { prefab: prefabs.poufCream, x: gx + 8, y: gy + 15 },
  { prefab: prefabs.poufTan, x: gx + 11, y: gy + 15 },
]

// Rugs anchor the seating clusters and mark the spawn carpet.
const decorPlacements: Placement[] = [
  { prefab: prefabs.carpetPurple, x: cx + 8, y: 9 },
  { prefab: prefabs.carpetBlue, x: cx + 13, y: 9 },
  // spawn carpet at the room's vertical centre
  { prefab: prefabs.carpetPurple, x: cx + 8, y: 21 },
  { prefab: prefabs.carpetRed, x: cx + 13, y: 30 },
  { prefab: prefabs.carpetBlue, x: cx + 4, y: 30 },
  // game room: rug under the pool table and matching rugs under each pouf
  { prefab: prefabs.carpetRed, x: gx + 8, y: gy + 9 },
  { prefab: prefabs.carpetBlue, x: gx + 8, y: gy + 16 },
  { prefab: prefabs.carpetBlue, x: gx + 11, y: gy + 16 },
]

const frontPlacements: Placement[] = [
  { prefab: prefabs.couchPillows, x: cx + 5, y: 5 },
  { prefab: prefabs.couchPillows, x: cx + 13, y: 27 },
  // game room flavour: a standing cue rack beside the pool table
  { prefab: prefabs.cueRack, x: gx + 12, y: gy + 9 },
  { prefab: prefabs.ballRack, x: gx + 6, y: gy + 10 },
]

// Spawn on the centre purple carpet of the common room.
const spawnPoints = [
  { name: 'spawn-center', x: cx + 9, y: 22 },
  { name: 'spawn-left', x: cx + 8, y: 23 },
  { name: 'spawn-right', x: cx + 10, y: 23 },
]

// All furniture that renders on the Objects Back layer and contributes solid
// collision, across every furnished room.
const allBackPlacements = [...backPlacements, ...gameRoomBack]

export function buildWorldMap() {
  const floorLayer = createEmptyLayer(dimensions)
  const decorLayer = createEmptyLayer(dimensions)
  const objectsBackLayer = createEmptyLayer(dimensions)
  const objectsFrontLayer = createEmptyLayer(dimensions)
  const collisionLayer = createCollisionLayer(allBackPlacements, dimensions)

  for (const room of rooms) {
    fillRectWithPattern(floorLayer, room.floorPattern, room.rect, dimensions)
  }

  for (const room of rooms) {
    const walls = paintRoomWalls(room)
    applyPlacements(floorLayer, walls.floorPlacements, dimensions)
    walls.applyCollision(collisionLayer, dimensions)
  }

  applyPlacements(decorLayer, decorPlacements, dimensions)
  applyPlacements(objectsBackLayer, allBackPlacements, dimensions)
  applyPlacements(objectsFrontLayer, frontPlacements, dimensions)

  const layers = [
    createTileLayer({ id: 1, name: 'Floor', data: floorLayer, dimensions }),
    createTileLayer({ id: 2, name: 'Decor', data: decorLayer, dimensions }),
    createTileLayer({ id: 3, name: 'Objects Back', data: objectsBackLayer, dimensions }),
    createTileLayer({ id: 4, name: 'Objects Front', data: objectsFrontLayer, dimensions }),
    createTileLayer({
      id: 5,
      name: 'Collision',
      data: collisionLayer,
      dimensions,
      visible: false,
      opacity: 0.45,
      collision: true,
    }),
    createSpawnLayer(6, spawnPoints),
    createObjectPaletteLayer(7, objectPalettePrefabs),
  ]

  return createTiledMap(layers, objectPalettePrefabs.length + spawnPoints.length + 1, dimensions)
}
