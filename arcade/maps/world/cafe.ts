import type { RoomLayout } from '../compose.ts'

/**
 * The Café, below the Common Room and entered through a door in its top wall.
 * Coordinates are tiles from the room's top-left corner.
 *
 *   window bar ── fish tank ── door ── menu, counter
 *   table for four          tables for two
 */
export const cafe: RoomLayout = {
  room: {
    id: 'cafe',
    // Shares its left wall with the Library.
    x: 12,
    y: 16,
    width: 14,
    height: 12,
    wallpaper: 'teal',
    floor: 'stone-tile',
    doors: [7],
  },
  placements: [
    // A bar under the window.
    { prefab: 'window-curtains-red', x: 1, y: 0 },
    { prefab: 'counter-left', x: 1, y: 3 },
    { prefab: 'counter-drawers', x: 2, y: 3 },
    { prefab: 'counter-cupboard', x: 3, y: 3 },
    { prefab: 'counter-right', x: 4, y: 3 },
    { prefab: 'bar-stool-red', x: 1, y: 4, id: 'window-stool-1' },
    { prefab: 'bar-stool-red', x: 3, y: 4, id: 'window-stool-2' },
    { prefab: 'fish-tank', x: 5, y: 2 },

    // The counter, with the menu above it.
    { prefab: 'chalkboard', x: 9, y: 0 },
    { prefab: 'string-lights', x: 11, y: 0 },
    { prefab: 'counter-left', x: 9, y: 3 },
    { prefab: 'counter-cupboard', x: 10, y: 3 },
    { prefab: 'counter-drawers', x: 11, y: 3 },
    { prefab: 'counter-right', x: 12, y: 3 },
    { prefab: 'espresso-machine', x: 9, y: 2, id: 'cafe-coffee' },
    { prefab: 'coffee-cup', x: 10, y: 2 },
    { prefab: 'donut-display', x: 11, y: 2 },

    // A table for four.
    { prefab: 'rug-green-5x5', x: 2, y: 6 },
    { prefab: 'chair-white-right', x: 2, y: 7, id: 'cafe-four-west-1' },
    { prefab: 'chair-white-right', x: 2, y: 9, id: 'cafe-four-west-2' },
    { prefab: 'dining-table', x: 3, y: 7 },
    { prefab: 'chair-white-left', x: 6, y: 7, id: 'cafe-four-east-1' },
    { prefab: 'chair-white-left', x: 6, y: 9, id: 'cafe-four-east-2' },
    { prefab: 'teacup', x: 4, y: 8 },
    { prefab: 'plate-food', x: 4, y: 9 },

    // Tables for two.
    { prefab: 'rug-rose-5x6', x: 8, y: 5 },
    { prefab: 'cafe-table', x: 9, y: 6, id: 'cafe-table-1' },
    { prefab: 'cafe-table', x: 9, y: 9, id: 'cafe-table-2' },
  ],
}
