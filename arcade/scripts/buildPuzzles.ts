// Build the daily puzzles, data/puzzles.json, from the pictures of their reward items.
//
//   yarn build:arcade-puzzles                       # write data/puzzles.json
//   yarn build:arcade-puzzles --sheet /tmp/p.png    # also draw a review sheet
//
// Each puzzle is a 10 x 10 nonogram whose answer is the silhouette of one Home item. The
// script reads the item's tiles from the local pack (arcade/pack/), so it needs the pack,
// but it writes only the grids: never pack pixels. A silhouette that line logic alone
// cannot solve, or that has more than one answer, is dropped with a warning.
//
// The order of PUZZLE_ITEMS is the order of the days. Look at the review sheet after any
// change: keep an item only if its grid still reads as the object.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32, deflateSync, inflateSync } from 'node:zlib'
import { PackFiles, type TilesetName } from '../config/packFiles.ts'
import { prefabs, type Prefab, type PrefabId } from '../maps/prefabs.ts'
import { TILE_SIZE, tileSource } from '../maps/tiled.ts'

const PUZZLE_ITEMS: PrefabId[] = [
  'electric-guitar',
  'frying-pan',
  'sleeping-cat',
  'balloon',
  'punching-bag',
  'vase-roses',
  'easel',
  'candy-cane',
  'scissors',
  'harp',
  'tripod-lamp',
  'trick-or-treat-ghost',
  'barbell',
  'ice-cream-cone',
  'microphone',
  'wooden-chair',
  'gift-box',
  'coffin',
  'bonsai',
  'plunger',
  'grand-piano',
  'reindeer-plush',
  'dumbbell',
  'shaded-lamp',
  'parasol',
  'wizard-hat',
  'acoustic-guitar',
  'picnic-basket',
  'gold-trophy',
  'antenna-tv',
  'amphora',
  'green-stocking',
  'exercise-bike',
  'cello',
  'vanity-mirror',
  'grave-cross',
  'globe-lamp',
  'baseball-bat',
  'wooden-stool',
  'djembe',
  'ping-pong-paddle',
]

const SIZE = 10
/** Tried in turn: the first coverage that gives a solvable puzzle wins. */
const COVERAGES = [0.5, 0.4, 0.6, 0.3, 0.7]
/** The pack draws shadows as this opaque colour. A silhouette leaves them out. */
const SHADOW = [167, 151, 150] as const

const arcadeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packDir = resolve(arcadeRoot, 'pack')
const outputPath = resolve(arcadeRoot, 'data/puzzles.json')

// ---- PNG -----------------------------------------------------------------------

interface Image {
  width: number
  height: number
  /** RGBA, row by row. */
  pixels: Uint8Array
}

/** Decodes an 8-bit RGBA, non-interlaced PNG: the only kind the pack's sheets are. */
function decodePng(file: Buffer): Image {
  let offset = 8
  let width = 0
  let height = 0
  const data: Buffer[] = []
  while (offset < file.length) {
    const length = file.readUInt32BE(offset)
    const type = file.toString('latin1', offset + 4, offset + 8)
    const body = file.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      const [bitDepth, colorType, , , interlace] = body.subarray(8)
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
        throw new Error('Only 8-bit RGBA, non-interlaced PNGs are supported')
      }
    } else if (type === 'IDAT') {
      data.push(body)
    }
    offset += 12 + length
  }

  const raw = inflateSync(Buffer.concat(data))
  const stride = width * 4
  const pixels = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x] ?? 0
      const left = x >= 4 ? (pixels[y * stride + x - 4] ?? 0) : 0
      const up = y > 0 ? (pixels[(y - 1) * stride + x] ?? 0) : 0
      const upLeft = x >= 4 && y > 0 ? (pixels[(y - 1) * stride + x - 4] ?? 0) : 0
      pixels[y * stride + x] = (value + predict(filter ?? 0, left, up, upLeft)) & 0xff
    }
  }
  return { width, height, pixels }
}

function predict(filter: number, left: number, up: number, upLeft: number): number {
  switch (filter) {
    case 0:
      return 0
    case 1:
      return left
    case 2:
      return up
    case 3:
      return Math.floor((left + up) / 2)
    case 4: {
      const estimate = left + up - upLeft
      const toLeft = Math.abs(estimate - left)
      const toUp = Math.abs(estimate - up)
      const toUpLeft = Math.abs(estimate - upLeft)
      return toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft
    }
    default:
      throw new Error(`Unknown PNG filter ${filter}`)
  }
}

