export const TILE_SIZE = 48

export const GAME_ASSET_BASE_PATH = '/assets/gameplan/limezu-modern-interiors'

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

export const GameAssetPaths = {
  spriteAtlases: `${GAME_ASSET_BASE_PATH}/sprite_atlases.json`,
  maps: {
    commonRoom: `${GAME_ASSET_BASE_PATH}/maps/common_room.json`,
    world: `${GAME_ASSET_BASE_PATH}/maps/world.json`,
  },
  tilesets: {
    roomBuilder: `${GAME_ASSET_BASE_PATH}/1_Interiors/48x48/Room_Builder_48x48.png`,
    livingRoom: `${GAME_ASSET_BASE_PATH}/1_Interiors/48x48/Theme_Sorter_48x48/2_LivingRoom_48x48.png`,
    generic: `${GAME_ASSET_BASE_PATH}/1_Interiors/48x48/Theme_Sorter_48x48/1_Generic_48x48.png`,
    kitchen: `${GAME_ASSET_BASE_PATH}/1_Interiors/48x48/Theme_Sorter_48x48/12_Kitchen_48x48.png`,
    conferenceHall: `${GAME_ASSET_BASE_PATH}/1_Interiors/48x48/Theme_Sorter_48x48/13_Conference_Hall_48x48.png`,
    classroomLibrary: `${GAME_ASSET_BASE_PATH}/1_Interiors/48x48/Theme_Sorter_48x48/5_Classroom_and_library_48x48.png`,
    basement: `${GAME_ASSET_BASE_PATH}/1_Interiors/48x48/Theme_Sorter_48x48/14_Basement_48x48.png`,
  },
  characters: {
    player: `${GAME_ASSET_BASE_PATH}/2_Characters/Character_Generator/0_Premade_Characters/48x48/Premade_Character_48x48_01.png`,
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
