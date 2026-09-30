import christmasMapUrl from '../data/maps/world.christmas.json?url'
import diwaliMapUrl from '../data/maps/world.diwali.json?url'
import halloweenMapUrl from '../data/maps/world.halloween.json?url'
import worldMapUrl from '../data/maps/world.json?url'
import { PackFiles } from './packFiles'
import type { SeasonId } from './seasons'

export const TILE_SIZE = 48

/**
 * Where LimeZu sheets are served from: the local pack through the Arcade dev
 * middleware, or the CDN set by `VITE_ARCADE_ASSET_URL` in production builds.
 */
export const PACK_BASE_URL = import.meta.env.DEV ? '/arcade-assets' : import.meta.env.VITE_ARCADE_ASSET_URL

export function packAssetUrl(file: string): string {
  return `${PACK_BASE_URL}/${file}`
}

/** Texture key for a Tiled tileset. The scene loads one per tileset a map declares. */
export function tilesetTextureKey(tilesetName: string): string {
  return `tileset:${tilesetName}`
}

export const GameAssetKeys = {
  emotes: 'ui:emotes',
} as const

// Our own data files ship with the app bundle; only LimeZu sheets come from the pack.
export const GameAssetPaths = {
  maps: {
    world: worldMapUrl,
    /** The world with the Common Room decorated for each season (`maps/world/decorations.ts`). */
    seasons: {
      halloween: halloweenMapUrl,
      diwali: diwaliMapUrl,
      christmas: christmasMapUrl,
    } satisfies Record<SeasonId, string>,
  },
  emotes: packAssetUrl(PackFiles.ui.emotes),
} as const