/** Encodes an RGBA image as a PNG, unfiltered. */
function encodePng({ width, height, pixels }: Image): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type: string, body: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(body.length)
  const typed = Buffer.concat([Buffer.from(type, 'latin1'), body])
  const check = Buffer.alloc(4)
  check.writeUInt32BE(crc32(typed))
  return Buffer.concat([length, typed, check])
}

// ---- The item's picture ------------------------------------------------------------

const sheets = new Map<TilesetName, Image>()

function sheet(name: TilesetName): Image {
  let image = sheets.get(name)
  if (!image) {
    image = decodePng(readFileSync(resolve(packDir, PackFiles.tilesets[name])))
    sheets.set(name, image)
  }
  return image
}

/** The prefab drawn as it is in a Home: its tiles, then its overlay. */
function picture(id: PrefabId): Image {
  const prefab: Prefab = prefabs[id]
  const width = (prefab.tiles[0]?.length ?? 0) * TILE_SIZE
  const height = prefab.tiles.length * TILE_SIZE
  const pixels = new Uint8Array(width * height * 4)
  for (const layer of [prefab.tiles, prefab.overlay ?? []]) {
    layer.forEach((row, tileY) =>
      row.forEach((tile, tileX) => {
        const source = tile ? tileSource(tile) : null
        if (!source) return
        const from = sheet(source.sheet)
        for (let y = 0; y < TILE_SIZE; y++) {
          for (let x = 0; x < TILE_SIZE; x++) {
            const at = ((source.y + y) * from.width + source.x + x) * 4
            if (!from.pixels[at + 3]) continue
            const to = ((tileY * TILE_SIZE + y) * width + tileX * TILE_SIZE + x) * 4
            pixels.set(from.pixels.subarray(at, at + 4), to)
          }
        }
      }),
    )
  }
  return { width, height, pixels }
}

// ---- Silhouette ----------------------------------------------------------------

type Grid = boolean[][]

/** Whether each pixel belongs to the object: opaque, and not its shadow. */
function objectMask({ width, height, pixels }: Image): boolean[][] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const at = (y * width + x) * 4
      const isShadow = SHADOW.every((value, channel) => pixels[at + channel] === value)
      return (pixels[at + 3] ?? 0) > 0 && !isShadow
    }),
  )
}

/**
 * The object shrunk to SIZE x SIZE cells, centred in a square around it. A cell is filled
 * when the object covers at least `coverage` of it, or when a line of the object crosses
 * it from side to side, so thin poles and handles survive.
 */
function silhouette(mask: boolean[][], coverage: number): Grid {
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  mask.forEach((row, y) =>
    row.forEach((on, x) => {
      if (!on) return
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x + 1)
      bottom = Math.max(bottom, y + 1)
    }),
  )
  const width = right - left
  const height = bottom - top
  const side = Math.max(width, height)
  const originX = left - (side - width) / 2
  const originY = top - (side - height) / 2
  const cell = side / SIZE
  const on = (x: number, y: number) => mask[y]?.[x] ?? false
  /** The pixels whose centres fall in [start, end). */
  const centresIn = (start: number, end: number) => {
    const inside: number[] = []
    for (let pixel = Math.floor(start); pixel < Math.ceil(end); pixel++) {
      if (pixel + 0.5 >= start && pixel + 0.5 < end) inside.push(pixel)
    }
    return inside
  }

  return Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, column) => {
      const xs = centresIn(originX + column * cell, originX + (column + 1) * cell)
      const ys = centresIn(originY + row * cell, originY + (row + 1) * cell)
      const count = xs.reduce((sum, x) => sum + ys.filter((y) => on(x, y)).length, 0)
      if (count / (cell * cell) >= coverage) return true
      return xs.some((x) => ys.every((y) => on(x, y))) || ys.some((y) => xs.every((x) => on(x, y)))
    }),
  )
}

// ---- Solver --------------------------------------------------------------------

function clue(line: boolean[]): number[] {
  const runs: number[] = []
  let run = 0
  for (const filled of [...line, false]) {
    if (filled) run++
    else if (run) {
      runs.push(run)
      run = 0
    }
  }
  return runs
}

/** Every way to place the runs of `runs` in a line of `length` cells. */
function placements(runs: number[], length: number): boolean[][] {
  const [first, ...rest] = runs
  if (first === undefined) return [new Array<boolean>(length).fill(false)]
  const restLength = rest.reduce((sum, run) => sum + run + 1, 0)
  const out: boolean[][] = []
  for (let start = 0; start + first + restLength <= length; start++) {
    const head = [...new Array<boolean>(start).fill(false), ...new Array<boolean>(first).fill(true)]
    if (!rest.length) {
      out.push([...head, ...new Array<boolean>(length - head.length).fill(false)])
      continue
    }
    for (const tail of placements(rest, length - head.length - 1)) out.push([...head, false, ...tail])
  }
  return out
}

