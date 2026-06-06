export const MAP_WIDTH = 20
export const MAP_HEIGHT = 15
export const TILE_SIZE = 48

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

interface TileLayerOptions {
  id: number
  name: string
  data: number[]
  visible?: boolean
  opacity?: number
  collision?: boolean
}

// Dimensions must match the real spritesheets: Phaser computes tile positions
// from the actual texture size, so a mismatch silently shifts every gid.
export const tilesets = [
  {
    columns: 76,
    firstgid: 1,
    image: '../1_Interiors/48x48/Room_Builder_48x48.png',
    imageheight: 5424,
    imagewidth: 3648,
    margin: 0,
    name: 'room_builder',
    spacing: 0,
    tilecount: 8588,
    tileheight: TILE_SIZE,
    tilewidth: TILE_SIZE,
  },
  {
    columns: 16,
    firstgid: 8589,
    image: '../1_Interiors/48x48/Theme_Sorter_48x48/2_LivingRoom_48x48.png',
    imageheight: 2160,
    imagewidth: 768,
    margin: 0,
    name: 'living_room',
    spacing: 0,
    tilecount: 720,
    tileheight: TILE_SIZE,
    tilewidth: TILE_SIZE,
  },
  {
    columns: 16,
    firstgid: 9309,
    image: '../1_Interiors/48x48/Theme_Sorter_48x48/1_Generic_48x48.png',
    imageheight: 3744,
    imagewidth: 768,
    margin: 0,
    name: 'generic',
    spacing: 0,
    tilecount: 1248,
    tileheight: TILE_SIZE,
    tilewidth: TILE_SIZE,
  },
]

export function gid(firstgid: number, localTileId: number) {
  return firstgid + localTileId
}

export function createFilledLayer(tileGid: number) {
  return Array.from({ length: MAP_WIDTH * MAP_HEIGHT }, () => tileGid)
}

export function createEmptyLayer() {
  return Array.from({ length: MAP_WIDTH * MAP_HEIGHT }, () => 0)
}

export function createPatternFilledLayer(pattern: TileMatrix) {
  return Array.from({ length: MAP_WIDTH * MAP_HEIGHT }, (_, index) => {
    const x = index % MAP_WIDTH
    const y = Math.floor(index / MAP_WIDTH)
    const row = pattern[y % pattern.length]
    return row[x % row.length]
  })
}

export function applyPlacements(layer: number[], placements: Placement[]) {
  for (const placement of placements) {
    placePrefab(layer, placement)
  }
}

export function createCollisionLayer(placements: Placement[]) {
  const layer = createEmptyLayer()

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
        setTile(layer, placement.x + columnIndex, placement.y + rowIndex, 1)
      })
    })
  }

  return layer
}

export function createTileLayer({
  id,
  name,
  data,
  visible = true,
  opacity = 1,
  collision = false,
}: TileLayerOptions) {
  return {
    data,
    height: MAP_HEIGHT,
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
    width: MAP_WIDTH,
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

export function createTiledMap(layers: object[], nextObjectId: number) {
  return {
    compressionlevel: -1,
    height: MAP_HEIGHT,
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
    width: MAP_WIDTH,
  }
}

function placePrefab(layer: number[], placement: Placement) {
  placement.prefab.tiles.forEach((row, rowIndex) => {
    row.forEach((tileGid, columnIndex) => {
      if (tileGid === 0) return
      setTile(layer, placement.x + columnIndex, placement.y + rowIndex, tileGid)
    })
  })
}

function setTile(layer: number[], x: number, y: number, tileGid: number) {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
    throw new Error(`Tile placement is outside the map: ${x},${y}`)
  }

  layer[y * MAP_WIDTH + x] = tileGid
}
