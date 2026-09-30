import type { PropSheetName, TilesetName } from '../config/packFiles.ts'
import type { Facing, InteractableKind } from '../world/interactables.ts'
import { gid, sheetBlock, type TileMatrix } from './tiled.ts'

/**
 * The furniture catalog. A prefab is one placeable thing: its tiles, how it
 * sits in the room, and what people can do with it. Placing a prefab (see
 * compose.ts) emits its tiles, collision, seats, interactable and animated
 * sprite together, so a layout is just a list of prefab ids and positions.
 *
 * Ids are stable: saved Home layouts store them. Rename an id only together
 * with a migration of saved layouts.
 */

/**
 * Where a prefab goes and how it layers:
 * - `rug`: on the floor, under everything, walkable.
 * - `wall`: on a wall face (windows, paintings, boards). The wall collides.
 * - `furniture`: stands on the floor. Its bottom `footprint` rows collide; upper
 *   rows over open floor draw above avatars, so people can walk behind it.
 * - `tabletop`: stands on furniture (machines, candles). Never collides.
 */
export type PrefabKind = 'rug' | 'wall' | 'furniture' | 'tabletop'

/** A place to sit, in tiles from the prefab's top-left. The avatar's feet go to its bottom middle. */
export interface Seat {
  x: number
  y: number
  width?: number
  /** The way a seated avatar faces. Leave out for stools, which work either way. */
  facing?: Facing
}

/** What pressing E next to the prefab does. The kind's handler names it ("Get coffee"). */
export interface Use {
  kind: Exclude<InteractableKind, 'seat'>
}

/** An animated sheet drawn as a sprite over the prefab's bounds: one row of equal frames. */
export interface PropSprite {
  sheet: PropSheetName
  frames: number
  fps: number
}

export interface Prefab {
  /** Shown in the Home furniture catalog. */
  name: string
  kind: PrefabKind
  /**
   * 0 is an empty cell. Most sprite prefabs have tiles that are all 0 and only give
   * their size; a sprite can also draw over real tiles, like lights on a tree.
   */
  tiles: TileMatrix
  /** Furniture: how many bottom rows collide (their empty cells do not). Defaults to every row. */
  footprint?: number
  /**
   * Furniture the game draws by itself, like the shared plant: its whole footprint
   * collides even though its tiles are empty.
   */
  solid?: boolean
  /** Drawn over `tiles` in the same cells, like papers on a table. */
  overlay?: TileMatrix
  seats?: Seat[]
  use?: Use
  sprite?: PropSprite
}

// ---- Helpers -----------------------------------------------------------------

/** Tiles picked one by one from a sheet; `null` leaves a cell empty. */
function pick(sheet: TilesetName, rows: (number | null)[][]): TileMatrix {
  return rows.map((row) => row.map((id) => (id === null ? 0 : gid(sheet, id))))
}

function blank(width: number, height: number): TileMatrix {
  return Array.from({ length: height }, () => new Array<number>(width).fill(0))
}

const lr = (topLeft: number, width: number, height: number) => sheetBlock('living_room', topLeft, width, height)
const gen = (topLeft: number, width: number, height: number) => sheetBlock('generic', topLeft, width, height)
const kt = (topLeft: number, width: number, height: number) => sheetBlock('kitchen', topLeft, width, height)
const cl = (topLeft: number, width: number, height: number) => sheetBlock('classroom_library', topLeft, width, height)
const bm = (topLeft: number, width: number, height: number) => sheetBlock('basement', topLeft, width, height)
const ice = (topLeft: number, width: number, height: number) => sheetBlock('ice_cream', topLeft, width, height)
const bd = (topLeft: number, width: number, height: number) => sheetBlock('bedroom', topLeft, width, height)
const hw = (topLeft: number, width: number, height: number) => sheetBlock('halloween', topLeft, width, height)
const xm = (topLeft: number, width: number, height: number) => sheetBlock('christmas', topLeft, width, height)
const gro = (topLeft: number, width: number, height: number) => sheetBlock('grocery', topLeft, width, height)
const mus = (topLeft: number, width: number, height: number) => sheetBlock('music_sport', topLeft, width, height)
const gym = (topLeft: number, width: number, height: number) => sheetBlock('gym', topLeft, width, height)
const art = (topLeft: number, width: number, height: number) => sheetBlock('art', topLeft, width, height)
const bday = (topLeft: number, width: number, height: number) => sheetBlock('birthday', topLeft, width, height)
const fish = (topLeft: number, width: number, height: number) => sheetBlock('fishing', topLeft, width, height)

