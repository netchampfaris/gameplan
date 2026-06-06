import { gid, type Prefab } from './tiled.ts'

const ROOM_BUILDER = 1
const LIVING_ROOM = 8589
const GENERIC = 9309

export const roomTiles = {
  // Golden wood planks, seamless 3x2 swatch from the Room Builder floor section.
  floorPattern: [
    [gid(ROOM_BUILDER, 1630), gid(ROOM_BUILDER, 1631), gid(ROOM_BUILDER, 1632)],
    [gid(ROOM_BUILDER, 1706), gid(ROOM_BUILDER, 1707), gid(ROOM_BUILDER, 1708)],
  ],
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
]
