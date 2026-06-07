import { gid, type Prefab } from './tiled.ts'
import type { FloorKit, WallKit } from './rooms.ts'

const ROOM_BUILDER = 'room_builder'
const LIVING_ROOM = 'living_room'
const GENERIC = 'generic'
const BASEMENT = 'basement'
const KITCHEN = 'kitchen'
const CLASSROOM_LIBRARY = 'classroom_library'
const CONFERENCE_HALL = 'conference_hall'

const bm = (...ids: number[]) => ids.map((id) => gid(BASEMENT, id))
const kt = (...ids: number[]) => ids.map((id) => gid(KITCHEN, id))
const cl = (...ids: number[]) => ids.map((id) => gid(CLASSROOM_LIBRARY, id))
const cf = (...ids: number[]) => ids.map((id) => gid(CONFERENCE_HALL, id))

// Room_Builder floors are published as 3x2 shadow-variant kits (see
// maps/design-reference/DESIGN-GRAMMAR.md): the top-left tile of each kit is
// the corner-shadow variant and the rest follow at fixed offsets.
const floorKit = (topLeftId: number): FloorKit => ({
  topLeft: gid(ROOM_BUILDER, topLeftId),
  top: gid(ROOM_BUILDER, topLeftId + 1),
  topFade: gid(ROOM_BUILDER, topLeftId + 2),
  left: gid(ROOM_BUILDER, topLeftId + 76),
  plain: gid(ROOM_BUILDER, topLeftId + 77),
})

export const floorKits = {
  // Warm diagonal wood planks — the Generic_Home_1 living-room floor.
  diagonalWood: floorKit(2998),
  // Dark gray stone — Game Room floor.
  darkStone: floorKit(2098),
  // Light stone tile — Café floor (the Generic_Home_1 kitchen floor; the
  // blue checkerboard block is a repeating pattern, not a shadow kit).
  stoneTile: floorKit(3314),
  // Warm tan parquet-weave — calmer Library floor.
  parquet: floorKit(1634),
  // Formal purple medallion carpet — Conference Hall floor.
  medallionCarpet: floorKit(2246),
}

// The gray "3D" wall family used by the Generic_Home_1 example: 2-row
// south-facing bands, beveled 1-column vertical bodies, and junction pieces
// resolved by WallPlan from the neighbourhood.
export const grayWallKit: WallKit = {
  faceTop: gid(ROOM_BUILDER, 1141),
  faceBottom: gid(ROOM_BUILDER, 1217),
  runStartTop: gid(ROOM_BUILDER, 1140),
  runStartBottom: gid(ROOM_BUILDER, 1216),
  runEndTop: gid(ROOM_BUILDER, 1142),
  runEndBottom: gid(ROOM_BUILDER, 1218),
  stubTop: gid(ROOM_BUILDER, 1143),
  stubBottom: gid(ROOM_BUILDER, 1219),
  bodyEast: gid(ROOM_BUILDER, 4310),
  bodyWest: gid(ROOM_BUILDER, 4313),
  nwTop: gid(ROOM_BUILDER, 4158),
  neTop: gid(ROOM_BUILDER, 4161),
  tEastTop: gid(ROOM_BUILDER, 4159),
  tWestTop: gid(ROOM_BUILDER, 4160),
  eastBottom: gid(ROOM_BUILDER, 4234),
  westBottom: gid(ROOM_BUILDER, 4236),
}