const rug = (name: string, tiles: TileMatrix): Prefab => ({ name, kind: 'rug', tiles })
const wall = (name: string, tiles: TileMatrix): Prefab => ({ name, kind: 'wall', tiles })

/** Furniture whose upper rows people can walk behind. */
const tall = (name: string, tiles: TileMatrix, footprint = 1): Prefab => ({
  name,
  kind: 'furniture',
  tiles,
  footprint,
})

/** A 2 x 2 basement armchair. The seat spans both columns: the chair is drawn across the seam. */
const armchair = (name: string, topLeft: number, facing: Facing): Prefab => ({
  name,
  kind: 'furniture',
  tiles: bm(topLeft, 2, 2),
  seats: [{ x: 0, y: 1, width: 2, facing }],
})

/** A 3 x 2 living-room couch seen from the front: the back, then a seat row for two. */
const couch = (name: string, topLeft: number): Prefab => ({
  name,
  kind: 'furniture',
  tiles: lr(topLeft, 3, 2),
  seats: [
    { x: 0, y: 1, width: 1.5, facing: 'down' },
    { x: 1.5, y: 1, width: 1.5, facing: 'down' },
  ],
})

/**
 * The basement stools are drawn across a tile seam, like the armchairs: each
 * stool is a left half and a right half on two tiles that are not always
 * neighbours on the sheet. `halves` are the sheet ids of the two seat tiles;
 * the legs are the row below.
 */
type StoolHalves = readonly [left: number, right: number]

const stool = (name: string, [left, right]: StoolHalves): Prefab => ({
  name,
  kind: 'furniture',
  tiles: pick('basement', [
    [left, right],
    [left + 16, right + 16],
  ]),
  seats: [{ x: 0, y: 1, width: 2 }],
})

/**
 * A stool pulled up to a counter. Place it on the counter's front row: the
 * seat draws over the counter front and only the legs stand on the floor.
 */
const barStool = (name: string, [left, right]: StoolHalves): Prefab => ({
  name,
  kind: 'furniture',
  tiles: pick('basement', [
    [null, null],
    [left + 16, right + 16],
  ]),
  overlay: pick('basement', [
    [left, right],
    [null, null],
  ]),
  seats: [{ x: 0, y: 1, width: 2 }],
})

const YELLOW_STOOL: StoolHalves = [410, 414]
const RED_STOOL: StoolHalves = [411, 415]
const BLUE_STOOL: StoolHalves = [412, 413]

/**
 * A living-room couch seen from the side, seating two. The sheet draws it as a
 * top, a seat row, a bottom row with legs, and a middle row that lengthens it.
 * `left` is the sheet id of its top-left tile.
 */
const sideCouch = (name: string, left: number, facing: Facing): Prefab => ({
  name,
  kind: 'furniture',
  tiles: pick('living_room', [
    [left, left + 1],
    [left + 16, left + 17],
    [left + 48, left + 49],
    [left + 32, left + 33],
  ]),
  seats: [
    { x: 0, y: 1.1, width: 2, facing },
    { x: 0, y: 2.3, width: 2, facing },
  ],
})

/** A kitchen chair seen from the side. */
const chair = (name: string, top: number, facing: Facing): Prefab => ({
  name,
  kind: 'furniture',
  tiles: kt(top, 1, 2),
  seats: [{ x: 0, y: 1, facing }],
})

/**
 * A kitchen table seen from above, `length` rows long: the top row, middle
 * rows, then the row with legs. The table is drawn 2 tiles wide, centred on 3
 * columns, so chairs go right beside it.
 */
const diningTable = (name: string, top: number, length: number): Prefab => ({
  name,
  kind: 'furniture',
  tiles: pick(
    'kitchen',
    Array.from({ length }, (_, row) => {
      const start = row === 0 ? top : row === length - 1 ? top + 32 : top + 16
      return [start, start + 1, start + 2]
    }),
  ),
})

/**
 * A bordered rug of any size, built from the generic sheet's nine slices:
 * corners at `corner` (top-left), +1 (top-right), +16 (bottom-left) and +17
 * (bottom-right); edges at +2 (top), +18 (bottom), +32 (left) and +33 (right);
 * the field at +34.
 */
