import { packAssetUrl } from '../config/assets'
import { appearanceKey, appearanceLayerFiles, type AvatarAppearance } from './catalog'
import { COMPOSITE_HEIGHT, COMPOSITE_WIDTH, FRAME_HEIGHT, FRAME_WIDTH, FRAMES_PER_DIRECTION, SHEET_ROWS } from './sheet'

/**
 * Builds an Avatar's sheet by drawing its layers on top of each other.
 *
 * Only the rows in `SHEET_ROWS` are copied, so a composite is 1152x288. Composites are
 * cached by appearance, and the most recently used ones are kept: everyone in a Room,
 * plus the looks tried in the customizer. The full pack sheets are not kept after
 * drawing, since each one decodes to 21 MB.
 */

const MAX_CACHED_SHEETS = 48

const sheets = new Map<string, Promise<HTMLCanvasElement>>()

export function composeAvatarSheet(appearance: AvatarAppearance): Promise<HTMLCanvasElement> {
  const key = appearanceKey(appearance)
  const cached = sheets.get(key)
  if (cached) {
    // Re-insert so the Map's order tracks recency.
    sheets.delete(key)
    sheets.set(key, cached)
    return cached
  }

  const sheet = drawSheet(appearance)
  sheets.set(key, sheet)
  sheet.catch(() => sheets.delete(key))
  while (sheets.size > MAX_CACHED_SHEETS) {
    const oldest = sheets.keys().next().value
    if (oldest === undefined) break
    sheets.delete(oldest)
  }
  return sheet
}

async function drawSheet(appearance: AvatarAppearance): Promise<HTMLCanvasElement> {
  const layers = await Promise.all(appearanceLayerFiles(appearance).map((file) => loadImage(packAssetUrl(file))))

  const canvas = document.createElement('canvas')
  canvas.width = COMPOSITE_WIDTH
  canvas.height = COMPOSITE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is not available')
  context.imageSmoothingEnabled = false

  for (const layer of layers) {
    SHEET_ROWS.forEach((row, rowIndex) => {
      const width = row.facings.length * FRAMES_PER_DIRECTION * FRAME_WIDTH
      context.drawImage(
        layer,
        0,
        row.sourceRow * FRAME_HEIGHT,
        width,
        FRAME_HEIGHT,
        0,
        rowIndex * FRAME_HEIGHT,
        width,
        FRAME_HEIGHT,
      )
    })
  }
  return canvas
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    // Sheets come from the CDN in production; a canvas drawn from a non-CORS image
    // cannot be uploaded to WebGL.
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Avatar layer could not be loaded: ${url}`))
    image.src = url
  })
}