export const prefabs = {
  carpetPurple: {
    name: 'carpet-purple',
    tiles: [
      [348, 349, 350, 351].map((tile) => gid(GENERIC, tile)),
      [364, 365, 366, 367].map((tile) => gid(GENERIC, tile)),
      [380, 381, 382, 383].map((tile) => gid(GENERIC, tile)),
      [396, 397, 398, 399].map((tile) => gid(GENERIC, tile)),
    ],
  },
  carpetRed: {
    name: 'carpet-red',
    tiles: [
      [gid(GENERIC, 355), gid(GENERIC, 356)],
      [gid(GENERIC, 371), gid(GENERIC, 372)],
    ],
  },
  carpetBlue: {
    name: 'carpet-blue',
    tiles: [
      [gid(GENERIC, 403), gid(GENERIC, 404)],
      [gid(GENERIC, 419), gid(GENERIC, 420)],
    ],
  },
  fireplace: {
    name: 'fireplace',
    solid: true,
    tiles: [
      [gid(LIVING_ROOM, 388), gid(LIVING_ROOM, 389)],
      [gid(LIVING_ROOM, 404), gid(LIVING_ROOM, 405)],
      [gid(LIVING_ROOM, 420), gid(LIVING_ROOM, 421)],
    ],
  },
  armchairOrange: {
    name: 'armchair-orange',
    solid: true,
    tiles: [[gid(LIVING_ROOM, 603)], [gid(LIVING_ROOM, 619)]],
  },
  couchBrown: {
    name: 'couch-brown',
    solid: true,
    tiles: [
      [gid(LIVING_ROOM, 455), gid(LIVING_ROOM, 456), gid(LIVING_ROOM, 457)],
      [gid(LIVING_ROOM, 471), gid(LIVING_ROOM, 472), gid(LIVING_ROOM, 473)],
    ],
  },
  paintingLandscape: {
    name: 'painting-landscape',
    tiles: [[gid(LIVING_ROOM, 448)]],
  },
  paintingOrange: {
    name: 'painting-orange',
    tiles: [[gid(LIVING_ROOM, 480)]],
  },
  coffeeTable: {
    name: 'coffee-table',
    solid: true,
    tiles: [
      [gid(LIVING_ROOM, 114), gid(LIVING_ROOM, 115)],
      [gid(LIVING_ROOM, 130), gid(LIVING_ROOM, 131)],
    ],
  },
  // Floor lamp: only the base blocks movement so players can walk behind the pole.
  lampBlue: {
    name: 'lamp-blue',
    tiles: [[gid(LIVING_ROOM, 156)], [gid(LIVING_ROOM, 172)], [gid(LIVING_ROOM, 188)]],
    collision: [[false], [false], [true]],
  },
  tableLamp: {
    name: 'table-lamp',
    tiles: [[gid(LIVING_ROOM, 158)], [gid(LIVING_ROOM, 174)]],
    collision: [[false], [true]],
  },
  tallPlant: {
    name: 'tall-plant',
    solid: true,
    tiles: [
      [gid(LIVING_ROOM, 10), gid(LIVING_ROOM, 11)],
      [gid(LIVING_ROOM, 26), gid(LIVING_ROOM, 27)],
      [gid(LIVING_ROOM, 42), gid(LIVING_ROOM, 43)],
    ],
  },
  slimPlant: {
    name: 'slim-plant',
    solid: true,
    tiles: [[gid(LIVING_ROOM, 12)], [gid(LIVING_ROOM, 28)], [gid(LIVING_ROOM, 44)]],
  },
  // Bushy potted plant in a terracotta pot (the variety the Generic_Home_1
  // example tucks against walls). Only the pot blocks movement.
  bushyPlant: {
    name: 'bushy-plant',
    tiles: [[gid(LIVING_ROOM, 351)], [gid(LIVING_ROOM, 367)], [gid(LIVING_ROOM, 383)]],
    collision: [[false], [false], [true]],
  },
  // Bookshelf units are 2 wide x 3 tall in the sheet; wide = three units side by side.
  bookshelfWide: {
    name: 'bookshelf-wide',
    solid: true,
    tiles: [
      [394, 395, 396, 397, 398, 399].map((tile) => gid(LIVING_ROOM, tile)),
      [410, 411, 412, 413, 414, 415].map((tile) => gid(LIVING_ROOM, tile)),
      [426, 427, 428, 429, 430, 431].map((tile) => gid(LIVING_ROOM, tile)),
    ],
  },
  bookshelf: {
    name: 'bookshelf',
    solid: true,
    tiles: [
      [gid(LIVING_ROOM, 394), gid(LIVING_ROOM, 395)],
      [gid(LIVING_ROOM, 410), gid(LIVING_ROOM, 411)],
      [gid(LIVING_ROOM, 426), gid(LIVING_ROOM, 427)],
    ],
  },
  couchGray: {
    name: 'couch-gray',
    solid: true,
    tiles: [
      [gid(LIVING_ROOM, 449), gid(LIVING_ROOM, 450), gid(LIVING_ROOM, 451)],
      [gid(LIVING_ROOM, 465), gid(LIVING_ROOM, 466), gid(LIVING_ROOM, 467)],
    ],
  },
  couchPillows: {
    name: 'couch-pillows',
    tiles: [
      [gid(LIVING_ROOM, 508), gid(LIVING_ROOM, 509)],
      [gid(LIVING_ROOM, 524), gid(LIVING_ROOM, 525)],
    ],
  },
  sideTable: {
    name: 'side-table',
    solid: true,
    tiles: [
      [gid(LIVING_ROOM, 217), gid(LIVING_ROOM, 218)],
      [gid(LIVING_ROOM, 233), gid(LIVING_ROOM, 234)],
      [gid(LIVING_ROOM, 249), gid(LIVING_ROOM, 250)],
    ],
  },

  // ---- Game Room (14_Basement_48x48.png) ----------------------------------
  // Centerpiece pool/billiards table, top-down, 4x3 with six pockets and legs.
  poolTable: {
    name: 'pool-table',
    solid: true,
    tiles: [bm(404, 405, 406, 407), bm(420, 421, 422, 423), bm(436, 437, 438, 439)],
  },
  // Top-down blue ping-pong table with net across the middle, 3x4.
  pingPongTable: {
    name: 'ping-pong-table',
    solid: true,
    tiles: [bm(192, 193, 194), bm(208, 209, 210), bm(224, 225, 226), bm(240, 241, 242)],
  },
  // Upright arcade cabinets with lit screens, 1 wide x 2 tall. Colour variants.
  arcadeCabinetBlue: {
    name: 'arcade-cabinet-blue',
    solid: true,
    tiles: [bm(660), bm(676)],
  },
  arcadeCabinetCyan: {
    name: 'arcade-cabinet-cyan',
    solid: true,
    tiles: [bm(663), bm(679)],
  },
  arcadeCabinetRed: {
    name: 'arcade-cabinet-red',
    solid: true,
    tiles: [bm(665), bm(681)],
  },
  // Big flatscreen TV on a media console with shelves, 5 wide x 3 tall. Only the
  // console body blocks movement; the floating top-left/TV cells are empty.
  tvMediaUnit: {
    name: 'tv-media-unit',
    tiles: [bm(758, 759, 760, 761, 762), bm(774, 775, 776, 777, 778), bm(790, 791, 792, 793, 794)],
    collision: [
      [false, false, false, false, false],
      [false, true, true, true, true],
      [false, true, true, true, true],
    ],
  },
  // Round poufs / bean bags, 2x2. Spectator seating — non-solid so players can
  // perch on them visually without getting stuck.
  poufCream: {
    name: 'pouf-cream',
    tiles: [bm(684, 685), bm(700, 701)],
  },
  poufTan: {
    name: 'pouf-tan',
    tiles: [bm(686, 687), bm(702, 703)],
  },
  // Single-seat stools, 1 wide x 2 tall.
  stoolYellow: {
    name: 'stool-yellow',
    solid: true,
    tiles: [bm(410), bm(426)],
  },
  stoolRed: {
    name: 'stool-red',
    solid: true,
    tiles: [bm(411), bm(427)],
  },
  // Cue rack (standing) and crossed cues wall decor, 1x1 front-layer flavour.
  cueRack: {
    name: 'cue-rack',
    tiles: [bm(403), bm(419)],
    collision: [[false], [true]],
  },
  ballRack: {
    name: 'ball-rack',
    tiles: [bm(417)],
  },

  // ---- Café / Kitchen (12_Kitchen_48x48.png) ------------------------------
  // Glass-front bakery display case, 3 wide x 2 tall: wood top + pastry vitrine.
  bakeryDisplay: {
    name: 'bakery-display',
    solid: true,
    tiles: [kt(541, 542, 543), kt(557, 558, 559)],
  },
  // Twin-group espresso machine with portafilter spouts and a drip tray, 2x2.
  // Sits on top of the counter run, so only the machine body blocks movement.
  espressoMachine: {
    name: 'espresso-machine',
    solid: true,
    tiles: [kt(519, 520), kt(535, 536)],
  },
  // Stainless twin-basin sink with faucet knobs, 2 wide x 2 tall, set into the
  // counter run. Both tiles block movement.
  sinkCounter: {
    name: 'sink-counter',
    solid: true,
    tiles: [kt(551, 552), kt(567, 568)],
  },
  // Four-burner cooktop with the wall range hood floating above it. The hood
  // hangs on the wall (non-solid); only the cooktop blocks movement.
  cooktop: {
    name: 'cooktop',
    tiles: [kt(491), kt(507)],
    collision: [[false], [true]],
  },
  // Single upright fridge, 1 wide x 3 tall (top, handled door, base).
  fridge: {
    name: 'fridge',
    solid: true,
    tiles: [kt(378), kt(394), kt(410)],
  },
  fridgeWhite: {
    name: 'fridge-white',
    solid: true,
    tiles: [kt(379), kt(395), kt(411)],
  },
  // Wood counter run pieces, 1x1, top-down. They butt together seamlessly to
  // form one continuous service counter: left cap, straight mid, cabinet-door
  // mid, right cap. All solid.
  counterLeft: {
    name: 'counter-left',
    solid: true,
    tiles: [kt(114)],
  },
  counterMid: {
    name: 'counter-mid',
    solid: true,
    tiles: [kt(115)],
  },
  counterDoor: {
    name: 'counter-door',
    solid: true,
    tiles: [kt(116)],
  },
  counterRight: {
    name: 'counter-right',
    solid: true,
    tiles: [kt(118)],
  },
  // Wooden dining table, 3 wide x 2 tall (plank top + front edge with legs).
  diningTable: {
    name: 'dining-table',
    solid: true,
    tiles: [kt(307, 308, 309), kt(323, 324, 325)],
  },
  // Red-and-white checkered tablecloth table, 2 wide x 3 tall.
  checkeredTable: {
    name: 'checkered-table',
    solid: true,
    tiles: [kt(340, 341), kt(356, 357), kt(372, 373)],
  },
  // Top-down café stools (cushioned seat + four legs, 1 wide x 2 tall) borrowed
  // from the basement sheet — they read unambiguously as stools. Walkable so a
  // player can "sit" by standing on the seat; only flavour, no collision.
  cafeStoolYellow: {
    name: 'cafe-stool-yellow',
    tiles: [bm(410), bm(426)],
  },
  cafeStoolRed: {
    name: 'cafe-stool-red',
    tiles: [bm(411), bm(427)],
  },
  cafeStoolBlue: {
    name: 'cafe-stool-blue',
    tiles: [bm(412), bm(428)],
  },
  // Plated food props, 1x1, front-layer flavour for tables.
  foodPlate: {
    name: 'food-plate',
    tiles: [kt(555)],
  },

  // ---- Library / Focus Room (5_Classroom_and_library_48x48.png) ------------
  // Tall light-wood bookcase, 3 wide x 3 tall: top cap row + two filled book
  // rows. A complete framed unit; entirely solid.
  bookcaseTall: {
    name: 'bookcase-tall',
    solid: true,
    tiles: [cl(208, 209, 210), cl(224, 225, 226), cl(240, 241, 242)],
  },
  // Wide reading desk with an open book on a green top, 3 wide x 2 tall. The
  // top + legs both block movement.
  readingDesk: {
    name: 'reading-desk',
    solid: true,
    tiles: [cl(71, 72, 73), cl(87, 88, 89)],
  },
  // Cushioned reading chair, 1 wide x 2 tall. Walkable so a player can sit by
  // standing on the seat.
  readingChair: {
    name: 'reading-chair',
    tiles: [cl(52), cl(68)],
  },
  // Globe on a gold stand, 1 wide x 2 tall accent. Solid base.
  globe: {
    name: 'globe',
    tiles: [cl(29), cl(45)],
    collision: [[false], [true]],
  },
  // Retro desktop computer + keyboard on a stand, 1 wide x 2 tall — checkout /
  // catalog station. Solid.
  computerStation: {
    name: 'computer-station',
    solid: true,
    tiles: [cl(176), cl(192)],
  },
  // Small stack of books, 1x1 front-layer accent.
  bookStack: {
    name: 'book-stack',
    tiles: [cl(316)],
  },

  // ---- Conference / All-Hands (13_Conference_Hall_48x48.png) ----------------
  // Big rounded brown conference table, 4 wide x 2 tall with a coffee cup on it.
  // The whole footprint blocks movement.
  conferenceTable: {
    name: 'conference-table',
    solid: true,
    tiles: [cf(73, 74, 75, 76), cf(89, 90, 91, 92)],
  },
  // Wall-mounted pull-down projector screen, 2 wide x 3 tall: a dark housing bar
  // on top (10,11) over the framed screen surface (42,43 / 58,59). Hangs on the
  // top wall (non-solid) so audience sightlines are not blocked at floor level.
  projectorScreen: {
    name: 'projector-screen',
    tiles: [cf(10, 11), cf(42, 43), cf(58, 59)],
  },
  // Office swivel chairs (1_Generic) viewed from behind, 1x1 each, so they read
  // as facing up toward the screen — used as audience and table seating. The
  // conference sheet's own chairs render as ambiguous gray boxes, so we borrow
  // these clearer ones. Walkable: a player can "sit" by standing on the seat.
  officeChairGray: {
    name: 'office-chair-gray',
    tiles: [[gid(GENERIC, 1012)]],
  },
  officeChairGrayB: {
    name: 'office-chair-gray-b',
    tiles: [[gid(GENERIC, 1013)]],
  },
  officeChairBlue: {
    name: 'office-chair-blue',
    tiles: [[gid(GENERIC, 1044)]],
  },
  // Water cooler with a blue dispenser, 1 wide x 2 tall. Solid base.
  waterCooler: {
    name: 'water-cooler',
    tiles: [cf(142), cf(158)],
    collision: [[false], [true]],
  },
  // Green-display AV / monitor cabinet, 1 wide x 2 tall — sits beside the screen
  // as a podium/lectern stand-in. Solid.
  avCabinet: {
    name: 'av-cabinet',
    solid: true,
    tiles: [cf(37), cf(53)],
  },
} satisfies Record<string, Prefab>

