/**
 * Draw order in a Room. Avatars and props sort by their bottom y in pixels, between
 * `OBJECTS_FRONT` and `ABOVE`, so `ABOVE` must exceed any map height.
 */
export const Depth = {
  FLOOR: -30,
  DECOR: -25,
  COLLISION: -20,
  OBJECTS_BACK: -10,
  OBJECTS_FRONT: 10,
  /** Tops of tall furniture, drawn over Avatars. */
  ABOVE: 100_000,
  /** A season's light, tinting the whole world under the name tags. */
  LIGHT: 150_000,
  /** Name tags, speech bubbles and emotes: over everything in the world. */
  OVERLAY: 200_000,
} as const
