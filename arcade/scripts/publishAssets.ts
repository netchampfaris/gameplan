// Upload the LimeZu sheets the game loads to Cloudflare Pages.
//
//   yarn arcade:publish-assets            # stage and deploy
//   yarn arcade:publish-assets --dry-run  # stage only, to inspect arcade/.publish/
//
// Only the files in config/packFiles.ts are uploaded, never the whole pack.
// Set the printed URL as VITE_ARCADE_ASSET_URL in frontend/.env.production.
import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allPackFiles } from '../config/packFiles.ts'

const PAGES_PROJECT = process.env.ARCADE_PAGES_PROJECT ?? 'gameplan-sprites'

const arcadeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packDir = resolve(arcadeRoot, 'pack')
const publishDir = resolve(arcadeRoot, '.publish')

const missing = allPackFiles().filter((file) => !existsSync(resolve(packDir, file)))
if (missing.length) {
  console.error(`Missing from ${packDir}:\n  ${missing.join('\n  ')}`)
  process.exit(1)
}

await rm(publishDir, { recursive: true, force: true })
for (const file of allPackFiles()) {
  const target = resolve(publishDir, file)
  await mkdir(dirname(target), { recursive: true })
  await copyFile(resolve(packDir, file), target)
}

// Phaser fetches sheets cross-origin and WebGL needs CORS to upload them.
// Sheet paths are not content-hashed, so keep the cache short enough that a
// re-published sheet shows up within a day.
await writeFile(
  resolve(publishDir, '_headers'),
  '/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=86400\n',
)

console.log(`Staged ${allPackFiles().length} sheets in ${publishDir}`)

if (process.argv.includes('--dry-run')) process.exit(0)

const result = spawnSync(
  'npx',
  ['wrangler', 'pages', 'deploy', publishDir, '--project-name', PAGES_PROJECT, '--branch', 'main'],
  { stdio: 'inherit' },
)
process.exit(result.status ?? 1)