export const objectPalettePrefabs = [
  prefabs.carpetPurple,
  prefabs.carpetRed,
  prefabs.carpetBlue,
  prefabs.fireplace,
  prefabs.armchairOrange,
  prefabs.couchBrown,
  prefabs.paintingLandscape,
  prefabs.paintingOrange,
  prefabs.coffeeTable,
  prefabs.lampBlue,
  prefabs.tableLamp,
  prefabs.bookshelfWide,
  prefabs.bookshelf,
  prefabs.couchGray,
  prefabs.couchPillows,
  prefabs.sideTable,
  prefabs.tallPlant,
  prefabs.slimPlant,
  prefabs.bushyPlant,
  prefabs.poolTable,
  prefabs.pingPongTable,
  prefabs.arcadeCabinetBlue,
  prefabs.arcadeCabinetCyan,
  prefabs.arcadeCabinetRed,
  prefabs.tvMediaUnit,
  prefabs.poufCream,
  prefabs.poufTan,
  prefabs.stoolYellow,
  prefabs.stoolRed,
  prefabs.cueRack,
  prefabs.ballRack,
  prefabs.bakeryDisplay,
  prefabs.espressoMachine,
  prefabs.sinkCounter,
  prefabs.cooktop,
  prefabs.fridge,
  prefabs.fridgeWhite,
  prefabs.counterLeft,
  prefabs.counterMid,
  prefabs.counterDoor,
  prefabs.counterRight,
  prefabs.diningTable,
  prefabs.checkeredTable,
  prefabs.cafeStoolYellow,
  prefabs.cafeStoolRed,
  prefabs.cafeStoolBlue,
  prefabs.foodPlate,
  prefabs.bookcaseTall,
  prefabs.readingDesk,
  prefabs.readingChair,
  prefabs.globe,
  prefabs.computerStation,
  prefabs.bookStack,
  prefabs.conferenceTable,
  prefabs.projectorScreen,
  prefabs.officeChairGray,
  prefabs.officeChairGrayB,
  prefabs.officeChairBlue,
  prefabs.waterCooler,
  prefabs.avCabinet,
]
