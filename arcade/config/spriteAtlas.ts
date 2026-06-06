import Phaser from 'phaser'
import { GameAssetKeys } from './assets'

interface SpriteAtlasFrame {
  frame: {
    x: number
    y: number
    w: number
    h: number
  }
}

interface SpriteAtlas {
  name: string
  frames: Record<string, SpriteAtlasFrame>
}

interface SpriteAtlasCollection {
  atlases: SpriteAtlas[]
}

export function registerSpriteAtlasFrames(scene: Phaser.Scene, atlasName: string, textureKey: string) {
  const atlasData = scene.cache.json.get(GameAssetKeys.spriteAtlases) as SpriteAtlasCollection | undefined
  const atlas = atlasData?.atlases.find((item) => item.name === atlasName)

  if (!atlas) {
    throw new Error(`Sprite atlas not found: ${atlasName}`)
  }

  if (!scene.textures.exists(textureKey)) {
    throw new Error(`Sprite texture not found: ${textureKey}`)
  }

  const texture = scene.textures.get(textureKey)

  for (const [frameName, { frame }] of Object.entries(atlas.frames)) {
    if (!texture.has(frameName)) {
      texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h)
    }
  }
}
