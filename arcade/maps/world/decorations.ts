import type { SeasonId } from '../../config/seasons.ts'
import type { Placement } from '../compose.ts'

/**
 * What each season adds to the Common Room, in the room's tiles (see commonRoom.ts).
 * The build bakes each season into its own map, `data/maps/world.<season>.json`, and
 * checks that the decorations keep every walkway, door, seat and interactable free
 * (`findDecorationProblems`). Decor stays on the walls, in corners and on tables;
 * the doors get a matching pair of guards and a mat, so a season reads as designed.
 */
export const seasonDecorations: Record<SeasonId, Placement[]> = {
  halloween: [
    // Flags over the fireplace and the elevator, cobwebs in both top corners.
    { prefab: 'cobweb-spider', x: 1, y: 0 },
    { prefab: 'halloween-bunting-4', x: 3, y: 0 },
    { prefab: 'halloween-bunting-4', x: 10, y: 0 },
    { prefab: 'hanging-spider', x: 18, y: 0 },
    { prefab: 'cobweb', x: 24, y: 0 },

    // The fireside: a glowing pumpkin by the hearth, the cauldron bubbling by the lounge.
    { prefab: 'glowing-pumpkin', x: 6, y: 2 },
    { prefab: 'witch-cauldron', x: 1, y: 7 },

    // Pumpkin lanterns guard the Library door, a pile of pumpkins in the corner.
    { prefab: 'pumpkin-pile', x: 2, y: 14 },
    { prefab: 'pumpkin-lantern', x: 4, y: 14 },
    { prefab: 'pumpkin-lantern', x: 7, y: 14 },
    { prefab: 'halloween-mat', x: 5, y: 15 },
    { prefab: 'halloween-mat', x: 19, y: 15 },

    // Sweets on the coffee counter, a witch's hat left at the long table and the
    // corner table, a ghost watching the pool game.
    { prefab: 'candy-bucket', x: 18, y: 2 },
    { prefab: 'witch-hat', x: 11, y: 11 },
    { prefab: 'witch-hat', x: 18, y: 12 },
    { prefab: 'sheet-ghost', x: 16, y: 7 },
  ],
  diwali: [
    // Strings of lights along the top of the wall, candles on every table.
    { prefab: 'string-lights', x: 1, y: 0 },
    { prefab: 'string-lights', x: 3, y: 0 },
    { prefab: 'string-lights', x: 5, y: 0 },
    { prefab: 'string-lights', x: 10, y: 0 },
    { prefab: 'string-lights', x: 12, y: 0 },
    { prefab: 'string-lights', x: 14, y: 0 },
    { prefab: 'glowing-candles', x: 18, y: 2 },
    { prefab: 'glowing-candles', x: 12, y: 8 },
    { prefab: 'glowing-candles', x: 18, y: 12 },
  ],
  christmas: [
    // The tree at the head of the long table, facing the elevator, with a present.
    { prefab: 'christmas-tree', x: 14, y: 5 },
    { prefab: 'present-red', x: 13, y: 7 },
    // Nutcrackers guard the Library door.
    { prefab: 'nutcracker', x: 4, y: 14 },
    { prefab: 'nutcracker', x: 7, y: 14 },
    { prefab: 'wreath-lights', x: 18, y: 0 },
    { prefab: 'stocking', x: 4, y: 0 },
    { prefab: 'stocking', x: 5, y: 0 },
    { prefab: 'table-tree', x: 12, y: 8 },
    { prefab: 'snow-globe', x: 18, y: 13 },
    { prefab: 'present-blue', x: 2, y: 15 },
    { prefab: 'present-red', x: 3, y: 15 },
  ],
}
