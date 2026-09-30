import { seasons } from '../config/seasons.ts'
import lockableItemsFile from '../data/lockable-items.json'
import puzzlesFile from '../data/puzzles.json'
import { isPrefabId, prefabs, type Prefab, type PrefabId } from './prefabs.ts'

/**
 * What the Home decorator offers, by category. Rugs and wall decor list every prefab of
 * their kind, so new ones show up by themselves; the other categories are picked by hand.
 * Fixtures of the Common Room (counters, the elevator, the notice board, the shared plant,
 * the puzzle cabinet, the darts line, the party table), the parts every Home already has (the guestbook,
 * the doormat) and the Common Room's season decorations are left out. Seasonal lists the
 * items seasons grant, and Puzzles the items daily puzzles grant.
 */

export interface HomeCategory {
  id: string
  label: string
  items: readonly PrefabId[]
}

const NOT_FOR_HOMES = new Set<PrefabId>([
  'noticeboard',
  'elevator',
  'doormat',
  'guestbook',
  'shared-plant',
  'puzzle-cabinet',
  'darts-line',
  'party-table',
  // Season decorations for the Common Room (maps/world/decorations.ts).
  'halloween-mat',
  'halloween-bunting-4',
  'halloween-bunting-6',
  'autumn-garland-3',
  'cobweb',
  'cobweb-spider',
  'hanging-spider',
  'wreath',
  'wreath-lights',
  'stocking',
  'snowman-picture',
  'santa-picture',
])

/** The daily puzzles' rewards, in the order of the days. They get a category of their own. */
const puzzleItems: PrefabId[] = puzzlesFile.map((puzzle) => puzzle.item).filter(isPrefabId)
const inPuzzles = new Set(puzzleItems)

const ofKind = (kind: 'rug' | 'wall'): PrefabId[] =>
  Object.keys(prefabs)
    .filter(isPrefabId)
    .filter((id) => prefabs[id].kind === kind && !NOT_FOR_HOMES.has(id) && !inPuzzles.has(id))

export const homeCategories: readonly HomeCategory[] = [
  {
    id: 'seating',
    label: 'Seating',
    items: [
      'couch-gray',
      'couch-white',
      'couch-brown',
      'couch-lavender',
      'side-couch-gray-left',
      'side-couch-gray-right',
      'side-couch-blue-left',
      'side-couch-blue-right',
      'side-couch-lavender-left',
      'side-couch-lavender-right',
      'side-couch-brown-left',
      'side-couch-brown-right',
      'armchair-white-left',
      'armchair-white-right',
      'armchair-blue-left',
      'armchair-blue-right',
      'armchair-yellow-left',
      'armchair-yellow-right',
      'armchair-red-left',
      'armchair-red-right',
      'chair-red-left',
      'chair-red-right',
      'chair-dark-left',
      'chair-dark-right',
      'chair-white-left',
      'chair-white-right',
      'pouf-white',
      'pouf-beige',
      'stool-yellow',
      'stool-red',
      'stool-blue',
      'bar-stool-yellow',
      'bar-stool-red',
    ],
  },
  {
    id: 'tables',
    label: 'Tables',
    items: [
      'coffee-table',
      'coffee-table-long',
      'dining-table',
      'dining-table-oak',
      'dining-table-long',
      'side-table-lamp',
      'cafe-table',
      'reading-table',
      'books-fruit',
      'fruit-bowl',
      'teacup',
      'glasses',
      'pizza',
      'plate-food',
      'plate-salad',
    ],
  },
  {
    id: 'beds',
    label: 'Beds',
    items: [
      'bed-double-blue',
      'bed-double-sky',
      'bed-double-green',
      'bed-double-yellow',
      'bed-single-blue',
      'bed-single-sky',
      'bed-single-green',
      'bed-single-yellow',
    ],
  },
  {
    id: 'storage',
    label: 'Storage',
    items: [
      'wardrobe',
      'cabinet-glass',
      'cabinet-wood',
      'dresser-brown',
      'dresser-oak',
      'dresser-beige',
      'nightstand-oak',
      'nightstand-brown',
      'nightstand-beige',
      'drawers-green',
      'drawers-orange',
      'drawers-sky',
      'bookshelf-books',
      'bookshelf-jars',
      'bookshelf-bottles',
      'library-shelf',
      'library-bookcase',
    ],
  },
  {
    id: 'plants',
    label: 'Plants',
    items: [
      'plant-tree',
      'plant-tall',
      'plant-palm',
      'plant-small',
      'vase-blue',
      'vase-purple',
      'vase-yellow',
      // Cuttings of the shared plant, unlocked by watering it until it blooms.
      'lavender-cutting',
      'blue-daisy-cutting',
      'cosmos-cutting',
    ],
  },
  {
    id: 'lights',
    label: 'Lights',
    items: ['floor-lamp', 'floor-lamp-blue', 'floor-lamp-red', 'table-lamp-red', 'table-lamp-blue', 'candle', 'fireplace'],
  },
  { id: 'rugs', label: 'Rugs', items: ofKind('rug') },
  { id: 'wall', label: 'Wall decor', items: ofKind('wall') },
  {
    id: 'fun',
    label: 'Fun',
    items: [
      'tv',
      'old-tv',
      'piano',
      'jukebox',
      'arcade-cabinet',
      'arcade-cabinet-2',
      'pool-table',
      'cue-rack',
      // Won at darts.
      'darts-trophy',
      // Unlocked on your birthday. The anniversary plaque is under Wall decor.
      'birthday-cake',
      'fish-tank',
      'pet-bed',
      'teddy-bear',
      'teddy-bear-scarf',
      'globe',
      'library-globe',
      'pendulum-clock',
      'coffee-maker',
    ],
  },
  { id: 'puzzles', label: 'Puzzles', items: puzzleItems },
  {
    id: 'seasonal',
    label: 'Seasonal',
    items: Object.values(seasons).flatMap((season) => season.items.filter(isPrefabId)),
  },
]

/** How a player gets an item they have not unlocked yet, for the catalog to show. */
export interface LockableItem {
  /** Short and plain: "Solve a daily puzzle". */
  hint: string
}

const lockableFile: Record<string, LockableItem> = lockableItemsFile

/**
 * Items a player must unlock before placing them, by id. The list is
 * `data/lockable-items.json`, which the server reads too (`grant_item` in
 * `gp_arcade_profile.py`), so both sides use the same ids. Every other item is free.
 */
export const lockableItems: ReadonlyMap<PrefabId, LockableItem> = new Map(
  Object.entries(lockableFile).filter((entry): entry is [PrefabId, LockableItem] => isPrefabId(entry[0])),
)

/**
 * A catalog item's name, with the way it faces when the catalog also has its mirror
 * image under the same name: "Gray side couch, facing left".
 */
export function catalogName(id: PrefabId): string {
  const prefab: Prefab = prefabs[id]
  const facing = prefab.seats?.find((seat) => seat.facing)?.facing
  return facing === 'left' || facing === 'right' ? `${prefab.name}, facing ${facing}` : prefab.name
}
