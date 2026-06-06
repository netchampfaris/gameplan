import {
  applyPlacements,
  createCollisionLayer,
  createEmptyLayer,
  createFilledLayer,
  createObjectPaletteLayer,
  createSpawnLayer,
  createTileLayer,
  createTiledMap,
  type Placement,
} from './tiled.ts'
import { objectPalettePrefabs, prefabs, roomTiles } from './prefabs.ts'

const backPlacements: Placement[] = [
  { prefab: prefabs.bookshelfWide, x: 2, y: 1 },
  { prefab: prefabs.bookshelfWide, x: 10, y: 1 },
  { prefab: prefabs.tallPlant, x: 17, y: 1 },
  { prefab: prefabs.slimPlant, x: 1, y: 4 },
  { prefab: prefabs.sideTable, x: 7, y: 5 },
  { prefab: prefabs.sideTable, x: 14, y: 5 },
  { prefab: prefabs.slimPlant, x: 17, y: 6 },
  { prefab: prefabs.couchGray, x: 2, y: 8 },
  { prefab: prefabs.sideTable, x: 7, y: 10 },
  { prefab: prefabs.sideTable, x: 15, y: 10 },
  { prefab: prefabs.slimPlant, x: 2, y: 12 },
]

const frontPlacements: Placement[] = [{ prefab: prefabs.couchPillows, x: 4, y: 8 }]

const spawnPoints = [
  { name: 'spawn-center', x: 10, y: 9 },
  { name: 'spawn-left', x: 9, y: 10 },
  { name: 'spawn-right', x: 11, y: 10 },
]

export function buildCommonRoomMap() {
  const floorLayer = createFilledLayer(roomTiles.floor)
  const objectsBackLayer = createEmptyLayer()
  const objectsFrontLayer = createEmptyLayer()

  applyPlacements(objectsBackLayer, backPlacements)
  applyPlacements(objectsFrontLayer, frontPlacements)

  const collisionLayer = createCollisionLayer(backPlacements)
  const layers = [
    createTileLayer({ id: 1, name: 'Floor', data: floorLayer }),
    createTileLayer({ id: 2, name: 'Objects Back', data: objectsBackLayer }),
    createTileLayer({ id: 3, name: 'Objects Front', data: objectsFrontLayer }),
    createTileLayer({
      id: 4,
      name: 'Collision',
      data: collisionLayer,
      visible: false,
      opacity: 0.45,
      collision: true,
    }),
    createSpawnLayer(5, spawnPoints),
    createObjectPaletteLayer(6, objectPalettePrefabs),
  ]

  return createTiledMap(layers, objectPalettePrefabs.length + spawnPoints.length + 1)
}
