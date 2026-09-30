import type { RoomLayout } from '../compose.ts'

/**
 * The Common Room: where everyone arrives. Coordinates are tiles from the
 * room's top-left corner; the wall is rows 0 to 2 and the floor starts at row 3.
 *
 *   x 1         9        16          21      24
 *     ┌─────────┬────────┬───────────┬───────┐
 *     │ fire-   │ lift,  │ coffee    │ arcade│  y 3-6
 *     │ place   │ arrival│ bar       │ darts │
 *     ├─────────┤ long   ├───────────┴───────┤
 *     │ sofas   │ table  │ pool table        │  y 7-11
 *     │         │        ├───────────────────┤
 *     │         │        │ armchairs, jukebox│  y 12-15
 *     └─ door to Library ┴── door to Café ───┘
 */
export const commonRoom: RoomLayout = {
  room: {
    id: 'common-room',
    x: 0,
    y: 0,
    width: 26,
    height: 16,
    wallpaper: 'wood-stripes',
    floor: 'golden-wood',
    // The Library and Café below close this room with their own top walls.
    bottomWall: false,
  },
  spawns: [
    { name: 'spawn-center', x: 12, y: 5 },
    { name: 'elevator', x: 11, y: 4 },
  ],
  placements: [
    // Fireplace lounge: armchairs face each other across a table, the cat's
    // bed by the fire, a lamp and a side table at either end.
    { prefab: 'bookshelf-books', x: 1, y: 1 },
    { prefab: 'wall-candle', x: 3, y: 1 },
    { prefab: 'fireplace', x: 4, y: 1, id: 'fireplace' },
    { prefab: 'wall-candle', x: 6, y: 1 },
    { prefab: 'window-tall', x: 7, y: 0 },
    { prefab: 'rug-rose-8x4', x: 1, y: 4 },
    { prefab: 'pet-bed', x: 3, y: 3, id: 'pet-spot' },
    { prefab: 'floor-lamp', x: 1, y: 5 },
    { prefab: 'armchair-blue-right', x: 2, y: 5, id: 'lounge-armchair-west' },
    { prefab: 'coffee-table', x: 4, y: 5 },
    { prefab: 'books-fruit', x: 4, y: 5 },
    { prefab: 'armchair-red-left', x: 6, y: 5, id: 'lounge-armchair-east' },
    { prefab: 'side-table-lamp', x: 8, y: 4 },

    // Arrival: the elevator framed by plants, a mat to step out onto. The one on the
    // right is the shared plant, beside the Notice Board: the two daily things are the
    // first things everyone passes.
    { prefab: 'pendulum-clock', x: 9, y: 1 },
    { prefab: 'plant-tall', x: 10, y: 1 },
    { prefab: 'elevator', x: 11, y: 1, id: 'elevator' },
    { prefab: 'shared-plant', x: 13, y: 2, id: 'shared-plant' },
    { prefab: 'noticeboard', x: 14, y: 1, id: 'noticeboard' },
    { prefab: 'mat-red', x: 11, y: 3 },

    // Coffee bar: stools pulled right up to the counter, with the tile in front of the
    // espresso machine left free so "Get coffee" is not beaten by a nearer seat.
    { prefab: 'window-small', x: 16, y: 0 },
    { prefab: 'cuckoo-clock', x: 19, y: 0 },
    { prefab: 'counter-left', x: 16, y: 3 },
    { prefab: 'counter-cupboard', x: 17, y: 3 },
    { prefab: 'counter-drawers', x: 18, y: 3 },
    { prefab: 'counter-cupboard', x: 19, y: 3 },
    { prefab: 'counter-right', x: 20, y: 3 },
    { prefab: 'espresso-machine', x: 16, y: 2, id: 'coffee-bar' },
    { prefab: 'coffee-cup', x: 17, y: 2 },
    { prefab: 'donut-display', x: 19, y: 2 },
    { prefab: 'bar-stool-yellow', x: 17, y: 4, id: 'bar-stool-1' },
    { prefab: 'bar-stool-yellow', x: 19, y: 4, id: 'bar-stool-2' },

    // Arcade: cabinets under a scoreboard screen.
    { prefab: 'wall-screen', x: 21, y: 0 },
    { prefab: 'arcade-cabinet', x: 21, y: 1, id: 'arcade-1' },
    // The middle cabinet plays the daily puzzle.
    { prefab: 'puzzle-cabinet', x: 22, y: 1, id: 'puzzle-cabinet' },
    { prefab: 'arcade-cabinet', x: 23, y: 1, id: 'arcade-3' },
    // Darts: players stand at the line and throw at the board the game hangs on the wall
    // straight ahead of it, three tiles up.
    { prefab: 'darts-line', x: 24, y: 5, id: 'darts' },

    // Sofas facing each other across a low table.
    { prefab: 'rug-blue-7x5', x: 1, y: 9 },
    { prefab: 'side-couch-gray-right', x: 1, y: 9, id: 'sofa-west' },
    { prefab: 'coffee-table', x: 3, y: 10 },
    { prefab: 'vase-purple', x: 3, y: 9 },
    { prefab: 'teacup', x: 4, y: 10 },
    { prefab: 'side-couch-gray-left', x: 5, y: 9, id: 'sofa-east' },
    { prefab: 'side-table-lamp', x: 7, y: 8 },
    { prefab: 'plant-tall', x: 1, y: 13 },

    // The long table: six chairs, plates and flowers.
    { prefab: 'rug-green-5x9', x: 10, y: 7 },
    { prefab: 'chair-red-right', x: 10, y: 8, id: 'long-table-west-1' },
    { prefab: 'chair-red-right', x: 10, y: 10, id: 'long-table-west-2' },
    { prefab: 'chair-red-right', x: 10, y: 12, id: 'long-table-west-3' },
    { prefab: 'dining-table-long', x: 11, y: 8 },
    { prefab: 'chair-red-left', x: 14, y: 8, id: 'long-table-east-1' },
    { prefab: 'chair-red-left', x: 14, y: 10, id: 'long-table-east-2' },
    { prefab: 'chair-red-left', x: 14, y: 12, id: 'long-table-east-3' },
    { prefab: 'plate-food', x: 11, y: 9 },
    { prefab: 'glasses', x: 13, y: 9 },
    { prefab: 'vase-yellow', x: 12, y: 10 },
    { prefab: 'pizza', x: 12, y: 12 },
    { prefab: 'plate-salad', x: 13, y: 11 },
    { prefab: 'plate-food', x: 11, y: 13 },

    // The party corner, beside the long table: a plain table that gets a cake and
    // balloons on someone's birthday or work anniversary (interactions/party.ts).
    { prefab: 'party-table', x: 8, y: 12, id: 'party' },

    // Pool, with stools to watch from.
    { prefab: 'rug-rose-7x5', x: 17, y: 7 },
    { prefab: 'pool-table', x: 18, y: 8, id: 'pool-table' },
    { prefab: 'stool-red', x: 23, y: 8, id: 'pool-stool-1' },
    { prefab: 'stool-red', x: 23, y: 10, id: 'pool-stool-2' },

    // A quiet corner by the Café door, with the jukebox.
    { prefab: 'rug-green-6x3', x: 16, y: 12 },
    { prefab: 'armchair-yellow-right', x: 16, y: 13, id: 'corner-armchair-west' },
    { prefab: 'coffee-table', x: 18, y: 13 },
    { prefab: 'vase-blue', x: 19, y: 12 },
    { prefab: 'armchair-yellow-left', x: 20, y: 13, id: 'corner-armchair-east' },
    { prefab: 'jukebox', x: 23, y: 12, id: 'jukebox' },
  ],
}
