import { packAssetUrl } from '../config/assets'
import { PackFiles } from '../config/packFiles'
import { prefabs, prefabSize, type Prefab, type PrefabId } from '../maps/prefabs'
import { floors, wallpapers, type FloorId, type WallpaperId } from '../maps/rooms'
import { tileSource, TILE_SIZE, type TileMatrix } from '../maps/tiled'

/**
 * Pictures of catalog items for the HUD, drawn from the same sheets and tiles the game
 * uses, so a thumbnail always matches what gets placed.
 */

/** What to draw: tile layers, bottom first, and optionally the first frame of a sprite over them. */
export interface TilePicture {
  width: number
  height: number
  layers: TileMatrix[]
  sprite?: string
}

export function prefabPicture(id: PrefabId): TilePicture {
  const prefab: Prefab = prefabs[id]
  const { width, height } = prefabSize(prefab)
  return {
    width,
    height,
    layers: [prefab.tiles, ...(prefab.overlay ? [prefab.overlay] : [])],
    sprite: prefab.sprite ? PackFiles.props[prefab.sprite.sheet] : undefined,
  }
}

/** A patch of wall: the three rows of the face, three tiles wide. */
export function wallpaperPicture(id: WallpaperId): TilePicture {
  const rows = wallpapers[id].face.map((run) => [run.mid, run.mid, run.mid])
  return { width: 3, height: 3, layers: [rows] }
}

export function floorPicture(id: FloorId): TilePicture {
  const { plain } = floors[id]
  return { width: 2, height: 2, layers: [[[plain, plain], [plain, plain]]] }
}

const images = new Map<string, Promise<HTMLImageElement>>()

function loadImage(file: string): Promise<HTMLImageElement> {
  let image = images.get(file)
  if (!image) {
    image = new Promise((resolve, reject) => {
      const element = new Image()
      element.crossOrigin = 'anonymous'
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error(`Could not load ${file}`))
      element.src = packAssetUrl(file)
    })
    images.set(file, image)
  }
  return image
}

/** Draws a picture at one pixel per sheet pixel. The canvas must be sized to it. */
export async function drawPicture(canvas: HTMLCanvasElement, picture: TilePicture): Promise<void> {
  const sources = picture.layers.flatMap((layer) =>
    layer.flatMap((row, y) =>
      row.flatMap((tile, x) => {
        const source = tile ? tileSource(tile) : null
        if (!source) return []
        return [{ sheet: source.sheet, sourceX: source.x, sourceY: source.y, x: x * TILE_SIZE, y: y * TILE_SIZE }]
      }),
    ),
  )
  const sheets = await Promise.all(sources.map((source) => loadImage(PackFiles.tilesets[source.sheet])))
  const sprite = picture.sprite ? await loadImage(picture.sprite) : null
  const context = canvas.getContext('2d')
  if (!context) return
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, canvas.width, canvas.height)
  const width = picture.width * TILE_SIZE
  const height = picture.height * TILE_SIZE
  sources.forEach((source, index) => {
    const sheet = sheets[index]
    if (sheet) context.drawImage(sheet, source.sourceX, source.sourceY, TILE_SIZE, TILE_SIZE, source.x, source.y, TILE_SIZE, TILE_SIZE)
  })
  if (sprite) context.drawImage(sprite, 0, 0, width, height, 0, 0, width, height)
}
