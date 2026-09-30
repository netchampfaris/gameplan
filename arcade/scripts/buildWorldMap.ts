import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SeasonId } from '../config/seasons.ts'
import { buildWorldMap } from '../maps/world.layout.ts'
import { seasonDecorations } from '../maps/world/decorations.ts'

const mapsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../data/maps')

// The world as it is most of the year, then the same world decorated for each season.
const seasons = Object.keys(seasonDecorations) as SeasonId[]
for (const season of [null, ...seasons]) {
  const outputPath = resolve(mapsDirectory, season ? `world.${season}.json` : 'world.json')
  await writeFile(outputPath, `${JSON.stringify(buildWorldMap(season), null, 2)}\n`)
  console.log(`Built ${outputPath}`)
}
