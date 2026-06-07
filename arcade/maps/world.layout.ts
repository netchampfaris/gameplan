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

// Doorway in the common room's left wall, upper half, opening into the Library.
// The common room owns this shared partition, so the gap is cut here; the
// Library paints no right wall, leaving both sides walkable.
const LIBRARY_DOOR = { edge: 'left' as const, offset: 8, width: 3 }

// Doorway in the common room's left wall, lower half, opening into the
// Conference Hall. Same ownership rule: the gap is cut in the common room's
// left wall and the Conference Hall paints no right wall.
const CONFERENCE_DOOR = { edge: 'left' as const, offset: 28, width: 3 }

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
  doorways: [CAFE_DOOR, GAME_DOOR, LIBRARY_DOOR, CONFERENCE_DOOR],
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

// Library / Focus Room (top-left). Shares the common room's left wall (which
// carries the Library doorway), so it paints only its own top/bottom/left
// edges; the divider with the room below is owned by its bottom edge.
const library: Room = {
  rect: LEFT_TOP,
  floorPattern: roomTiles.floorLibrary,
  wallStyle,
  walls: ['top', 'bottom', 'left'],
}

// Conference / All-Hands hall (bottom-left). Shares the common room's left wall
// (which carries the Conference doorway), so it paints no right wall. Its top
// edge seals it from the Library above; bottom + left close the room.
const conference: Room = {
  rect: LEFT_BOTTOM,
  floorPattern: roomTiles.floorConference,
  wallStyle,
  walls: ['top', 'bottom', 'left'],
}

const rooms = [commonRoom, cafe, gameRoom, library, conference]

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

// Café furniture in map coordinates. CAFE = {40,0,20,20}; the doorway from the
// common room lands at the left edge, rows y=8..10, kept clear. A service
// counter run lines the top wall (bakery display, espresso, sink + cooktop,
// fridges); four dining tables with top-down chairs spread through the room
// with walkable aisles down the middle and along the door.
const fx = CAFE.x // 40
const fy = CAFE.y // 0

// One continuous service counter strip along the top wall — left cap, a run of
// straight + cabinet-door mids, and a right cap — with no bare-floor gaps. The
// bakery display bookends the left and the fridge bank the right; the strip
// fills every cell between them, so the whole top wall reads as one counter.
// Appliances sit on top of the counter on the front layer (see cafeFront).
const COUNTER_Y = fy + 2
const counterRunStart = fx + 5 // first counter cell after the bakery display
const counterRunEnd = fx + 15 // last counter cell before the fridge bank
const counterRun: Placement[] = []
for (let x = counterRunStart; x <= counterRunEnd; x += 1) {
  let prefab = prefabs.counterMid
  if (x === counterRunStart) prefab = prefabs.counterLeft
  else if (x === counterRunEnd) prefab = prefabs.counterRight
  else if ((x - counterRunStart) % 3 === 0) prefab = prefabs.counterDoor
  counterRun.push({ prefab, x, y: COUNTER_Y })
}

const cafeBack: Placement[] = [
  // bakery display bookends the left end of the counter
  { prefab: prefabs.bakeryDisplay, x: fx + 2, y: COUNTER_Y },
  // contiguous service counter run along the top wall, facing down
  ...counterRun,
  // fridge bank closing the right end, against the right wall
  { prefab: prefabs.fridge, x: fx + 16, y: COUNTER_Y },
  { prefab: prefabs.fridgeWhite, x: fx + 17, y: COUNTER_Y },

  // dining tables, each flanked by a stool above and below; aisles kept clear
  // down the middle and along the left-edge door (rows y=8..11).
  { prefab: prefabs.cafeStoolYellow, x: fx + 5, y: fy + 7 },
  { prefab: prefabs.diningTable, x: fx + 4, y: fy + 8 },
  { prefab: prefabs.cafeStoolYellow, x: fx + 5, y: fy + 10 },

  { prefab: prefabs.cafeStoolRed, x: fx + 12, y: fy + 7 },
  { prefab: prefabs.diningTable, x: fx + 11, y: fy + 8 },
  { prefab: prefabs.cafeStoolRed, x: fx + 12, y: fy + 10 },

  { prefab: prefabs.cafeStoolBlue, x: fx + 5, y: fy + 13 },
  { prefab: prefabs.diningTable, x: fx + 4, y: fy + 14 },
  { prefab: prefabs.cafeStoolBlue, x: fx + 5, y: fy + 16 },

  { prefab: prefabs.cafeStoolYellow, x: fx + 16, y: fy + 8 },
  { prefab: prefabs.diningTable, x: fx + 15, y: fy + 9 },
  { prefab: prefabs.cafeStoolYellow, x: fx + 16, y: fy + 11 },

  // a checkered two-top in the lower-middle for variety, stools above + below
  { prefab: prefabs.cafeStoolRed, x: fx + 11, y: fy + 12 },
  { prefab: prefabs.checkeredTable, x: fx + 11, y: fy + 13 },
  { prefab: prefabs.cafeStoolRed, x: fx + 11, y: fy + 16 },

  // greenery framing the corners
  { prefab: prefabs.tallPlant, x: fx + 17, y: fy + 15 },
  { prefab: prefabs.slimPlant, x: fx + 1, y: fy + 17 },
]

