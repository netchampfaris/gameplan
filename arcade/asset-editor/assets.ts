import { AssetManager } from '@arcade'
import type { AssetInfo } from './types'

const characterAssets: AssetInfo[] = AssetManager.getAllCharacterNumbers().map((characterNumber) => {
  const id = characterNumber.toString().padStart(2, '0')

  return {
    key: `character_${id}`,
    name: `Character ${id}`,
    path: AssetManager.getCharacterSpritePath(characterNumber),
    description: `Premade avatar sheet ${id}. Drag across frames to preview animation loops.`,
  }
})

export const availableAssets: AssetInfo[] = [
  ...characterAssets,
  {
    key: 'room_builder',
    name: 'Room Builder',
    path: AssetManager.getRoomBuilderSpritePath(),
    description: 'Floors, walls, baseboards, and room construction elements',
  },
  {
    key: 'living_room',
    name: 'Living Room',
    path: AssetManager.getLivingRoomSpritePath(),
    description: 'Couches, tables, plants, and living room furniture',
  },
  {
    key: 'generic',
    name: 'Generic',
    path: AssetManager.getGenericSpritePath(),
    description: 'General furniture and decorative items',
  },
]

export function getAssetSpritePath(assetKey: string): string {
  const asset = availableAssets.find((a) => a.key === assetKey)
  return asset?.path || ''
}
