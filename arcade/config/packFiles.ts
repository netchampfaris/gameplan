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
  tilesets: {
    roomBuilder: '1_Interiors/48x48/Room_Builder_48x48.png',
    livingRoom: '1_Interiors/48x48/Theme_Sorter_48x48/2_LivingRoom_48x48.png',
    generic: '1_Interiors/48x48/Theme_Sorter_48x48/1_Generic_48x48.png',
    kitchen: '1_Interiors/48x48/Theme_Sorter_48x48/12_Kitchen_48x48.png',
    conferenceHall: '1_Interiors/48x48/Theme_Sorter_48x48/13_Conference_Hall_48x48.png',
    classroomLibrary: '1_Interiors/48x48/Theme_Sorter_48x48/5_Classroom_and_library_48x48.png',
    basement: '1_Interiors/48x48/Theme_Sorter_48x48/14_Basement_48x48.png',
  },
  characters: {
    player: '2_Characters/Character_Generator/0_Premade_Characters/48x48/Premade_Character_48x48_01.png',
  },
} as const

export function allPackFiles(): string[] {
  return Object.values(PackFiles).flatMap((group) => Object.values(group))
}
