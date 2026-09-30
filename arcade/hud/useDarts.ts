import { useDoctype } from 'frappe-ui'
import { ref } from 'vue'
import { defaultAppearance, toAppearance, type AvatarAppearance } from '../avatar/catalog'
import { localDate } from '../util/today'
import { errorText } from './useHomes'

interface PlayerResponse {
  user: string
  full_name: string
  appearance: unknown
  wins: number
}

interface DartsResponse {
  day: string
  week: string
  throws_per_day: number
  today: number[]
  standings: (PlayerResponse & { total: number; throws: number })[]
  last_week: {
    week: string
    settled: boolean
    top_score: number
    winners: PlayerResponse[]
  } | null
}

export interface DartsPlayer {
  user: string
  fullName: string
  appearance: AvatarAppearance
  /** How many weeks they have won, ties included. */
  wins: number
}

export interface DartsStanding extends DartsPlayer {
  /** The sum of their darts this week. */
  total: number
  /** How many darts they have thrown this week. */
  throws: number
}

export interface DartsWeek {
  /** The ISO week, like `2026-W40`. */
  week: string
  /** False until the daily job settles the week: until then the winners are the leaders so far. */
  settled: boolean
  topScore: number
  /** Everyone with the top score. Empty when nobody scored. */
  winners: DartsPlayer[]
}

export interface Darts {
  /** The player's local date, `YYYY-MM-DD`. */
  day: string
  /** The ISO week of `day`, like `2026-W40`. */
  week: string
  throwsPerDay: number
  /** The player's scores today, in the order they threw. */
  today: number[]
  /** This week's leaderboard, best total first. */
  standings: DartsStanding[]
  /** Last week's winners, or null if nobody threw last week. */
  lastWeek: DartsWeek | null
}

/**
 * Darts at the darts line, through GP Arcade Dart Throw's `get_darts` and `throw_dart`,
 * for the player's local date.
 */
export function useDarts() {
  const throws = useDoctype('GP Arcade Dart Throw')
  const data = ref<Darts | null>(null)
  const error = ref<string | null>(null)
  const isThrowing = ref(false)

  async function load() {
    try {
      data.value = parse(
        await throws.runMethod.submit({ method: 'get_darts', params: { today: localDate() } }),
      )
      error.value = null
    } catch (caught) {
      error.value = errorText(caught, 'Could not load the darts')
    }
  }

  /**
   * Records a dart for the day the dialog opened on, which stays the same if the player's
   * midnight passes while it is open. Throws with a message for the player.
   */
  async function throwDart(score: number) {
    const day = data.value?.day ?? localDate()
    isThrowing.value = true
    try {
      data.value = parse(
        await throws.runMethod.submit({ method: 'throw_dart', params: { today: day, score } }),
      )
    } catch (caught) {
      throw new Error(errorText(caught, 'Could not record your dart'))
    } finally {
      isThrowing.value = false
    }
  }

  void load()
  return { data, error, isThrowing, reload: load, throwDart }
}

function player(response: PlayerResponse): DartsPlayer {
  return {
    user: response.user,
    fullName: response.full_name,
    appearance: toAppearance(response.appearance, defaultAppearance(response.user)),
    wins: response.wins,
  }
}

function parse(response: DartsResponse): Darts {
  const lastWeek = response.last_week
  return {
    day: response.day,
    week: response.week,
    throwsPerDay: response.throws_per_day,
    today: response.today,
    standings: response.standings.map((row) => ({
      ...player(row),
      total: row.total,
      throws: row.throws,
    })),
    lastWeek: lastWeek && {
      week: lastWeek.week,
      settled: lastWeek.settled,
      topScore: lastWeek.top_score,
      winners: lastWeek.winners.map(player),
    },
  }
}
