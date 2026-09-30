import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connect, Plugin } from 'vite'

const arcadeRoot = fileURLToPath(new URL('..', import.meta.url))

/** Local copy (or symlink) of the licensed LimeZu pack. Gitignored. */
export const PACK_DIR = path.join(arcadeRoot, 'pack')

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.gif': 'image/gif',
}

/**
 * Arcade's Vite integration. In builds it warns when no CDN URL is set; in dev it
 * serves the LimeZu pack from `arcade/pack/` at `/arcade-assets/*`, standing in for
 * the production CDN.
 */
export function arcadePlugin(): Plugin {
  return {
    name: 'arcade',
    configResolved(config) {
      if (config.command === 'build' && !config.env.VITE_ARCADE_ASSET_URL) {
        config.logger.warn(
          '[arcade] VITE_ARCADE_ASSET_URL is not set, so Arcade sprites will not load in this build.',
        )
      }
    },
    configureServer(server) {
      if (!existsSync(PACK_DIR)) {
        server.config.logger.warn(
          `[arcade] ${PACK_DIR} is missing, so Arcade sprites will not load. ` +
            'Symlink or copy the LimeZu Modern Interiors pack there (see arcade/README.md).',
        )
      }
      server.middlewares.use('/arcade-assets', servePackFile)
    },
  }
}

const servePackFile: Connect.NextHandleFunction = (req, res, next) => {
  const relativePath = decodeURIComponent((req.url ?? '').split('?')[0])
  const filePath = path.join(PACK_DIR, relativePath)
  if (!filePath.startsWith(PACK_DIR + path.sep) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return next()
  }

  res.setHeader('Content-Type', CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream')
  createReadStream(filePath).pipe(res)
}
