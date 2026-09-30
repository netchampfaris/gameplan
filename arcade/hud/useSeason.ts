import { useDoctype } from 'frappe-ui'
import { isSeasonId, seasonOn, type SeasonId } from '../config/seasons'
import { localDate } from '../util/today'

/**
 * The season the Common Room is decorated for, picked once when the Arcade opens,
 * from the player's local date. During a season this also claims its Home items:
 * the server works out the season from the date again and grants each item once,
 * and the player's tabs show "New item" for each (`useUnlockNotices`).
 *
 * In development, `?season=halloween` (or `?season=none`) previews a season's
 * decorations without claiming anything. Production builds drop the preview.
 */
export function useSeason(): SeasonId | null {
  if (import.meta.env.DEV) {
    const preview = new URLSearchParams(window.location.search).get('season')
    if (preview === 'none') return null
    if (preview && isSeasonId(preview)) return preview
  }

  const today = localDate()
  const season = seasonOn(today)
  if (season) {
    const profiles = useDoctype('GP Arcade Profile')
    profiles.runMethod
      .submit({ method: 'claim_season_items', params: { today } })
      .catch((error: unknown) => {
        // Nothing for the player to do: the next visit claims again.
        console.warn('Could not claim season items', error)
      })
  }
  return season
}
