import commonRoomMapUrl from '../data/maps/common_room.json?url'
import worldMapUrl from '../data/maps/world.json?url'
import spriteAtlasesUrl from '../data/sprite_atlases.json?url'
import { PackFiles } from './packFiles'

export const TILE_SIZE = 48

/**
 * Where LimeZu sheets are served from: the local pack through the Arcade dev
 * middleware, or the CDN set by `VITE_ARCADE_ASSET_URL` in production builds.
 */
export const PACK_BASE_URL = import.meta.env.DEV ? '/arcade-assets' : import.meta.env.VITE_ARCADE_ASSET_URL

export function packAssetUrl(file: string): string {
  return `${PACK_BASE_URL}/${file}`
}

export const GameAssetKeys = {
  spriteAtlases: 'sprite-atlases',
  maps: {
    commonRoom: 'map:common-room',
    world: 'map:world',
  },
  tilesets: {
    roomBuilder: 'tileset:room-builder',
    livingRoom: 'tileset:living-room',
    generic: 'tileset:generic',
    kitchen: 'tileset:kitchen',
    conferenceHall: 'tileset:conference-hall',
    classroomLibrary: 'tileset:classroom-library',
    basement: 'tileset:basement',
  },
  characters: {
    player: 'character:player',
  },
} as const

// Our own data files ship with the app bundle; only LimeZu sheets come from the pack.
export const GameAssetPaths = {
  spriteAtlases: spriteAtlasesUrl,
  maps: {
    commonRoom: commonRoomMapUrl,
    world: worldMapUrl,
  },
  tilesets: {
    roomBuilder: packAssetUrl(PackFiles.tilesets.roomBuilder),
    livingRoom: packAssetUrl(PackFiles.tilesets.livingRoom),
    generic: packAssetUrl(PackFiles.tilesets.generic),
    kitchen: packAssetUrl(PackFiles.tilesets.kitchen),
    conferenceHall: packAssetUrl(PackFiles.tilesets.conferenceHall),
    classroomLibrary: packAssetUrl(PackFiles.tilesets.classroomLibrary),
    basement: packAssetUrl(PackFiles.tilesets.basement),
  },
  characters: {
    player: packAssetUrl(PackFiles.characters.player),
  },
} as const

export const TiledTilesetNames = {
  roomBuilder: 'room_builder',
  livingRoom: 'living_room',
  generic: 'generic',
  kitchen: 'kitchen',
  conferenceHall: 'conference_hall',
  classroomLibrary: 'classroom_library',
  basement: 'basement',
} as const
