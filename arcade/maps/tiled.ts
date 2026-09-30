import { PackFiles, type TilesetName } from '../config/packFiles.ts'

/**
 * The Tiled JSON format the scene loads, and the sheet registry every map shares.
 * Nothing here knows about rooms or furniture; see compose.ts for that.
 */

export const TILE_SIZE = 48

export interface MapDimensions {
  width: number
  height: number
}

/** Rows of global tile ids; 0 is an empty cell. */
export type TileMatrix = number[][]

// Dimensions must match the real sheets: Phaser computes tile positions from the
// actual texture size, so a mismatch silently shifts every gid. Image paths come
// from PackFiles, so a sheet must be listed there to ship.
interface SheetDefinition {
  name: TilesetName
  columns: number
  imagewidth: number
  imageheight: number
}

// firstgids accumulate in this order. Maps are regenerated from source, so the
// order can change freely; nothing stores raw gids.
const sheetDefinitions: SheetDefinition[] = [
  { name: 'room_builder', columns: 76, imagewidth: 3648, imageheight: 5424 },
  { name: 'living_room', columns: 16, imagewidth: 768, imageheight: 2160 },
  { name: 'generic', columns: 16, imagewidth: 768, imageheight: 3744 },
  { name: 'kitchen', columns: 16, imagewidth: 768, imageheight: 2352 },
  { name: 'classroom_library', columns: 16, imagewidth: 768, imageheight: 1632 },
  { name: 'basement', columns: 16, imagewidth: 768, imageheight: 2400 },
  { name: 'ice_cream', columns: 16, imagewidth: 768, imageheight: 816 },
  { name: 'bedroom', columns: 16, imagewidth: 768, imageheight: 5136 },
  { name: 'halloween', columns: 16, imagewidth: 768, imageheight: 2928 },
  { name: 'christmas', columns: 16, imagewidth: 768, imageheight: 816 },
  { name: 'grocery', columns: 16, imagewidth: 768, imageheight: 3744 },
  { name: 'music_sport', columns: 16, imagewidth: 768, imageheight: 2304 },
  { name: 'gym', columns: 16, imagewidth: 768, imageheight: 1584 },
  { name: 'art', columns: 16, imagewidth: 768, imageheight: 336 },
  { name: 'birthday', columns: 12, imagewidth: 576, imageheight: 336 },
  { name: 'fishing', columns: 16, imagewidth: 768, imageheight: 1296 },
]

export interface Tileset {
  columns: number
  firstgid: number
  image: string
  imageheight: number
  imagewidth: number
  margin: number
  name: TilesetName
  spacing: number
  tilecount: number
  tileheight: number
  tilewidth: number
}

function buildTilesets(definitions: SheetDefinition[]): Tileset[] {
  let firstgid = 1
  return definitions.map((sheet) => {
    const tilecount = sheet.columns * (sheet.imageheight / TILE_SIZE)
    const tileset: Tileset = {
      columns: sheet.columns,
      firstgid,
      // Pack-relative; the scene resolves it against PACK_BASE_URL.
      image: PackFiles.tilesets[sheet.name],
      imageheight: sheet.imageheight,
      imagewidth: sheet.imagewidth,
      margin: 0,
      name: sheet.name,
      spacing: 0,
      tilecount,
      tileheight: TILE_SIZE,
      tilewidth: TILE_SIZE,
    }
    firstgid += tilecount
    return tileset
  })
}

const tilesets = buildTilesets(sheetDefinitions)
const tilesetsByName = new Map(tilesets.map((tileset) => [tileset.name, tileset]))

function getTileset(name: TilesetName): Tileset {
  const tileset = tilesetsByName.get(name)
  if (!tileset) throw new Error(`Unknown tileset: ${name}`)
  return tileset
}

/** Global tile id of a sheet-local tile id (row-major, counted from 0). */
export function gid(sheet: TilesetName, localId: number): number {
  return getTileset(sheet).firstgid + localId
}

