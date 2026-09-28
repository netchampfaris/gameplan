import { createReadStream, existsSync, statSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connect, Plugin } from 'vite'

const arcadeRoot = fileURLToPath(new URL('..', import.meta.url))

/** Local copy (or symlink) of the licensed LimeZu pack. Gitignored. */
export const PACK_DIR = path.join(arcadeRoot, 'pack')
const SPRITE_ATLASES_FILE = path.join(arcadeRoot, 'data/sprite_atlases.json')

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.json': 'application/json',
}

/**
 * Arcade's Vite integration. In builds it warns when no CDN URL is set; in dev
 * it adds two endpoints to the Vite server:
 *
 * - `/arcade-assets/*` serves the LimeZu pack from `arcade/pack/`, standing in
 *   for the production CDN.
 * - `/arcade-api/sprite-atlases` reads and writes `arcade/data/sprite_atlases.json`
 *   for the asset editor, which is an authoring tool and never ships.
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
      server.middlewares.use('/arcade-api/sprite-atlases', spriteAtlasesEndpoint)
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

const spriteAtlasesEndpoint: Connect.NextHandleFunction = async (req, res, next) => {
  try {
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json')
      res.end(await readFile(SPRITE_ATLASES_FILE, 'utf8'))
      return
    }

    if (req.method === 'PUT') {
      const { atlases } = JSON.parse(await readBody(req))
      if (!Array.isArray(atlases)) {
        res.statusCode = 400
        res.end('atlases must be a list')
        return
      }
      await writeFile(SPRITE_ATLASES_FILE, `${JSON.stringify({ atlases }, null, 2)}\n`)
      res.statusCode = 204
      res.end()
      return
    }

    next()
  } catch (error) {
    next(error)
  }
}

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}
