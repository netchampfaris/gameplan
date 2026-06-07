export const TILE_SIZE = 48

// Default map size kept for backwards-compatible helpers; the builder passes
// explicit width/height so future maps are not bound to these constants.
export const MAP_WIDTH = 20
export const MAP_HEIGHT = 15

export type TileMatrix = number[][]

export interface Prefab {
  name: string
  tiles: TileMatrix
  solid?: boolean
  collision?: boolean[][]
}

export interface Placement {
  prefab: Prefab
  x: number
  y: number
}

export interface SpawnPoint {
  name: string
  x: number
  y: number
}

export interface MapDimensions {
  width: number
  height: number
}

interface TileLayerOptions {
  id: number
  name: string
  data: number[]
  dimensions: MapDimensions
  visible?: boolean
  opacity?: number
  collision?: boolean
}

// Sheet metadata for every tileset the world may use. firstgid/tilecount are
// computed by accumulation so adding or reordering a sheet shifts gids in one
// place. Dimensions must match the real spritesheets: Phaser computes tile
// positions from the actual texture size, so a mismatch silently shifts gids.
interface SheetDefinition {
  name: string
  image: string
  columns: number
  imagewidth: number
  imageheight: number
}

// Order is load-bearing: it determines firstgid accumulation. Keep
// room_builder / living_room / generic first so existing gids stay stable.
const sheetDefinitions: SheetDefinition[] = [
  {
    name: 'room_builder',
    image: '../1_Interiors/48x48/Room_Builder_48x48.png',
    columns: 76,
    imagewidth: 3648,
    imageheight: 5424,
  },
  {
    name: 'living_room',
    image: '../1_Interiors/48x48/Theme_Sorter_48x48/2_LivingRoom_48x48.png',
    columns: 16,
    imagewidth: 768,
    imageheight: 2160,
  },
  {
    name: 'generic',
    image: '../1_Interiors/48x48/Theme_Sorter_48x48/1_Generic_48x48.png',
    columns: 16,
    imagewidth: 768,
    imageheight: 3744,
  },
  {
    name: 'kitchen',
    image: '../1_Interiors/48x48/Theme_Sorter_48x48/12_Kitchen_48x48.png',
    columns: 16,
    imagewidth: 768,
    imageheight: 2352,
  },
  {
    name: 'conference_hall',
    image: '../1_Interiors/48x48/Theme_Sorter_48x48/13_Conference_Hall_48x48.png',
    columns: 16,
    imagewidth: 768,
    imageheight: 576,
  },
  {
    name: 'classroom_library',
    image: '../1_Interiors/48x48/Theme_Sorter_48x48/5_Classroom_and_library_48x48.png',
    columns: 16,
    imagewidth: 768,
    imageheight: 1632,
  },
  {
    name: 'basement',
    image: '../1_Interiors/48x48/Theme_Sorter_48x48/14_Basement_48x48.png',
    columns: 16,
    imagewidth: 768,
    imageheight: 2400,
  },
]

export interface Tileset {
  columns: number
  firstgid: number
  image: string
  imageheight: number
  imagewidth: number
  margin: number
  name: string
  spacing: number
  tilecount: number
  tileheight: number
  tilewidth: number
}

