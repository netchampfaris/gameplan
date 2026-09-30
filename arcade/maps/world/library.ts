import type { RoomLayout } from '../compose.ts'

/**
 * The Library: a quiet room below the Common Room, entered through a door in
 * its top wall. Coordinates are tiles from the room's top-left corner.
 *
 *   shelves ── door ── shelves
 *   reading table   reading table   (one long rug)
 *   armchair nook   armchair nook
 */
export const library: RoomLayout = {
  room: {
    id: 'library',
    x: 0,
    y: 16,
    width: 13,
    height: 12,
    wallpaper: 'sage',
    floor: 'parquet',
    doors: [5],
  },
  placements: [
    // Shelves line the wall on both sides of the door.
    { prefab: 'library-shelf', x: 1, y: 1 },
    { prefab: 'library-shelf-2', x: 3, y: 1 },
    { prefab: 'library-shelf-3', x: 7, y: 1 },
    { prefab: 'library-shelf-4', x: 9, y: 1 },
    { prefab: 'plant-tall', x: 11, y: 1 },

    // Two reading tables on one long rug.
    { prefab: 'rug-blue-10x4', x: 1, y: 4 },
    { prefab: 'reading-table', x: 1, y: 4, id: 'library-table-west' },
    { prefab: 'reading-table', x: 8, y: 4, id: 'library-table-east' },
    { prefab: 'library-globe', x: 11, y: 5 },

    // Two reading nooks: armchairs either side of a lamp.
    { prefab: 'rug-rose-5x3', x: 1, y: 8 },
    { prefab: 'armchair-red-right', x: 1, y: 8, id: 'library-armchair-west' },
    { prefab: 'side-table-lamp', x: 3, y: 7 },
    { prefab: 'armchair-red-left', x: 4, y: 8, id: 'library-armchair-center' },
    { prefab: 'rug-rose-5x3', x: 7, y: 8 },
    { prefab: 'armchair-blue-right', x: 7, y: 8, id: 'library-armchair-right' },
    { prefab: 'side-table-lamp', x: 9, y: 7 },
    { prefab: 'armchair-blue-left', x: 10, y: 8, id: 'library-armchair-east' },
  ],
}