const cafeFront: Placement[] = [
  // appliances sit on top of the contiguous counter (front layer so the counter
  // shows beneath them); spaced along the run. The counter beneath is already
  // solid, so collision is covered.
  { prefab: prefabs.espressoMachine, x: fx + 6, y: fy + 1 },
  { prefab: prefabs.sinkCounter, x: fx + 9, y: fy + 1 },
  { prefab: prefabs.cooktop, x: fx + 12, y: fy + 1 },

  // plated food on the dining tables
  { prefab: prefabs.foodPlate, x: fx + 5, y: fy + 8 },
  { prefab: prefabs.foodPlate, x: fx + 12, y: fy + 8 },
  { prefab: prefabs.foodPlate, x: fx + 16, y: fy + 9 },
  { prefab: prefabs.foodPlate, x: fx + 5, y: fy + 14 },
]

// Library furniture in map coordinates. LIBRARY = {0,0,20,20}; the doorway
// from the common room lands on the right (x=20) wall at rows y=8..11, so the
// right-side aisle (x=15..19, around those rows) is kept clear. Bookcases line
// the top wall and the left wall, reading desks fill the centre with walkable
// aisles, and a computer/checkout station + globe accent a corner.
const lx = LEFT_TOP.x // 0
const ly = LEFT_TOP.y // 0

const libraryBack: Placement[] = [
  // bookcase run along the top wall, facing down into the room
  { prefab: prefabs.bookcaseTall, x: lx + 3, y: ly + 2 },
  { prefab: prefabs.bookcaseTall, x: lx + 6, y: ly + 2 },
  { prefab: prefabs.bookcaseTall, x: lx + 9, y: ly + 2 },
  { prefab: prefabs.bookcaseTall, x: lx + 12, y: ly + 2 },

  // bookcase column down the left wall (sits just inside the wall)
  { prefab: prefabs.bookcaseTall, x: lx + 2, y: ly + 6 },
  { prefab: prefabs.bookcaseTall, x: lx + 2, y: ly + 10 },

  // three reading desks down the centre, each with a chair above and below;
  // aisles kept clear between desks and along the door side.
  { prefab: prefabs.readingChair, x: lx + 7, y: ly + 7 },
  { prefab: prefabs.readingDesk, x: lx + 6, y: ly + 8 },
  { prefab: prefabs.readingChair, x: lx + 7, y: ly + 10 },

  { prefab: prefabs.readingChair, x: lx + 12, y: ly + 7 },
  { prefab: prefabs.readingDesk, x: lx + 11, y: ly + 8 },
  { prefab: prefabs.readingChair, x: lx + 12, y: ly + 10 },

  { prefab: prefabs.readingChair, x: lx + 8, y: ly + 13 },
  { prefab: prefabs.readingDesk, x: lx + 7, y: ly + 14 },
  { prefab: prefabs.readingChair, x: lx + 8, y: ly + 16 },

  // computer / checkout station pair in the bottom-left corner
  { prefab: prefabs.computerStation, x: lx + 2, y: ly + 15 },
  { prefab: prefabs.computerStation, x: lx + 4, y: ly + 15 },

  // globe accent by the door aisle
  { prefab: prefabs.globe, x: lx + 16, y: ly + 6 },
  { prefab: prefabs.globe, x: lx + 16, y: ly + 14 },
]

const libraryFront: Placement[] = [
  // book-stack accents on the reading desks
  { prefab: prefabs.bookStack, x: lx + 8, y: ly + 8 },
  { prefab: prefabs.bookStack, x: lx + 13, y: ly + 8 },
  { prefab: prefabs.bookStack, x: lx + 9, y: ly + 14 },
]

