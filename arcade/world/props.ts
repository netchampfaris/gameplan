import type Phaser from 'phaser'
import { packAssetUrl } from '../config/assets.ts'

/** The raw Tiled JSON of a map, as handed to the loader's filecomplete event. */
export interface TiledMapData {
  tilesets: { name: string; image: string }[]
  layers: { name: string; type: string; objects?: unknown[] }[]
}

/**
 * Animated props (fireplace flames, clocks, fish tanks) that the map places in
 * its `Animated Props` object layer. Tiles cannot animate on their own, so the
 * scene draws these as sprites.
 *
 * Each object is a rectangle covering one frame: `x`, `y` is its top-left in
 * pixels and `width`, `height` the frame size. Properties:
 * - `image`: the sheet, relative to the pack root (one row of equal frames)
 * - `frameWidth`, `frameHeight`: frame size in pixels
 * - `frames`: how many frames to loop, counted from the first
 * - `fps`: playback speed
 *
 * Props sort with avatars by their bottom edge, like everything that stands.
 */
export const ANIMATED_PROPS_LAYER = 'Animated Props'

interface AnimatedProp {
  x: number
  y: number
  image: string
  frameWidth: number
  frameHeight: number
  frames: number
  fps: number
}

interface RawObject {
  x?: number
  y?: number
  properties?: { name: string; value: unknown }[]
}

function readProps(objects: readonly unknown[]): AnimatedProp[] {
  return objects.flatMap((raw) => {
    const object = raw as RawObject
    const properties = new Map((object.properties ?? []).map((property) => [property.name, property.value]))
    const image = properties.get('image')
    const frameWidth = properties.get('frameWidth')
    const frameHeight = properties.get('frameHeight')
    const frames = properties.get('frames')
    const fps = properties.get('fps')
    if (
      typeof image !== 'string' ||
      typeof frameWidth !== 'number' ||
      typeof frameHeight !== 'number' ||
      typeof frames !== 'number' ||
      typeof fps !== 'number'
    ) {
      return []
    }
    return [{ x: object.x ?? 0, y: object.y ?? 0, image, frameWidth, frameHeight, frames, fps }]
  })
}

/** Texture key of a prop sheet, also used by the Home decorator's preview. */
export const propTextureKey = (image: string) => `prop:${image}`

/**
 * Queues the sheets a map's props use. Called from the scene's loader once the
 * map JSON is in, so they load in the same pass.
 */
export function queueWorldPropSheets(scene: Phaser.Scene, mapData: TiledMapData): void {
  const layer = mapData.layers.find((candidate) => candidate.name === ANIMATED_PROPS_LAYER)
  for (const prop of readProps(layer?.objects ?? [])) queuePropSheet(scene, prop)
}

/** Queues one prop sheet unless it is loaded or already queued. */
export function queuePropSheet(
  scene: Phaser.Scene,
  prop: { image: string; frameWidth: number; frameHeight: number },
): void {
  const key = propTextureKey(prop.image)
  // The loader itself skips a key that is already queued.
  if (scene.textures.exists(key)) return
  scene.load.spritesheet(key, packAssetUrl(prop.image), {
    frameWidth: prop.frameWidth,
    frameHeight: prop.frameHeight,
  })
}

/** Adds a looping sprite per animated prop. Called once the map exists. */
export function addWorldProps(scene: Phaser.Scene, map: Phaser.Tilemaps.Tilemap): Phaser.GameObjects.Sprite[] {
  const layer = map.getObjectLayer(ANIMATED_PROPS_LAYER)
  return readProps(layer?.objects ?? []).flatMap((prop, index) => {
    const key = propTextureKey(prop.image)
    if (!scene.textures.exists(key)) return []
    const animation = `${key}:loop`
    if (!scene.anims.exists(animation)) {
      scene.anims.create({
        key: animation,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: prop.frames - 1 }),
        frameRate: prop.fps,
        repeat: -1,
      })
    }
    const bottom = prop.y + prop.frameHeight
    const sprite = scene.add.sprite(prop.x, bottom, key, 0).setOrigin(0, 1).setDepth(bottom)
    // Start copies of the same prop on different frames so they do not tick in step.
    sprite.play({ key: animation, startFrame: index % prop.frames })
    return [sprite]
  })
}
