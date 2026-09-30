import { useDoctype } from 'frappe-ui'
import { ref } from 'vue'
import { defaultAppearance, toAppearance, type AvatarAppearance } from '../avatar/catalog'
import { isPrefabId, type PrefabId } from '../maps/prefabs'
import { localDate } from '../util/today'
import { errorText } from './useHomes'

interface PuzzleResponse {
  day: string
  number: number
  rows: string[]
  item: string | null
  result: PuzzleScore | null
  count: number
  results: {
    user: string
    full_name: string
    appearance: unknown
    seconds: number
    mistakes: number
  }[]
}

export interface PuzzleScore {
  seconds: number
  mistakes: number
}

export interface PuzzleResult extends PuzzleScore {
  user: string
  fullName: string
  appearance: AvatarAppearance
}

export interface DailyPuzzle {
  /** The player's local date the puzzle is for, `YYYY-MM-DD`. */
  day: string
  /** Puzzle #1 was the first day's; it goes up by one a day. */
  number: number
  /** The answer, as rows of `#` (filled) and `.` (empty). */
  rows: string[]
  /** The item it draws. Null until the player solves it: the server holds it back. */
  item: PrefabId | null
  /** The player's own result, or null before they solve it. */
  result: PuzzleScore | null
  /** How many people have solved it today. */
  count: number
  /** Everyone's results, fastest first. Empty until the player solves it. */
  results: PuzzleResult[]
}

/**
 * The daily puzzle at the puzzle cabinet, through GP Arcade Puzzle Result's `get_puzzle`
 * and `submit_puzzle`, for the player's local date.
 */
export function useDailyPuzzle() {
  const puzzles = useDoctype('GP Arcade Puzzle Result')
  const data = ref<DailyPuzzle | null>(null)
  const error = ref<string | null>(null)
  const isSubmitting = ref(false)

  async function load() {
    try {
      data.value = parse(
        await puzzles.runMethod.submit({ method: 'get_puzzle', params: { today: localDate() } }),
      )
      error.value = null
    } catch (caught) {
      error.value = errorText(caught, 'Could not load the puzzle')
    }
  }

  /**
   * Sends the solved grid for the puzzle's day, which stays the same if the player's
   * midnight passes while they play. Throws with a message for the player.
   */
  async function submit(grid: string[], score: PuzzleScore) {
    const puzzle = data.value
    if (!puzzle) return
    isSubmitting.value = true
    try {
      data.value = parse(
        await puzzles.runMethod.submit({
          method: 'submit_puzzle',
          params: { today: puzzle.day, grid, seconds: score.seconds, mistakes: score.mistakes },
        }),
      )
    } catch (caught) {
      throw new Error(errorText(caught, 'Could not save your result'))
    } finally {
      isSubmitting.value = false
    }
  }

  void load()
  return { data, error, isSubmitting, submit }
}

function parse(response: PuzzleResponse): DailyPuzzle {
  return {
    day: response.day,
    number: response.number,
    rows: response.rows,
    item: response.item !== null && isPrefabId(response.item) ? response.item : null,
    result: response.result,
    count: response.count,
    results: response.results.map((entry) => ({
      user: entry.user,
      fullName: entry.full_name,
      appearance: toAppearance(entry.appearance, defaultAppearance(entry.user)),
      seconds: entry.seconds,
      mistakes: entry.mistakes,
    })),
  }
}
