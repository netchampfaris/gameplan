import { avatarPartFiles } from '../avatar/catalog.ts'

/**
 * LimeZu Modern Interiors sheets the game loads, relative to the pack root.
 *
 * The pack is licensed and never committed. In dev it is served from `arcade/pack/`;
 * in production from the CDN, where `yarn arcade:publish-assets` uploads exactly
 * these files. Adding a sheet here is the only step needed to ship it.
 *
 * Kept free of Vite-only imports so the Node publish script can import it.
 */
export const PackFiles = {
  // Keyed by Tiled tileset name. Maps reference sheets by these names, and the
  // scene loads whichever of them a map declares.
  tilesets: {
    room_builder: '1_Interiors/48x48/Room_Builder_48x48.png',
    living_room: '1_Interiors/48x48/Theme_Sorter_48x48/2_LivingRoom_48x48.png',
    generic: '1_Interiors/48x48/Theme_Sorter_48x48/1_Generic_48x48.png',
    kitchen: '1_Interiors/48x48/Theme_Sorter_48x48/12_Kitchen_48x48.png',
    classroom_library: '1_Interiors/48x48/Theme_Sorter_48x48/5_Classroom_and_library_48x48.png',
    basement: '1_Interiors/48x48/Theme_Sorter_48x48/14_Basement_48x48.png',
    ice_cream: '1_Interiors/48x48/Theme_Sorter_48x48/24_Ice_Cream_Shop_48x48.png',
    bedroom: '1_Interiors/48x48/Theme_Sorter_48x48/4_Bedroom_48x48.png',
    halloween: '1_Interiors/48x48/Theme_Sorter_48x48/11_Halloween_48x48.png',
    christmas: '1_Interiors/48x48/Theme_Sorter_48x48/15_Christmas_48x48.png',
    // Potted plants: the shared plant's stages and the cuttings it gives.
    grocery: '1_Interiors/48x48/Theme_Sorter_48x48/16_Grocery_store_48x48.png',
    // Rewards for the daily puzzle (data/puzzles.json), with items from the sheets above.
    music_sport: '1_Interiors/48x48/Theme_Sorter_48x48/6_Music_and_sport_48x48.png',
    gym: '1_Interiors/48x48/Theme_Sorter_48x48/8_Gym_48x48.png',
    art: '1_Interiors/48x48/Theme_Sorter_48x48/7_Art_48x48.png',
    birthday: '1_Interiors/48x48/Theme_Sorter_48x48/10_Birthday_party_48x48.png',
    fishing: '1_Interiors/48x48/Theme_Sorter_48x48/9_Fishing_48x48.png',
  },
  // Animated prop sheets, keyed by the name map prefabs use. Each is one row of
  // equal frames; the frame size lives with the prefab in maps/prefabs.ts.
  props: {
    fireplace: '3_Animated_objects/48x48/spritesheets/animated_chimney_48x48.png',
    coffee: '3_Animated_objects/48x48/spritesheets/animated_coffee_48x48.png',
    cuckoo_clock: '3_Animated_objects/48x48/spritesheets/animated_cuckoo_clock_48x48.png',
    pendulum_clock: '3_Animated_objects/48x48/spritesheets/animated_pendulum_clock_48x48.png',
    fish_tank: '3_Animated_objects/48x48/spritesheets/animated_fishtank_orange_48x48.png',
    old_tv: '3_Animated_objects/48x48/spritesheets/animated_old_tv_48x48.png',
    wall_piano: '3_Animated_objects/48x48/spritesheets/animated_wall_piano_48x48.png',
    candle: '3_Animated_objects/48x48/spritesheets/animated_candle_48x48.png',
    wall_candle: '3_Animated_objects/48x48/spritesheets/animated_wall_candle_48x48.png',
    glowing_candles: '3_Animated_objects/48x48/spritesheets/animated_candle_wax_48x48.png',
    glowing_pumpkin: '3_Animated_objects/48x48/spritesheets/animated_glowing_pumpkin_48x48.png',
    witch_cauldron: '3_Animated_objects/48x48/spritesheets/animated_witch_cauldron_48x48.png',
    spider: '3_Animated_objects/48x48/spritesheets/animated_spider_48x48.png',
    christmas_tree_lights: '3_Animated_objects/48x48/spritesheets/animated_Christmas_tree_lights_48x48.png',
    snow_globe: '3_Animated_objects/48x48/spritesheets/animated_Christmas_snowball_globe_48x48.png',
  },
  // Sheets the game draws by itself rather than a map placing them.
  sprites: {
    cat: '3_Animated_objects/48x48/spritesheets/animated_cat_48x48.png',
    sprout: '3_Animated_objects/48x48/spritesheets/animated_sprout_48x48.png',
    // Tied to the party table on someone's birthday or work anniversary.
    balloon_red: '3_Animated_objects/48x48/spritesheets/animated_party_balloon_red_48x48.png',
    balloon_blue: '3_Animated_objects/48x48/spritesheets/animated_party_balloon_blue_48x48.png',
  },
  // Character Generator layers, one per part and colour in the avatar catalog.
  avatarParts: avatarPartFiles(),
  ui: {
    emotes: '4_User_Interface_Elements/UI_thinking_emotes_animation_48x48.png',
  },
} as const

export type TilesetName = keyof typeof PackFiles.tilesets
export type PropSheetName = keyof typeof PackFiles.props

export function allPackFiles(): string[] {
  return Object.values(PackFiles).flatMap((group) => Object.values(group))
}