// Conference / All-Hands furniture in map coordinates. CONFERENCE = {0,20,20,20};
// the doorway from the common room lands on the right (x=20) wall at rows
// y=28..30, so the right-side aisle (x=15..19 around those rows) is kept clear.
// A projector screen + podium anchor the top wall, a rounded conference table
// sits center-front of the screen ringed with meeting chairs, and the lower
// half holds three rows of audience chairs facing the screen.
const nx = LEFT_BOTTOM.x // 0
const ny = LEFT_BOTTOM.y // 20

// One row of audience seating: two symmetric blocks of office chairs facing up
// toward the screen with a centre aisle between them. Stops before the door-side
// aisle (x>=14) so the doorway rows (y=28..30) stay clear.
const AUDIENCE_CHAIR_COLUMNS = [2, 3, 4, 5, 9, 10, 11, 12]
function audienceRow(y: number): Placement[] {
  return AUDIENCE_CHAIR_COLUMNS.map((column, index) => ({
    prefab: index % 2 === 0 ? prefabs.officeChairGray : prefabs.officeChairGrayB,
    x: nx + column,
    y,
  }))
}

const conferenceBack: Placement[] = [
  // projector screen mounted on the top wall, centred, with the AV/podium
  // cabinet beside it as a lectern.
  { prefab: prefabs.projectorScreen, x: nx + 8, y: ny + 1 },
  { prefab: prefabs.avCabinet, x: nx + 11, y: ny + 1 },

  // presenter's conference table below the screen, with chairs behind it.
  { prefab: prefabs.conferenceTable, x: nx + 7, y: ny + 6 },
  { prefab: prefabs.officeChairGray, x: nx + 7, y: ny + 5 },
  { prefab: prefabs.officeChairGrayB, x: nx + 9, y: ny + 5 },
  { prefab: prefabs.officeChairBlue, x: nx + 10, y: ny + 5 },

  // three rows of audience chairs in the lower half, all facing up toward the
  // screen. A centre aisle splits each row; the door-side aisle (x>=14) stays
  // clear of the doorway rows (y=28..30).
  ...audienceRow(ny + 10),
  ...audienceRow(ny + 13),
  ...audienceRow(ny + 16),

  // water cooler in the bottom-right corner away from the seating.
  { prefab: prefabs.waterCooler, x: nx + 17, y: ny + 16 },

  // greenery framing the room and flanking the screen.
  { prefab: prefabs.tallPlant, x: nx + 1, y: ny + 1 },
  { prefab: prefabs.slimPlant, x: nx + 6, y: ny + 1 },
  { prefab: prefabs.tallPlant, x: nx + 17, y: ny + 1 },
  { prefab: prefabs.tallPlant, x: nx + 1, y: ny + 16 },
]

const conferenceFront: Placement[] = [
  // a coffee mug prop sits on the presenter's table (front layer).
  { prefab: prefabs.bookStack, x: nx + 8, y: ny + 7 },
]

// Rugs anchor the seating clusters and mark the spawn carpet.
const decorPlacements: Placement[] = [
  // library reading rugs under the desk clusters
  { prefab: prefabs.carpetBlue, x: lx + 6, y: ly + 8 },
  { prefab: prefabs.carpetBlue, x: lx + 11, y: ly + 8 },
  { prefab: prefabs.carpetRed, x: lx + 7, y: ly + 14 },
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
  // conference: a red runner under the conference table to ground the stage area
  { prefab: prefabs.carpetRed, x: nx + 8, y: ny + 6 },
]

const frontPlacements: Placement[] = [
  { prefab: prefabs.couchPillows, x: cx + 5, y: 5 },
  { prefab: prefabs.couchPillows, x: cx + 13, y: 27 },
  // game room flavour: a standing cue rack beside the pool table
  { prefab: prefabs.cueRack, x: gx + 12, y: gy + 9 },
  { prefab: prefabs.ballRack, x: gx + 6, y: gy + 10 },
  ...cafeFront,
  ...libraryFront,
  ...conferenceFront,
]

// Spawn on the centre purple carpet of the common room.
const spawnPoints = [
  { name: 'spawn-center', x: cx + 9, y: 22 },
  { name: 'spawn-left', x: cx + 8, y: 23 },
  { name: 'spawn-right', x: cx + 10, y: 23 },
]

// All furniture that renders on the Objects Back layer and contributes solid
// collision, across every furnished room.
const allBackPlacements = [
  ...backPlacements,
  ...gameRoomBack,
  ...cafeBack,
  ...libraryBack,
  ...conferenceBack,
]

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
