import { gid, type Prefab } from './tiled.ts'

const ROOM_BUILDER = 1
const LIVING_ROOM = 1801

export const roomTiles = {
  floor: gid(ROOM_BUILDER, 495),
}

export const prefabs = {
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
  bookshelfWide: {
    name: 'bookshelf-wide',
    solid: true,
    tiles: [
      [
        gid(LIVING_ROOM, 394),
        gid(LIVING_ROOM, 395),
        gid(LIVING_ROOM, 396),
        gid(LIVING_ROOM, 397),
        gid(LIVING_ROOM, 398),
        gid(LIVING_ROOM, 399),
      ],
      [
        gid(LIVING_ROOM, 410),
        gid(LIVING_ROOM, 411),
        gid(LIVING_ROOM, 412),
        gid(LIVING_ROOM, 413),
        gid(LIVING_ROOM, 414),
        gid(LIVING_ROOM, 415),
      ],
    ],
  },
  bookshelfShort: {
    name: 'bookshelf-short',
    solid: true,
    tiles: [
      [gid(LIVING_ROOM, 394), gid(LIVING_ROOM, 395), gid(LIVING_ROOM, 396)],
      [gid(LIVING_ROOM, 410), gid(LIVING_ROOM, 411), gid(LIVING_ROOM, 412)],
    ],
  },
  couchGray: {
    name: 'couch-gray',
    solid: true,
    tiles: [
      [gid(LIVING_ROOM, 448), gid(LIVING_ROOM, 449), gid(LIVING_ROOM, 450), gid(LIVING_ROOM, 451)],
      [gid(LIVING_ROOM, 464), gid(LIVING_ROOM, 465), gid(LIVING_ROOM, 466), gid(LIVING_ROOM, 467)],
      [gid(LIVING_ROOM, 480), gid(LIVING_ROOM, 481), gid(LIVING_ROOM, 482), gid(LIVING_ROOM, 483)],
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
  prefabs.bookshelfWide,
  prefabs.bookshelfShort,
  prefabs.couchGray,
  prefabs.couchPillows,
  prefabs.sideTable,
  prefabs.tallPlant,
  prefabs.slimPlant,
]
