import seasonsFile from '../data/seasons.json'

/**
 * Seasons: times of year when the Common Room is decorated and entering the Arcade
 * unlocks a few Home items. The list is `data/seasons.json`, which the server reads
 * too (`claim_season_items` in `gp_arcade_profile.py`): the client picks the
 * decorations, the server decides what to grant.
 */

/** Inclusive, as `MM-DD`. A range whose `to` comes before its `from` ends the next year. */
export interface DateRange {
  from: string
  to: string
}

export interface Season {
  name: string
  /** The same days every year. */
  dates?: DateRange
  /** Days that move from year to year, by the year the season starts in. */
  years?: Record<string, DateRange>
  /** Lockable Home items granted to everyone who enters the Arcade during the season. */
  items: string[]
}

export type SeasonId = keyof typeof seasonsFile

export const seasons: Readonly<Record<SeasonId, Season>> = seasonsFile

export function isSeasonId(id: string): id is SeasonId {
  return Object.hasOwn(seasons, id)
}

/** The season on a `YYYY-MM-DD` day, if any. Seasons do not overlap. */
export function seasonOn(day: string): SeasonId | null {
  const year = Number(day.slice(0, 4))
  const ids = Object.keys(seasons).filter(isSeasonId)
  // A season that crosses the new year and started last year is still on in January.
  for (const startYear of [year, year - 1]) {
    const id = ids.find((id) => {
      const range = rangeIn(seasons[id], startYear)
      if (!range) return false
      const endYear = range.to < range.from ? startYear + 1 : startYear
      return `${startYear}-${range.from}` <= day && day <= `${endYear}-${range.to}`
    })
    if (id) return id
  }
  return null
}

function rangeIn(season: Season, year: number): DateRange | undefined {
  return season.years?.[String(year)] ?? season.dates
}

/**
 * The colour each season's light multiplies the Common Room by: a soft tint that
 * keeps everything readable.
 */
export const seasonLight: Readonly<Record<SeasonId, number>> = {
  halloween: 0xd8ccf2,
  diwali: 0xfff0d6,
  christmas: 0xe6eeff,
}