/** Where a global tile id is drawn from: its sheet and the tile's top-left pixel there. */
export function tileSource(tile: number): { sheet: TilesetName; x: number; y: number } | null {
  const tileset = tilesets.find((candidate) => tile >= candidate.firstgid && tile < candidate.firstgid + candidate.tilecount)
  if (!tileset) return null
  const local = tile - tileset.firstgid
  return { sheet: tileset.name, x: (local % tileset.columns) * TILE_SIZE, y: Math.floor(local / tileset.columns) * TILE_SIZE }
}

/** The tiles of a rectangle on a sheet, given its top-left local id. */
export function sheetBlock(sheet: TilesetName, topLeft: number, width: number, height: number): TileMatrix {
  const { columns } = getTileset(sheet)
  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, column) => gid(sheet, topLeft + row * columns + column)),
  )
}

// ---- Layers ----------------------------------------------------------------

export interface TiledProperty {
  name: string
  type: 'string' | 'int' | 'bool'
  value: string | number | boolean
}

export interface TiledTileLayer {
  type: 'tilelayer'
  id: number
  name: string
  data: number[]
  width: number
  height: number
  opacity: number
  visible: boolean
  x: 0
  y: 0
  properties?: TiledProperty[]
}

export interface TiledObject {
  id: number
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
  visible: true
  point?: true
  properties?: TiledProperty[]
}

export interface TiledObjectLayer {
  type: 'objectgroup'
  id: number
  name: string
  draworder: 'topdown'
  objects: TiledObject[]
  opacity: number
  visible: boolean
  x: 0
  y: 0
}

export type TiledLayer = TiledTileLayer | TiledObjectLayer

export interface TiledMap {
  type: 'map'
  version: '1.10'
  tiledversion: '1.11.2'
  orientation: 'orthogonal'
  renderorder: 'right-down'
  infinite: false
  compressionlevel: -1
  width: number
  height: number
  tilewidth: number
  tileheight: number
  nextlayerid: number
  nextobjectid: number
  layers: TiledLayer[]
  tilesets: Tileset[]
}

export function createEmptyLayer({ width, height }: MapDimensions): number[] {
  return new Array<number>(width * height).fill(0)
}

export function createTileLayer(options: {
  id: number
  name: string
  data: number[]
  dimensions: MapDimensions
  visible?: boolean
  collision?: boolean
}): TiledTileLayer {
  const { id, name, data, dimensions, visible = true, collision = false } = options
  return {
    type: 'tilelayer',
    id,
    name,
    data,
    width: dimensions.width,
    height: dimensions.height,
    opacity: 1,
    visible,
    x: 0,
    y: 0,
    ...(collision ? { properties: [{ name: 'collision', type: 'bool', value: true }] } : {}),
  }
}

export function createObjectLayer(id: number, name: string, objects: TiledObject[]): TiledObjectLayer {
  return { type: 'objectgroup', id, name, draworder: 'topdown', objects, opacity: 1, visible: false, x: 0, y: 0 }
}

export function createTiledMap(
  layers: TiledLayer[],
  nextObjectId: number,
  { width, height }: MapDimensions,
): TiledMap {
  // Declare only the sheets the map uses: the scene downloads every declared sheet.
  // Unused sheets drop out without renumbering, since gid ranges may have gaps.
  const used = new Set<number>()
  for (const layer of layers) {
    if (layer.type === 'tilelayer') for (const tile of layer.data) if (tile) used.add(tile)
  }
  const usedTilesets = tilesets.filter((tileset) =>
    [...used].some((tile) => tile >= tileset.firstgid && tile < tileset.firstgid + tileset.tilecount),
  )
  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.11.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    compressionlevel: -1,
    width,
    height,
    tilewidth: TILE_SIZE,
    tileheight: TILE_SIZE,
    nextlayerid: layers.length + 1,
    nextobjectid: nextObjectId,
    layers,
    tilesets: usedTilesets,
  }
}
