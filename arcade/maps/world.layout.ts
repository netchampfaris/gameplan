import {
  applyPlacements,
  createCollisionLayer,
  createEmptyLayer,
  createObjectPaletteLayer,
  createSpawnLayer,
  createTileLayer,
  createTiledMap,
  type MapDimensions,
  type Placement,
} from './tiled.ts'
import { WallPlan, type Room } from './rooms.ts'
import { floorKits, grayWallKit, objectPalettePrefabs, prefabs } from './prefabs.ts'

const dimensions: MapDimensions = { width: 60, height: 40 }

// World is split into a center column (common room hub) flanked by the
// library / conference hall on the left and the café / game room on the
// right. Shared partition walls are owned by a single room so they never
// double up; WallPlan resolves junctions and floor shadows globally.
const COMMON = { x: 20, y: 0, width: 20, height: 40 }
const CAFE = { x: 40, y: 0, width: 20, height: 20 }
const GAME = { x: 40, y: 20, width: 20, height: 20 }
const LEFT_TOP = { x: 0, y: 0, width: 20, height: 20 }
const LEFT_BOTTOM = { x: 0, y: 20, width: 20, height: 20 }

// Doorway rows on the common room's right wall (room-local offsets from y=0).
const CAFE_DOOR = { edge: 'right' as const, offset: 8, width: 3 }
const GAME_DOOR = { edge: 'right' as const, offset: 28, width: 3 }

// Doorways in the common room's left wall: upper half into the Library,
// lower half into the Conference Hall. The common room owns both shared
// partitions, so the gaps are cut here and the neighbours paint no right wall.
const LIBRARY_DOOR = { edge: 'left' as const, offset: 8, width: 3 }
const CONFERENCE_DOOR = { edge: 'left' as const, offset: 28, width: 3 }

// The common room owns the vertical partitions it shares with its
// neighbours; top and bottom edges close the map perimeter.
const commonRoom: Room = {
  rect: COMMON,
  floorKit: floorKits.diagonalWood,
  walls: ['top', 'bottom', 'left', 'right'],
  doorways: [CAFE_DOOR, GAME_DOOR, LIBRARY_DOOR, CONFERENCE_DOOR],
}

// Right-hand rooms skip their shared left wall (owned by the common room);
// the café also skips its bottom wall (the divider is owned by the game
// room's top edge) so the pair shares a single 2-row band.
const cafe: Room = {
  rect: CAFE,
  floorKit: floorKits.stoneTile,
  walls: ['top', 'right'],
}

const gameRoom: Room = {
  rect: GAME,
  floorKit: floorKits.darkStone,
  walls: ['top', 'bottom', 'right'],
}

// Library / Focus Room (top-left). Shares the common room's left wall (which
// carries the Library doorway) and lets the Conference Hall's top edge be the
// divider below, so each partition is a single band.
const library: Room = {
  rect: LEFT_TOP,
  floorKit: floorKits.parquet,
  walls: ['top', 'left'],
}

// Conference / All-Hands hall (bottom-left). Its top edge is the divider with
// the Library; bottom + left close the map perimeter.
const conference: Room = {
  rect: LEFT_BOTTOM,
  floorKit: floorKits.medallionCarpet,
  walls: ['top', 'bottom', 'left'],
}

const rooms = [commonRoom, cafe, gameRoom, library, conference]

// ---- Common room -----------------------------------------------------------
// Furnished after the Generic_Home_1 example: an identity wall with a
// fireplace centerpiece tightly flanked by chairs, lounge clusters anchored
// on area rugs, plants tucked into corners, and doormats at every doorway.
// Columns 20 and 39 are wall; usable floor is 21..38. The doorway corridors
// (rows 8-10 and 28-30) stay clear wall to wall.
const cx = COMMON.x // 20

