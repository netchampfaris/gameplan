import type { SeasonId } from '../config/seasons.ts'
import { composeMap, type RoomLayout } from './compose.ts'
import type { TiledMap } from './tiled.ts'
import { findDecorationProblems, findMapProblems } from './validate.ts'
import { cafe } from './world/cafe.ts'
import { commonRoom } from './world/commonRoom.ts'
import { seasonDecorations } from './world/decorations.ts'
import { library } from './world/library.ts'

/**
 * The shared world: the Common Room on top, the Library and Café below it.
 * Each room lives in its own module under world/. During a season the Common Room
 * also carries that season's decorations (world/decorations.ts).
 */
export function buildWorldMap(season: SeasonId | null = null): TiledMap {
  const build = (room: RoomLayout) =>
    composeMap({ width: 26, height: 28, rooms: [room, library, cafe] })
  const map = build(commonRoom)
  const problems = findMapProblems(map)
  if (problems.length) throw new Error(`The world map is not playable:\n- ${problems.join('\n- ')}`)
  if (!season) return map

  const decorated = build({
    ...commonRoom,
    placements: [...commonRoom.placements, ...seasonDecorations[season]],
  })
  const decorationProblems = [
    ...findMapProblems(decorated),
    ...findDecorationProblems(map, decorated),
  ]
  if (decorationProblems.length) {
    throw new Error(
      `The ${season} decorations get in the way:\n- ${decorationProblems.join('\n- ')}`,
    )
  }
  return decorated
}