const borderedRug = (name: string, corner: number, width: number, height: number): Prefab =>
  rug(
    name,
    pick(
      'generic',
      Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => {
          const column = x === 0 ? 0 : x === width - 1 ? 1 : 2
          const row = y === 0 ? 0 : y === height - 1 ? 16 : 32
          return corner + row + column
        }),
      ),
    ),
  )
const ROSE_RUG = 355
const BLUE_RUG = 403
const GREEN_RUG = 390

const tabletop = (name: string, tiles: TileMatrix): Prefab => ({ name, kind: 'tabletop', tiles })

const animated = (
  name: string,
  kind: PrefabKind,
  sheet: PropSheetName,
  size: { width: number; height: number; footprint?: number },
  frames: number,
  fps: number,
): Prefab => ({
  name,
  kind,
  tiles: blank(size.width, size.height),
  footprint: size.footprint,
  sprite: { sheet, frames, fps },
})

/**
 * A string of Halloween flags along the top of a wall: a bat, a pumpkin, a ghost and a
 * pumpkin again, repeated. Each tile carries its own piece of string, so any length joins up.
 */
const bunting = (name: string, length: number): Prefab => {
  const flags = [1, 3, 2, 3]
  return wall(name, pick('halloween', [Array.from({ length }, (_, index) => flags[index % flags.length] ?? 1)]))
}

/**
 * An autumn-leaf garland swagged along a wall, `length` tiles wide, with a strand
 * hanging down at each end.
 */
const garland = (name: string, length: number): Prefab =>
  wall(
    name,
    pick('halloween', [
      Array.from({ length }, (_, index) => (index === 0 ? 100 : index === length - 1 ? 102 : 101)),
      Array.from({ length }, (_, index) => (index === 0 ? 116 : index === length - 1 ? 118 : null)),
    ]),
  )

// ---- Catalog -----------------------------------------------------------------

