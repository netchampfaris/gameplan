import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCommonRoomMap } from '../maps/commonRoom.layout.ts'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(
  currentDirectory,
  '../../gameplan/public/limezu-modern-interiors/maps/common_room.json',
)

const map = buildCommonRoomMap()

await writeFile(outputPath, `${JSON.stringify(map, null, 2)}\n`)

console.log(`Built ${outputPath}`)