/**
 * Solves a puzzle from its clues one line at a time: a cell is decided when every
 * placement of its line's runs that fits the cells known so far agrees on it. True when
 * that decides every cell, which also means the answer is the only one.
 */
function solvesByLines(answer: Grid): boolean {
  const rows = answer.map(clue)
  const columns = answer.map((_, x) => clue(answer.map((row) => row[x] ?? false)))
  const known: (boolean | null)[][] = answer.map((row) => row.map(() => null))
  const cellsOf = (isRow: boolean, index: number) =>
    Array.from({ length: SIZE }, (_, at) => (isRow ? { x: at, y: index } : { x: index, y: at }))

  let changed = true
  while (changed) {
    changed = false
    for (const isRow of [true, false]) {
      for (let index = 0; index < SIZE; index++) {
        const cells = cellsOf(isRow, index)
        const current = cells.map(({ x, y }) => known[y]?.[x] ?? null)
        const fits = placements((isRow ? rows : columns)[index] ?? [], SIZE).filter((placement) =>
          placement.every((value, at) => current[at] === null || current[at] === value),
        )
        const [first] = fits
        if (!first) return false
        cells.forEach(({ x, y }, at) => {
          const row = known[y]
          if (!row || row[x] !== null) return
          if (fits.every((placement) => placement[at] === first[at])) {
            row[x] = first[at] ?? false
            changed = true
          }
        })
      }
    }
  }
  return known.every((row) => row.every((value) => value !== null))
}

// ---- Build -----------------------------------------------------------------------

interface Built {
  item: PrefabId
  picture: Image
  answer: Grid
}

const built: Built[] = []
for (const item of PUZZLE_ITEMS) {
  const image = picture(item)
  const mask = objectMask(image)
  const answer = COVERAGES.map((coverage) => silhouette(mask, coverage)).find(solvesByLines)
  if (answer) built.push({ item, picture: image, answer })
  else console.warn(`Dropped ${item}: no silhouette of it has exactly one answer by line logic`)
}

const puzzles = built.map(({ item, answer }) => ({
  item,
  rows: answer.map((row) => row.map((filled) => (filled ? '#' : '.')).join('')),
}))
writeFileSync(
  outputPath,
  `[\n${puzzles.map((puzzle) => `  ${JSON.stringify(puzzle)}`).join(',\n')}\n]\n`,
)
console.log(`Built ${outputPath}: ${puzzles.length} puzzles`)

const sheetFlag = process.argv.indexOf('--sheet')
const sheetPath = sheetFlag >= 0 ? process.argv[sheetFlag + 1] : undefined
if (sheetPath) {
  writeFileSync(sheetPath, encodePng(reviewSheet(built)))
  console.log(`Drew ${sheetPath}`)
}

/** Each item's picture beside its answer, for checking by eye that the answer reads. */
function reviewSheet(items: Built[]): Image {
  const box = 160
  const square = 14
  const columns = 6
  const cellWidth = box + SIZE * square + 30
  const cellHeight = box + 20
  const width = columns * cellWidth
  const height = Math.ceil(items.length / columns) * cellHeight
  const pixels = new Uint8Array(width * height * 4).fill(255)
  const paint = (x: number, y: number, rgba: ArrayLike<number>) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    pixels.set(Array.from(rgba), (y * width + x) * 4)
  }

  items.forEach(({ picture: image, answer }, index) => {
    const left = (index % columns) * cellWidth + 10
    const top = Math.floor(index / columns) * cellHeight + 10
    const scale = Math.max(1, Math.floor(Math.min(box / image.width, box / image.height)))
    for (let y = 0; y < image.height * scale; y++) {
      for (let x = 0; x < image.width * scale; x++) {
        const at = (Math.floor(y / scale) * image.width + Math.floor(x / scale)) * 4
        const rgba = image.pixels.subarray(at, at + 4)
        paint(left + x, top + y, (rgba[3] ?? 0) > 0 ? [rgba[0] ?? 0, rgba[1] ?? 0, rgba[2] ?? 0, 255] : [235, 235, 235, 255])
      }
    }
    answer.forEach((row, y) =>
      row.forEach((filled, x) => {
        for (let dy = 0; dy < square - 1; dy++) {
          for (let dx = 0; dx < square - 1; dx++) {
            paint(left + box + 10 + x * square + dx, top + y * square + dy, filled ? [30, 30, 30, 255] : [220, 220, 220, 255])
          }
        }
      }),
    )
  })
  return { width, height, pixels }
}