const backPlacements: Placement[] = [
  // identity wall: plant / bookshelf / chair+fireplace+chair / bookshelf / plant
  { prefab: prefabs.bushyPlant, x: cx + 1, y: 0 },
  { prefab: prefabs.bookshelfWide, x: cx + 2, y: 0 },
  { prefab: prefabs.armchairOrange, x: cx + 8, y: 1 },
  { prefab: prefabs.fireplace, x: cx + 9, y: 0 },
  { prefab: prefabs.armchairOrange, x: cx + 11, y: 1 },
  { prefab: prefabs.bookshelfWide, x: cx + 12, y: 0 },
  { prefab: prefabs.bushyPlant, x: cx + 18, y: 0 },

  // upper-west lounge on a purple rug: couch along the rug's top edge,
  // floor lamp beside it, armchair facing in, coffee table on the rug
  { prefab: prefabs.couchGray, x: cx + 6, y: 3 },
  { prefab: prefabs.lampBlue, x: cx + 9, y: 3 },
  { prefab: prefabs.armchairOrange, x: cx + 4, y: 5 },
  { prefab: prefabs.coffeeTable, x: cx + 6, y: 6 },

  // upper-east chat nook: brown couch + table lamp + facing armchair
  { prefab: prefabs.couchBrown, x: cx + 14, y: 4 },
  { prefab: prefabs.tableLamp, x: cx + 17, y: 4 },
  { prefab: prefabs.armchairOrange, x: cx + 13, y: 5 },

  // mid-room chat pair on the west side
  { prefab: prefabs.armchairOrange, x: cx + 2, y: 13 },
  { prefab: prefabs.tableLamp, x: cx + 3, y: 13 },
  { prefab: prefabs.armchairOrange, x: cx + 4, y: 13 },
  // greenery breaking up the long east wall
  { prefab: prefabs.bushyPlant, x: cx + 18, y: 12 },
  { prefab: prefabs.bushyPlant, x: cx + 18, y: 16 },

  // central plaza: tall plants framing the spawn carpet
  { prefab: prefabs.tallPlant, x: cx + 5, y: 19 },
  { prefab: prefabs.tallPlant, x: cx + 13, y: 19 },

  // lower-mid long table flanked by armchairs
  { prefab: prefabs.armchairOrange, x: cx + 5, y: 25 },
  { prefab: prefabs.coffeeTable, x: cx + 7, y: 25 },
  { prefab: prefabs.armchairOrange, x: cx + 10, y: 25 },

  // lower-west lounge mirroring the upper one
  { prefab: prefabs.couchBrown, x: cx + 6, y: 31 },
  { prefab: prefabs.tableLamp, x: cx + 9, y: 31 },
  { prefab: prefabs.armchairOrange, x: cx + 4, y: 33 },
  { prefab: prefabs.coffeeTable, x: cx + 6, y: 34 },

  // lower-east lounge: gray couch with lamp and table
  { prefab: prefabs.couchGray, x: cx + 13, y: 32 },
  { prefab: prefabs.lampBlue, x: cx + 16, y: 32 },
  { prefab: prefabs.coffeeTable, x: cx + 13, y: 35 },

  // bottom wall dressed with shelves and greenery (bases meet the wall band)
  { prefab: prefabs.slimPlant, x: cx + 1, y: 35 },
  { prefab: prefabs.bookshelf, x: cx + 3, y: 35 },
  { prefab: prefabs.tallPlant, x: cx + 8, y: 35 },
  { prefab: prefabs.bookshelf, x: cx + 15, y: 35 },
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
  // a book prop sits on the presenter's table (front layer).
  { prefab: prefabs.bookStack, x: nx + 8, y: ny + 7 },
]

// Rugs anchor the seating clusters; doormats mark every doorway threshold.
const decorPlacements: Placement[] = [
  // library reading rugs under the desk clusters
  { prefab: prefabs.carpetBlue, x: lx + 6, y: ly + 8 },
  { prefab: prefabs.carpetBlue, x: lx + 11, y: ly + 8 },
  { prefab: prefabs.carpetRed, x: lx + 7, y: ly + 14 },

  // common room: lounge rugs under the seating clusters
  { prefab: prefabs.carpetPurple, x: cx + 6, y: 4 },
  { prefab: prefabs.carpetRed, x: cx + 14, y: 6 },
  { prefab: prefabs.carpetPurple, x: cx + 6, y: 32 },
  { prefab: prefabs.carpetBlue, x: cx + 14, y: 34 },
  // spawn plaza carpet at the room's vertical centre
  { prefab: prefabs.carpetPurple, x: cx + 8, y: 19 },

  // doormats inside the four doorways
  { prefab: prefabs.carpetRed, x: cx + 1, y: 8 },
  { prefab: prefabs.carpetBlue, x: cx + 17, y: 8 },
  { prefab: prefabs.carpetBlue, x: cx + 1, y: 28 },
  { prefab: prefabs.carpetRed, x: cx + 17, y: 28 },

  // game room: rug under the pool table and matching rugs under each pouf
  { prefab: prefabs.carpetRed, x: gx + 8, y: gy + 9 },
  { prefab: prefabs.carpetBlue, x: gx + 8, y: gy + 16 },
  { prefab: prefabs.carpetBlue, x: gx + 11, y: gy + 16 },
  // conference: a red runner under the conference table to ground the stage area
  { prefab: prefabs.carpetRed, x: nx + 8, y: ny + 6 },
]

const frontPlacements: Placement[] = [
  { prefab: prefabs.couchPillows, x: cx + 7, y: 3 },
  { prefab: prefabs.couchPillows, x: cx + 14, y: 32 },
  // game room flavour: a standing cue rack beside the pool table
  { prefab: prefabs.cueRack, x: gx + 12, y: gy + 9 },
  { prefab: prefabs.ballRack, x: gx + 6, y: gy + 10 },
  ...cafeFront,
  ...libraryFront,
  ...conferenceFront,
]

// Spawn on the centre purple carpet of the common room.
const spawnPoints = [
  { name: 'spawn-center', x: cx + 9, y: 21 },
  { name: 'spawn-left', x: cx + 8, y: 22 },
  { name: 'spawn-right', x: cx + 10, y: 22 },
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

  const wallPlan = new WallPlan(rooms, dimensions)
  for (const room of rooms) {
    wallPlan.paintFloor(floorLayer, room)
  }
  wallPlan.paintWalls(floorLayer, grayWallKit)
  wallPlan.applyCollision(collisionLayer)

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