function buildTilesets(definitions: SheetDefinition[]): Tileset[] {
  let firstgid = 1
  return definitions.map((sheet) => {
    const rows = sheet.imageheight / TILE_SIZE
    const tilecount = sheet.columns * rows
    const tileset: Tileset = {
      columns: sheet.columns,
      firstgid,
      image: sheet.image,
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

export const tilesets = buildTilesets(sheetDefinitions)

const tilesetsByName = new Map(tilesets.map((tileset) => [tileset.name, tileset]))

export type SheetName = (typeof sheetDefinitions)[number]['name']

export function getTileset(name: SheetName): Tileset {
  const tileset = tilesetsByName.get(name)
  if (!tileset) {
    throw new Error(`Unknown tileset: ${name}`)
  }
  return tileset
}

// Resolve a sheet-local tile id to a global gid. Referencing sheets by name
// means firstgids can shift without touching prefab definitions.
export function gid(sheetName: SheetName, localTileId: number) {
  return getTileset(sheetName).firstgid + localTileId
}

export function createFilledLayer(tileGid: number, { width, height }: MapDimensions) {
  return Array.from({ length: width * height }, () => tileGid)
}

export function createEmptyLayer({ width, height }: MapDimensions) {
  return Array.from({ length: width * height }, () => 0)
}

export function createPatternFilledLayer(pattern: TileMatrix, { width, height }: MapDimensions) {
  return Array.from({ length: width * height }, (_, index) => {
    const x = index % width
    const y = Math.floor(index / width)
    const row = pattern[y % pattern.length]
    return row[x % row.length]
  })
}

// Fill a rectangular region of a layer with a repeating tile pattern. The
// pattern is anchored to the rect origin so each room's floor reads as its own
// continuous surface regardless of where it sits in map space.
export function fillRectWithPattern(
  layer: number[],
  pattern: TileMatrix,
  rect: { x: number; y: number; width: number; height: number },
  dimensions: MapDimensions,
) {
  for (let row = 0; row < rect.height; row += 1) {
    const patternRow = pattern[row % pattern.length]
    for (let column = 0; column < rect.width; column += 1) {
      const tileGid = patternRow[column % patternRow.length]
      if (tileGid === 0) continue
      setTile(layer, rect.x + column, rect.y + row, tileGid, dimensions)
    }
  }
}

export function applyPlacements(
  layer: number[],
  placements: Placement[],
  dimensions: MapDimensions,
) {
  for (const placement of placements) {
    placePrefab(layer, placement, dimensions)
  }
}

export function createCollisionLayer(placements: Placement[], dimensions: MapDimensions) {
  const layer = createEmptyLayer(dimensions)

  for (const placement of placements) {
    const { prefab } = placement
    if (!prefab.solid && !prefab.collision) continue

    prefab.tiles.forEach((row, rowIndex) => {
      row.forEach((tileGid, columnIndex) => {
        const hasTile = tileGid !== 0
        const hasCollision = prefab.collision
          ? Boolean(prefab.collision[rowIndex]?.[columnIndex])
          : prefab.solid && hasTile

        if (!hasCollision) return
        setTile(layer, placement.x + columnIndex, placement.y + rowIndex, 1, dimensions)
      })
    })
  }

  return layer
}

// Mark a single tile as solid in a collision layer (used by the wall painter).
export function setCollisionTile(layer: number[], x: number, y: number, dimensions: MapDimensions) {
  setTile(layer, x, y, 1, dimensions)
}

export function createTileLayer({
  id,
  name,
  data,
  dimensions,
  visible = true,
  opacity = 1,
  collision = false,
}: TileLayerOptions) {
  return {
    data,
    height: dimensions.height,
    id,
    name,
    opacity,
    ...(collision
      ? {
          properties: [
            {
              name: 'collision',
              type: 'bool',
              value: true,
            },
          ],
        }
      : {}),
    type: 'tilelayer',
    visible,
    width: dimensions.width,
    x: 0,
    y: 0,
  }
}

export function createSpawnLayer(id: number, spawnPoints: SpawnPoint[], visible = false) {
  return {
    draworder: 'topdown',
    id,
    name: 'Spawn Points',
    objects: spawnPoints.map((spawnPoint, index) => ({
      height: 16,
      id: index + 1,
      name: spawnPoint.name,
      point: true,
      type: 'spawn',
      visible: true,
      width: 16,
      x: spawnPoint.x * TILE_SIZE,
      y: spawnPoint.y * TILE_SIZE,
    })),
    opacity: 1,
    type: 'objectgroup',
    visible,
    x: 0,
    y: 0,
  }
}

export function createObjectPaletteLayer(id: number, prefabs: Prefab[]) {
  return {
    draworder: 'topdown',
    id,
    name: 'Object Palette',
    objects: prefabs.map((prefab, index) => ({
      height: prefab.tiles.length * TILE_SIZE,
      id: index + 1,
      name: prefab.name,
      properties: [
        { name: 'size', value: `${prefab.tiles[0]?.length ?? 0}x${prefab.tiles.length}` },
        { name: 'solid', type: 'bool', value: Boolean(prefab.solid) },
      ],
      type: 'palette',
      visible: true,
      width: (prefab.tiles[0]?.length ?? 0) * TILE_SIZE,
      x: (index % 5) * TILE_SIZE * 3,
      y: Math.floor(index / 5) * TILE_SIZE * 4,
    })),
    opacity: 1,
    type: 'objectgroup',
    visible: false,
    x: 0,
    y: 0,
  }
}

export function createTiledMap(layers: object[], nextObjectId: number, dimensions: MapDimensions) {
  return {
    compressionlevel: -1,
    height: dimensions.height,
    infinite: false,
    layers,
    nextlayerid: layers.length + 1,
    nextobjectid: nextObjectId,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.2',
    tileheight: TILE_SIZE,
    tilesets,
    tilewidth: TILE_SIZE,
    type: 'map',
    version: '1.10',
    width: dimensions.width,
  }
}

function placePrefab(layer: number[], placement: Placement, dimensions: MapDimensions) {
  placement.prefab.tiles.forEach((row, rowIndex) => {
    row.forEach((tileGid, columnIndex) => {
      if (tileGid === 0) return
      setTile(layer, placement.x + columnIndex, placement.y + rowIndex, tileGid, dimensions)
    })
  })
}

function setTile(
  layer: number[],
  x: number,
  y: number,
  tileGid: number,
  { width, height }: MapDimensions,
) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    throw new Error(`Tile placement is outside the map: ${x},${y}`)
  }

  layer[y * width + x] = tileGid
}
