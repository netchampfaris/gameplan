import { FrappeResponseError, useDoctype } from 'frappe-ui'
import { parseHome, starterHome } from '../maps/home'
import type { HomeRecord, HomeSource } from '../scenes/HomeScene'

interface HomeResponse {
  user: string
  full_name: string
  /** The saved layout, or null before its owner saves one. */
  home: unknown
}

/**
 * Loads Homes for the game through GP Arcade Profile's `get_home`. A Home nobody has
 * decorated yet, or one saved with things the catalog no longer has, still opens: the
 * starter Home fills in for the first, and `parseHome` drops what it cannot draw.
 */
export function useHomeSource(): HomeSource {
  const profiles = useDoctype('GP Arcade Profile')
  return {
    async load(user: string): Promise<HomeRecord> {
      let response: HomeResponse
      try {
        response = await profiles.runMethod.submit({ method: 'get_home', params: { user } })
      } catch (error) {
        throw new Error(playerMessage(error))
      }
      return {
        user: response.user,
        fullName: response.full_name,
        home: parseHome(response.home) ?? starterHome(response.user),
      }
    },
  }
}

/** A failed load in words for the player. */
function playerMessage(error: unknown): string {
  if (error instanceof FrappeResponseError && error.type === 'DoesNotExistError') return 'There is no Home here'
  return errorText(error, 'Could not open that Home')
}

/**
 * The server's message for the player. frappe-ui puts the exception type in front
 * ("ValidationError: ..."), which is for developers, so it is dropped here.
 */
export function errorText(error: unknown, fallback: string): string {
  if (error instanceof FrappeResponseError) {
    const prefix = `${error.type}: `
    return error.message.startsWith(prefix) ? error.message.slice(prefix.length) : fallback
  }
  return error instanceof Error && error.message ? error.message : fallback
}
