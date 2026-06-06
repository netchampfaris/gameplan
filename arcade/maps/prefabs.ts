import { gid, type Prefab } from './tiled.ts'

const ROOM_BUILDER = 'room_builder'
const LIVING_ROOM = 'living_room'
const GENERIC = 'generic'
const BASEMENT = 'basement'

const bm = (...ids: number[]) => ids.map((id) => gid(BASEMENT, id))

export const roomTiles = {
  // Golden wood planks, seamless 3x2 swatch from the Room Builder floor section.
  floorPattern: [
    [gid(ROOM_BUILDER, 1630), gid(ROOM_BUILDER, 1631), gid(ROOM_BUILDER, 1632)],
    [gid(ROOM_BUILDER, 1706), gid(ROOM_BUILDER, 1707), gid(ROOM_BUILDER, 1708)],
  ],
  // Dark gray stone, seamless 3x2 swatch — Game Room floor.
  floorGameRoom: [
    [gid(ROOM_BUILDER, 2098), gid(ROOM_BUILDER, 2099), gid(ROOM_BUILDER, 2100)],
    [gid(ROOM_BUILDER, 2174), gid(ROOM_BUILDER, 2175), gid(ROOM_BUILDER, 2176)],
  ],
  // Light-blue checkerboard tile, seamless 1x3 swatch — Café floor.
  floorCafe: [[gid(ROOM_BUILDER, 2150), gid(ROOM_BUILDER, 2151), gid(ROOM_BUILDER, 2152)]],
  // Neutral gray weave — sealed left-hand rooms (no doorway yet).
  floorSealed: [[gid(ROOM_BUILDER, 1718), gid(ROOM_BUILDER, 1719), gid(ROOM_BUILDER, 1720)]],
}

export const prefabs = {
  // Wood-panel wall with ceiling trim (top row) and baseboard (bottom row).
  wallSegment: {
    name: 'wall-segment',
    solid: true,
    tiles: [
      [gid(ROOM_BUILDER, 847), gid(ROOM_BUILDER, 848), gid(ROOM_BUILDER, 849), gid(ROOM_BUILDER, 850)],
      [gid(ROOM_BUILDER, 923), gid(ROOM_BUILDER, 924), gid(ROOM_BUILDER, 925), gid(ROOM_BUILDER, 926)],
    ],
  },
  // Single-column wood wall body for vertical partitions; tiles down an edge.
  wallVertical: {
    name: 'wall-vertical',
    solid: true,
    tiles: [[gid(ROOM_BUILDER, 924)], [gid(ROOM_BUILDER, 924)]],
  },
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
} satisfies Record<string, Prefab>

export const objectPalettePrefabs = [
  prefabs.wallSegment,
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
]