export const prefabs = {
  // Rugs
  'rug-red-gold': rug('Red and gold rug', gen(73, 4, 3)),
  'rug-blue-gold': rug('Blue and gold rug', gen(121, 4, 3)),
  'rug-blue-gold-tall': rug('Tall blue and gold rug', gen(93, 3, 4)),
  'rug-red-gold-tall': rug('Tall red and gold rug', gen(157, 3, 4)),
  'rug-purple': rug('Purple rug', gen(348, 4, 4)),
  'rug-green-border': rug('Green bordered rug', gen(704, 3, 2)),
  'rug-blue-border': rug('Blue bordered rug', gen(736, 3, 2)),
  'mat-red': rug('Red mat', gen(169, 2, 2)),
  'mat-green': rug('Green mat', gen(171, 2, 2)),
  'mat-blue': rug('Blue mat', gen(203, 2, 2)),
  // Furniture rather than a rug so it can lie on one.
  'pet-bed': { name: 'Pet bed', kind: 'furniture', tiles: bd(66, 1, 2), footprint: 1, use: { kind: 'pet' } },

  // Wall decor
  'window-tall': wall('Tall window', lr(360, 2, 3)),
  'window-tall-white': wall('Tall white window', lr(374, 2, 3)),
  'window-curtains-red': wall('Window with red curtains', gen(725, 3, 3)),
  'window-curtains-gray': wall('Window with gray curtains', gen(728, 3, 3)),
  'window-curtains-beige': wall('Window with beige curtains', gen(731, 3, 3)),
  'window-small': wall('Small window', gen(694, 2, 2)),
  'painting-landscape': wall('Landscape painting', lr(448, 1, 2)),
  'painting-sunset': wall('Sunset painting', lr(480, 1, 2)),
  'painting-tall': wall('Tall painting', lr(512, 1, 2)),
  'world-map': wall('World map', lr(362, 2, 2)),
  'string-lights': wall('String lights', lr(58, 2, 1)),
  'chalkboard': wall('Chalkboard', cl(93, 2, 2)),
  'noticeboard': {
    name: 'Notice board',
    kind: 'wall',
    tiles: cl(96, 2, 1),
    use: { kind: 'noticeboard' },
  },
  'elevator': { name: 'Elevator', kind: 'wall', tiles: gen(497, 2, 2), use: { kind: 'elevator' } },
  'cuckoo-clock': animated('Cuckoo clock', 'wall', 'cuckoo_clock', { width: 1, height: 2 }, 10, 4),
  'wall-candle': animated('Wall candle', 'wall', 'wall_candle', { width: 1, height: 2 }, 3, 5),

  // Living room
  'fireplace': animated('Fireplace', 'furniture', 'fireplace', { width: 2, height: 3, footprint: 1 }, 3, 6),
  'pendulum-clock': animated('Pendulum clock', 'furniture', 'pendulum_clock', { width: 1, height: 3, footprint: 1 }, 4, 3),
  'fish-tank': animated('Fish tank', 'furniture', 'fish_tank', { width: 2, height: 2, footprint: 1 }, 8, 6),
  'old-tv': animated('Old TV', 'furniture', 'old_tv', { width: 2, height: 2, footprint: 1 }, 6, 6),
  'piano': animated('Piano', 'furniture', 'wall_piano', { width: 2, height: 2, footprint: 1 }, 8, 4),
  'bookshelf-books': tall('Bookshelf', lr(394, 2, 3)),
  'bookshelf-jars': tall('Pantry shelf', lr(396, 2, 3)),
  'bookshelf-bottles': tall('Bottle shelf', lr(398, 2, 3)),
  'floor-lamp': tall('Floor lamp', lr(155, 1, 2)),
  'globe': tall('Globe', lr(364, 1, 2)),
  'plant-tree': tall('Potted tree', lr(10, 2, 3)),
  'plant-tall': tall('Tall plant', lr(12, 1, 3)),
  'plant-palm': tall('Palm', lr(13, 2, 2)),
  'plant-small': tall('Small plant', lr(80, 1, 2)),
  'couch-gray': couch('Gray couch', 449),
  'couch-white': couch('White couch', 452),
  'couch-brown': couch('Brown couch', 455),
  'couch-lavender': couch('Lavender couch', 487),
  'armchair-white-left': armchair('White armchair', 530, 'left'),
  'armchair-blue-left': armchair('Blue armchair', 532, 'left'),
  'armchair-yellow-left': armchair('Yellow armchair', 562, 'left'),
  'armchair-red-left': armchair('Red armchair', 564, 'left'),
  'armchair-blue-right': armchair('Blue armchair', 594, 'right'),
  'armchair-white-right': armchair('White armchair', 596, 'right'),
  'armchair-red-right': armchair('Red armchair', 626, 'right'),
  'armchair-yellow-right': armchair('Yellow armchair', 628, 'right'),
  'coffee-table': { name: 'Coffee table', kind: 'furniture', tiles: lr(179, 2, 2) },
  'coffee-table-long': { name: 'Long coffee table', kind: 'furniture', tiles: bm(262, 4, 2) },
  'candle': animated('Candles', 'tabletop', 'candle', { width: 1, height: 2 }, 3, 5),

  // Game corner
  'arcade-cabinet': {
    name: 'Arcade cabinet',
    kind: 'furniture',
    tiles: bm(656, 1, 3),
    footprint: 1,
    use: { kind: 'arcade' },
  },
  'arcade-cabinet-2': {
    name: 'Arcade cabinet',
    kind: 'furniture',
    tiles: bm(657, 1, 3),
    footprint: 1,
    use: { kind: 'arcade' },
  },
  // The daily puzzle (interactions/puzzle.ts). Not for Homes: see homeCatalog.ts.
  'puzzle-cabinet': {
    name: 'Puzzle cabinet',
    kind: 'furniture',
    tiles: bm(657, 1, 3),
    footprint: 1,
    use: { kind: 'puzzle' },
  },
  // Where players throw darts (interactions/darts.ts). The game draws the tape line on the
  // floor and the dartboard on the wall straight ahead of it; the pack has no dartboard.
  // Not for Homes: see homeCatalog.ts.
  'darts-line': { name: 'Darts line', kind: 'rug', tiles: blank(1, 1), use: { kind: 'darts' } },
  // The weekly darts winner's trophy (gp_arcade_darts_week.py).
  'darts-trophy': tall('Darts trophy', mus(377, 1, 2)),
  // The party corner (interactions/party.ts): a plain table most days. On someone's
  // birthday or work anniversary the game puts a cake on it and ties balloons to it.
  // Not for Homes: see homeCatalog.ts.
  'party-table': { name: 'Party table', kind: 'furniture', tiles: lr(179, 2, 2), use: { kind: 'party' } },
  // Unlocked on your own birthday and work anniversary (claim_celebration_items).
  'birthday-cake': tabletop('Birthday cake', bday(2, 2, 1)),
  'anniversary-plaque': wall('Anniversary plaque', mus(322, 2, 2)),
  'pool-table': { name: 'Pool table', kind: 'furniture', tiles: bm(404, 4, 3) },
  'pouf-white': { name: 'White pouf', kind: 'furniture', tiles: bm(684, 2, 2), seats: [{ x: 0, y: 1, width: 2 }] },
  'pouf-beige': { name: 'Beige pouf', kind: 'furniture', tiles: bm(686, 2, 2), seats: [{ x: 0, y: 1, width: 2 }] },
  'stool-yellow': stool('Yellow stool', YELLOW_STOOL),
  'stool-red': stool('Red stool', RED_STOOL),
  'stool-blue': stool('Blue stool', BLUE_STOOL),
  'jukebox': {
    name: 'Jukebox',
    kind: 'furniture',
    tiles: ice(10, 2, 3),
    footprint: 1,
    use: { kind: 'jukebox' },
  },

  // Coffee and café
  // A counter is built from 1-wide pieces: a left end, any run of middles, a right end.
  'counter-left': { name: 'Counter, left end', kind: 'furniture', tiles: pick('kitchen', [[41], [115]]) },
  'counter-cupboard': { name: 'Counter with cupboard', kind: 'furniture', tiles: pick('kitchen', [[42], [116]]) },
  'counter-drawers': { name: 'Counter with drawers', kind: 'furniture', tiles: pick('kitchen', [[42], [117]]) },
  'counter-right': { name: 'Counter, right end', kind: 'furniture', tiles: pick('kitchen', [[43], [118]]) },
  'espresso-machine': {
    name: 'Espresso machine',
    kind: 'tabletop',
    tiles: kt(477, 1, 2),
    use: { kind: 'coffee' },
  },
  'coffee-maker': { name: 'Coffee maker', kind: 'tabletop', tiles: kt(413, 2, 2), use: { kind: 'coffee' } },
  'coffee-cup': animated('Coffee cup', 'tabletop', 'coffee', { width: 1, height: 2 }, 6, 6),
  'donut-display': { name: 'Donut display', kind: 'tabletop', tiles: kt(612, 2, 2) },
  'cafe-table': {
    name: 'Café table',
    kind: 'furniture',
    tiles: pick('ice_cream', [
      [82, 80, 81],
      [98, 96, 97],
    ]),
    seats: [
      { x: 0, y: 1, facing: 'right' },
      { x: 2, y: 1, facing: 'left' },
    ],
  },

  // Library
  'library-shelf': tall('Library shelf', cl(212, 2, 3)),
  'library-shelf-2': tall('Library shelf', cl(214, 2, 3)),
  'library-shelf-3': tall('Library shelf', cl(216, 2, 3)),
  'library-shelf-4': tall('Library shelf', cl(218, 2, 3)),
  'library-bookcase': tall('Wide bookcase', cl(208, 3, 3)),
  'reading-table': {
    name: 'Reading table',
    kind: 'furniture',
    tiles: pick('classroom_library', [
      [null, 8, null],
      [23, 24, 28],
      [39, 40, 44],
    ]),
    overlay: pick('classroom_library', [
      [null, 9, null],
      [null, 25, null],
      [null, null, null],
    ]),
    seats: [
      { x: 0, y: 2, facing: 'right' },
      { x: 2, y: 2, facing: 'left' },
    ],
  },
  'library-globe': tall('Globe', cl(29, 1, 2)),

  // Seating seen from the side, so sitting shows the sit pose
  'side-couch-gray-left': sideCouch('Gray side couch', 515, 'left'),
  'side-couch-gray-right': sideCouch('Gray side couch', 517, 'right'),
  'side-couch-blue-left': sideCouch('Blue side couch', 519, 'left'),
  'side-couch-blue-right': sideCouch('Blue side couch', 521, 'right'),
  'side-couch-lavender-left': sideCouch('Lavender side couch', 579, 'left'),
  'side-couch-lavender-right': sideCouch('Lavender side couch', 581, 'right'),
  'side-couch-brown-left': sideCouch('Brown side couch', 583, 'left'),
  'side-couch-brown-right': sideCouch('Brown side couch', 585, 'right'),
  'chair-red-right': chair('Red chair', 180, 'right'),
  'chair-red-left': chair('Red chair', 215, 'left'),
  'chair-dark-right': chair('Dark chair', 181, 'right'),
  'chair-dark-left': chair('Dark chair', 214, 'left'),
  'chair-white-right': chair('White chair', 182, 'right'),
  'chair-white-left': chair('White chair', 213, 'left'),
  'bar-stool-yellow': barStool('Yellow bar stool', YELLOW_STOOL),
  'bar-stool-red': barStool('Red bar stool', RED_STOOL),

  // Tables
  'dining-table-long': diningTable('Long table', 243, 7),
  'dining-table': diningTable('Dining table', 246, 4),
  'dining-table-oak': diningTable('Oak table', 291, 4),
  'side-table-lamp': {
    name: 'Side table with lamp',
    kind: 'furniture',
    // The lamp is two tiles tall and stands on the table top.
    tiles: pick('living_room', [[null], [240], [256]]),
    overlay: pick('living_room', [[158], [174], [null]]),
    footprint: 2,
  },

  // Bordered rugs, sized to the groups they sit under
  'rug-rose-8x4': borderedRug('Rose rug', ROSE_RUG, 8, 4),
  'rug-rose-7x5': borderedRug('Rose rug', ROSE_RUG, 7, 5),
  'rug-rose-5x6': borderedRug('Rose rug', ROSE_RUG, 5, 6),
  'rug-rose-5x3': borderedRug('Rose rug', ROSE_RUG, 5, 3),
  'rug-blue-7x5': borderedRug('Blue rug', BLUE_RUG, 7, 5),
  'rug-blue-10x4': borderedRug('Blue rug', BLUE_RUG, 10, 4),
  'rug-green-5x9': borderedRug('Green rug', GREEN_RUG, 5, 9),
  'rug-green-6x3': borderedRug('Green rug', GREEN_RUG, 6, 3),
  'rug-green-5x5': borderedRug('Green rug', GREEN_RUG, 5, 5),

  // Things on tables
  'plate-food': tabletop('Plate of food', kt(352, 1, 1)),
  'plate-salad': tabletop('Salad', kt(385, 1, 1)),
  'pizza': tabletop('Pizza', kt(401, 1, 1)),
  'glasses': tabletop('Glasses', kt(336, 1, 1)),
  'teacup': tabletop('Teacup', kt(353, 1, 1)),
  'books-fruit': tabletop('Books and fruit', lr(227, 2, 1)),
  'fruit-bowl': tabletop('Fruit bowl', lr(144, 1, 2)),
  'vase-blue': tabletop('Vase of blue flowers', bm(47, 1, 2)),
  'vase-purple': tabletop('Vase of purple flowers', bm(79, 1, 2)),
  'vase-yellow': tabletop('Vase of yellow flowers', bm(111, 1, 2)),

  // Game corner extras
  'cue-rack': tall('Cue rack', bm(371, 1, 3)),
  'wall-screen': wall('Wall screen', bm(692, 3, 2)),

  // Homes: beds, storage and lights
  'bed-double-yellow': tall('Yellow double bed', bd(328, 2, 4), 3),
  'bed-double-blue': tall('Blue double bed', bd(330, 2, 4), 3),
  'bed-double-sky': tall('Sky blue double bed', bd(332, 2, 4), 3),
  'bed-double-green': tall('Green double bed', bd(334, 2, 4), 3),
  'bed-single-yellow': tall('Yellow single bed', bd(392, 2, 3), 2),
  'bed-single-blue': tall('Blue single bed', bd(394, 2, 3), 2),
  'bed-single-sky': tall('Sky blue single bed', bd(396, 2, 3), 2),
  'bed-single-green': tall('Green single bed', bd(398, 2, 3), 2),
  'wardrobe': tall('Wardrobe', lr(71, 2, 3)),
  'cabinet-glass': tall('Glass cabinet', lr(75, 2, 3)),
  'cabinet-wood': tall('Wooden cabinet', lr(77, 2, 3)),
  'dresser-brown': tall('Brown dresser', bd(12, 4, 3), 2),
  'dresser-oak': tall('Oak dresser', bd(60, 4, 3), 2),
  'dresser-beige': tall('Beige dresser', bd(108, 4, 3), 2),
  'nightstand-oak': tall('Oak nightstand', bd(166, 1, 2)),
  'nightstand-brown': tall('Brown nightstand', bd(167, 1, 2)),
  'nightstand-beige': tall('Beige nightstand', bd(168, 1, 2)),
  'drawers-green': tall('Green drawers', bd(204, 3, 2)),
  'drawers-orange': tall('Orange drawers', bd(236, 3, 2)),
  'drawers-sky': tall('Sky blue drawers', bd(268, 3, 2)),
  'floor-lamp-blue': tall('Blue floor lamp', lr(156, 1, 3)),
  'floor-lamp-red': tall('Red floor lamp', lr(157, 1, 3)),
  'table-lamp-red': tabletop('Red table lamp', lr(126, 1, 2)),
  'table-lamp-blue': tabletop('Blue table lamp', lr(190, 1, 2)),
  'rug-round-pink': rug('Round pink rug', bd(352, 3, 2)),
  'rug-round-brown': rug('Round brown rug', bd(355, 3, 2)),
  'teddy-bear': tall('Teddy bear', bd(32, 2, 2)),
  'teddy-bear-scarf': tall('Teddy bear with scarf', bd(36, 2, 2)),
  'tv': tall('TV', bd(201, 2, 2)),
  // Every Home has one; visitors sign it (see interactions/guestbook.ts).
  'guestbook': {
    name: 'Guestbook stand',
    kind: 'furniture',
    tiles: cl(238, 2, 3),
    footprint: 1,
    use: { kind: 'guestbook' },
  },
  // Seasons. The items a season grants are listed in data/seasons.json; the rest decorate
  // the Common Room during the season (maps/world/decorations.ts) and are not in the Home
  // catalog (NOT_FOR_HOMES in homeCatalog.ts keeps the rugs and wall decor out).
  'glowing-pumpkin': animated('Glowing pumpkin', 'furniture', 'glowing_pumpkin', { width: 1, height: 2, footprint: 1 }, 8, 6),
  'witch-cauldron': animated('Witch cauldron', 'furniture', 'witch_cauldron', { width: 2, height: 2, footprint: 1 }, 12, 8),
  'pumpkin-lantern': tall('Pumpkin lantern', hw(44, 1, 2)),
  'pumpkin-large': tall('Large pumpkin', hw(9, 1, 2)),
  'pumpkin-pile': tall('Pumpkin pile', hw(10, 2, 2)),
  'sheet-ghost': tall('Sheet ghost', hw(174, 1, 2)),
  'candy-bucket': tabletop('Candy bucket', hw(170, 1, 2)),
  'witch-hat': tabletop('Witch hat', hw(173, 1, 2)),
  'halloween-mat': rug('Halloween mat', hw(67, 2, 1)),
  'halloween-bunting-4': bunting('Halloween bunting', 4),
  'halloween-bunting-6': bunting('Halloween bunting', 6),
  'autumn-garland-3': garland('Autumn garland', 3),
  'cobweb': wall('Cobweb', hw(32, 1, 2)),
  'cobweb-spider': wall('Cobweb with a spider', hw(34, 1, 2)),
  'hanging-spider': animated('Hanging spider', 'wall', 'spider', { width: 1, height: 2 }, 8, 4),
  // The tree is solid all the way up: the lights sprite sorts by its bottom edge, so
  // tree tiles drawn above avatars would hide it.
  'christmas-tree': {
    name: 'Christmas tree',
    kind: 'furniture',
    tiles: xm(1, 2, 3),
    footprint: 3,
    sprite: { sheet: 'christmas_tree_lights', frames: 6, fps: 3 },
  },
  'snow-globe': animated('Snow globe', 'tabletop', 'snow_globe', { width: 1, height: 1 }, 8, 6),
  'christmas-presents': tall('Pile of presents', xm(52, 2, 3), 2),
  'present-red': { name: 'Red present', kind: 'furniture', tiles: xm(48, 1, 1) },
  'present-blue': { name: 'Blue present', kind: 'furniture', tiles: xm(50, 1, 1) },
  'nutcracker': tall('Nutcracker', xm(74, 1, 2)),
  'table-tree': tabletop('Little Christmas tree', xm(110, 1, 2)),
  'wreath': wall('Wreath', xm(11, 1, 2)),
  'wreath-lights': wall('Wreath with lights', xm(12, 1, 2)),
  'stocking': wall('Stocking', xm(41, 1, 2)),
  'snowman-picture': wall('Snowman picture', xm(71, 1, 2)),
  'santa-picture': wall('Santa picture', xm(72, 1, 2)),
  'glowing-candles': animated('Glowing candles', 'tabletop', 'glowing_candles', { width: 1, height: 2 }, 3, 5),

  // The shared plant in the Common Room. The game draws it, since it grows (see
  // objects/SharedPlant.ts); it blooms into one of the species in data/plants.json, and
  // everyone who watered it gets that species' cutting.
  'shared-plant': {
    name: 'Shared plant',
    kind: 'furniture',
    tiles: blank(1, 2),
    footprint: 1,
    solid: true,
    use: { kind: 'plant' },
  },
  'lavender-cutting': tabletop('Lavender cutting', gro(1099, 1, 1)),
  'blue-daisy-cutting': tabletop('Blue daisy cutting', gro(1098, 1, 1)),
  'cosmos-cutting': tabletop('Cosmos cutting', gro(1115, 1, 1)),

  // Daily puzzle rewards. Each is the picture of one puzzle in data/puzzles.json, and
  // solving that puzzle unlocks it. Rebuild the puzzles after changing their tiles
  // (`yarn build:arcade-puzzles`).
  'shaded-lamp': tall('Shaded floor lamp', lr(204, 1, 3)),
  'tripod-lamp': tall('Tripod lamp', lr(205, 1, 3)),
  'globe-lamp': tall('Globe floor lamp', kt(531, 1, 3)),
  'plunger': tall('Plunger', gen(1133, 1, 2)),
  'frying-pan': wall('Frying pan', kt(591, 1, 2)),
  'scissors': tabletop('Scissors', bm(418, 2, 1)),
  'ice-cream-cone': tabletop('Ice cream cone', ice(51, 1, 2)),
  'antenna-tv': tall('TV with antenna', hw(167, 2, 2)),
  'trick-or-treat-ghost': tall('Trick-or-treat ghost', hw(175, 1, 3)),
  'wizard-hat': tabletop('Wizard hat', hw(248, 1, 2)),
  'sleeping-cat': tall('Sleeping cat', hw(267, 3, 1)),
  'vase-roses': tall('Vase of roses', gro(1175, 1, 3)),
  'barbell': tall('Barbell', gym(153, 2, 1)),
  'dumbbell': tall('Dumbbell', gym(379, 1, 1)),
  'punching-bag': tall('Punching bag', gym(6, 1, 3)),
  'gift-box': tall('Gift box', bday(1, 1, 2)),
  'balloon': tall('Blue balloon', bday(61, 1, 2)),
  'bonsai': tabletop('Bonsai', art(14, 1, 2)),
  'easel': tall('Easel', art(41, 1, 2)),
  'harp': tall('Harp', mus(13, 2, 2)),
  'electric-guitar': tall('Electric guitar', mus(42, 1, 3)),
  'acoustic-guitar': tall('Acoustic guitar', mus(39, 1, 3)),
  'cello': tall('Cello', mus(732, 1, 3)),
  'microphone': tall('Microphone stand', mus(249, 1, 2)),
  'grand-piano': tall('Grand piano', mus(192, 2, 3), 2),
  'parasol': tall('Parasol', fish(256, 3, 3)),
  'wooden-stool': { name: 'Wooden stool', kind: 'furniture', tiles: bm(444, 2, 2), seats: [{ x: 0, y: 1, width: 2 }] },
  'candy-cane': tabletop('Candy cane', xm(246, 1, 1)),
  'reindeer-plush': tall('Reindeer plush', xm(176, 2, 2)),
  'grave-cross': tall('Grave cross', hw(444, 1, 2)),
  'green-stocking': wall('Green stocking', xm(9, 1, 2)),
  'coffin': tall('Coffin', hw(76, 2, 3)),
  'exercise-bike': tall('Exercise bike', gym(142, 2, 3)),
  'wooden-chair': {
    name: 'Wooden chair',
    kind: 'furniture',
    tiles: gen(180, 1, 2),
    seats: [{ x: 0, y: 1, facing: 'right' }],
  },
  'vanity-mirror': tabletop('Vanity mirror', lr(112, 1, 1)),
  'gold-trophy': tabletop('Gold trophy', mus(328, 1, 1)),
  'baseball-bat': tall('Baseball bat', mus(142, 1, 2)),
  'djembe': tall('Djembe', mus(190, 1, 2)),
  'picnic-basket': tall('Picnic basket', bm(501, 1, 2)),
  'amphora': tall('Amphora', gen(179, 1, 2)),
  'ping-pong-paddle': tabletop('Ping pong paddle', bm(325, 1, 1)),

  // The way out of a Home, laid in its bottom doorway.
  'doormat': { name: 'Doormat', kind: 'rug', tiles: gen(169, 2, 2), use: { kind: 'door' } },
} satisfies Record<string, Prefab>

export type PrefabId = keyof typeof prefabs

export function isPrefabId(id: string): id is PrefabId {
  return Object.hasOwn(prefabs, id)
}

export function prefabSize(prefab: Prefab): { width: number; height: number } {
  return { width: prefab.tiles[0]?.length ?? 0, height: prefab.tiles.length }
}
