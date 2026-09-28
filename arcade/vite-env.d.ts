/// <reference path="../frontend/node_modules/vite/client.d.ts" />

interface ImportMetaEnv {
  /** CDN base URL for LimeZu sheets in production builds, without a trailing slash. */
  readonly VITE_ARCADE_ASSET_URL: string
}
