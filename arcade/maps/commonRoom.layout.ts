import {
  applyPlacements,
  createCollisionLayer,
  createEmptyLayer,
  createObjectPaletteLayer,
  createPatternFilledLayer,
  createSpawnLayer,
  createTileLayer,
  createTiledMap,
  type MapDimensions,
  type Placement,
} from './tiled.ts'
import { paintRoomWalls, type Room } from './rooms.ts'
import { objectPalettePrefabs, prefabs, roomTiles } from './prefabs.ts'

const dimensions: MapDimensions = { width: 20, height: 15 }

// The common room is a single room filling the whole map. Only the top edge is
// walled (matching the original layout); furniture overlaps it on the objects
// layer. No doorways yet.
const commonRoom: Room = {
  rect: { x: 0, y: 0, width: dimensions.width, height: dimensions.height },
  floorPattern: roomTiles.floorPattern,
  wallStyle: { horizontal: prefabs.wallSegment },
  walls: ['top'],
}

const backPlacements: Placement[] = [
  // identity wall: plants flanking bookshelves with a fireplace centerpiece
  { prefab: prefabs.tallPlant, x: 0, y: 1 },
  { prefab: prefabs.bookshelfWide, x: 2, y: 0 },
  { prefab: prefabs.paintingLandscape, x: 8, y: 1 },
  { prefab: prefabs.fireplace, x: 9, y: 0 },
  { prefab: prefabs.paintingOrange, x: 11, y: 1 },
  { prefab: prefabs.bookshelfWide, x: 12, y: 0 },
  { prefab: prefabs.tallPlant, x: 18, y: 1 },
  // lounge: couch facing the room with armchair and coffee table
  { prefab: prefabs.armchairOrange, x: 2, y: 5 },
  { prefab: prefabs.couchGray, x: 4, y: 4 },
  { prefab: prefabs.lampBlue, x: 7, y: 4 },
  { prefab: prefabs.coffeeTable, x: 4, y: 7 },
  // chat nook on the right, set lower for asymmetry
  { prefab: prefabs.couchBrown, x: 14, y: 6 },
  { prefab: prefabs.tableLamp, x: 17, y: 6 },
  { prefab: prefabs.armchairOrange, x: 13, y: 6 },
  // greenery in the lower corners
  { prefab: prefabs.slimPlant, x: 0, y: 11 },
  { prefab: prefabs.slimPlant, x: 19, y: 11 },
]

const decorPlacements: Placement[] = [
  { prefab: prefabs.carpetPurple, x: 8, y: 8 },
  { prefab: prefabs.carpetBlue, x: 14, y: 8 },
]

const frontPlacements: Placement[] = [{ prefab: prefabs.couchPillows, x: 5, y: 4 }]

const spawnPoints = [
  { name: 'spawn-center', x: 10, y: 9 },
  { name: 'spawn-left', x: 9, y: 10 },
  { name: 'spawn-right', x: 11, y: 10 },
]

export function buildCommonRoomMap() {
  const floorLayer = createPatternFilledLayer(commonRoom.floorPattern, dimensions)
  const decorLayer = createEmptyLayer(dimensions)
  const objectsBackLayer = createEmptyLayer(dimensions)
  const objectsFrontLayer = createEmptyLayer(dimensions)

  const walls = paintRoomWalls(commonRoom)

  applyPlacements(floorLayer, walls.floorPlacements, dimensions)
  applyPlacements(decorLayer, decorPlacements, dimensions)
  applyPlacements(objectsBackLayer, backPlacements, dimensions)
  applyPlacements(objectsFrontLayer, frontPlacements, dimensions)

  const collisionLayer = createCollisionLayer(backPlacements, dimensions)
  walls.applyCollision(collisionLayer, dimensions)

  const layers = [
    createTileLayer({ id: 1, name: 'Floor', data: floorLayer, dimensions }),
    createTileLayer({ id: 2, name: 'Decor', data: decorLayer, dimensions }),
    createTileLayer({ id: 3, name: 'Objects Back', data: objectsBackLayer, dimensions }),
    createTileLayer({ id: 4, name: 'Objects Front', data: objectsFrontLayer, dimensions }),
    createTileLayer({
      id: 5,
      name: 'Collision',
      data: collisionLayer,
      dimensions,
      visible: false,
      opacity: 0.45,
      collision: true,
    }),
    createSpawnLayer(6, spawnPoints),
    createObjectPaletteLayer(7, objectPalettePrefabs),
  ]

  return createTiledMap(layers, objectPalettePrefabs.length + spawnPoints.length + 1, dimensions)
}
