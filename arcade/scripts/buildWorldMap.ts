import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildWorldMap } from '../maps/world.layout.ts'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(
  currentDirectory,
  '../data/maps/world.json',
)

const map = buildWorldMap()

await writeFile(outputPath, `${JSON.stringify(map, null, 2)}\n`)

console.log(`Built ${outputPath}`)
