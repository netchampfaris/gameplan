import { useDoctype } from 'frappe-ui'
import { defaultAppearance, toAppearance } from '../avatar/catalog'
import type { Celebration, CelebrationSource, Occasion } from '../interactions/party'
import { localDate } from '../util/today'
import { errorText } from './useHomes'

interface CelebrationResponse {
  celebrant: string
  full_name: string
  occasion: Occasion
  years: number | null
  candles: number
  candled: boolean
  candles_from: { user: string; full_name: string; appearance: unknown; added_at: string }[]
}

interface PartyResponse {
  day: string
  celebrations: CelebrationResponse[]
}

/**
 * The party corner for the game, through GP Arcade Candle's `get_celebrations` and
 * `add_candle`. Each call sends the player's local date, which is the day the server
 * counts.
 */
export function useCelebrationSource(): CelebrationSource {
  const candles = useDoctype('GP Arcade Candle')

  async function call(
    method: 'get_celebrations' | 'add_candle',
    params: Record<string, string>,
    fallback: string,
  ): Promise<Celebration[]> {
    let response: PartyResponse
    try {
      response = await candles.runMethod.submit({ method, params: { today: localDate(), ...params } })
    } catch (error) {
      throw new Error(errorText(error, fallback))
    }
    return response.celebrations.map(parse)
  }

  return {
    load: () => call('get_celebrations', {}, 'Could not load the party'),
    addCandle: ({ celebrant, occasion }) =>
      call('add_candle', { celebrant, occasion }, 'Could not add a candle'),
  }
}

/**
 * Returns a function that claims the Home item for the player's own birthday or work
 * anniversary, if today is one. The server checks the date and grants each item once a
 * year, and the player's tabs show "New item" for it (`useUnlockNotices`). The Arcade
 * claims when it opens, and again when the player changes their dates.
 */
export function useCelebrationClaim(): () => void {
  const profiles = useDoctype('GP Arcade Profile')
  return () => {
    profiles.runMethod
      .submit({ method: 'claim_celebration_items', params: { today: localDate() } })
      .catch((error: unknown) => {
        // Nothing for the player to do: the next visit claims again.
        console.warn('Could not claim celebration items', error)
      })
  }
}

function parse(response: CelebrationResponse): Celebration {
  return {
    celebrant: response.celebrant,
    fullName: response.full_name,
    occasion: response.occasion,
    years: response.years,
    candles: response.candles,
    candled: response.candled,
    candlesFrom: response.candles_from.map((entry) => ({
      user: entry.user,
      fullName: entry.full_name,
      appearance: toAppearance(entry.appearance, defaultAppearance(entry.user)),
      addedAt: entry.added_at,
    })),
  }
}
