import { useDoctype } from 'frappe-ui'
import type { CatPerson, CatSource, CatStatus } from '../interactions/pet'
import { localDate } from '../util/today'
import { errorText } from './useHomes'

interface PersonResponse {
  user: string
  full_name: string
}

interface CatResponse {
  name: string | null
  named_by: PersonResponse | null
  named_today: boolean
  favourite: PersonResponse | null
  petted_today: boolean
}

/**
 * The team cat, through GP Arcade Cat Day's `get_cat`, `pet_cat` and `name_cat`. Each call
 * sends the player's local date, which is the day the server counts.
 */
export function useCatSource(): CatSource {
  const days = useDoctype('GP Arcade Cat Day')

  async function call(
    method: 'get_cat' | 'pet_cat' | 'name_cat',
    params: Record<string, string>,
    fallback: string,
  ): Promise<CatStatus> {
    let response: CatResponse
    try {
      response = await days.runMethod.submit({ method, params: { today: localDate(), ...params } })
    } catch (error) {
      throw new Error(errorText(error, fallback))
    }
    return {
      name: response.name,
      namedBy: person(response.named_by),
      namedToday: response.named_today,
      favourite: person(response.favourite),
      pettedToday: response.petted_today,
    }
  }

  return {
    load: () => call('get_cat', {}, 'Could not load the cat'),
    pet: () => call('pet_cat', {}, 'Could not pet the cat'),
    rename: (name) => call('name_cat', { cat_name: name }, 'Could not rename the cat'),
  }
}

function person(response: PersonResponse | null): CatPerson | null {
  return response ? { user: response.user, fullName: response.full_name } : null
}
