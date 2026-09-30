import { useDoctype } from 'frappe-ui'
import type { PlantSource, PlantSpecies, PlantStatus } from '../interactions/plant'
import { localDate } from '../util/today'
import { errorText } from './useHomes'

interface PlantResponse {
  cycle: number
  species: PlantSpecies
  stage: number
  stages: number
  drooping: boolean
  bloomed: boolean
  watered_today: { user: string; full_name: string }[]
  watered_by_me: boolean
}

/**
 * The shared plant for the game, through GP Arcade Plant's `get_plant` and `water_plant`.
 * Each call sends the player's local date, which is the day the server counts.
 */
export function usePlantSource(): PlantSource {
  const plants = useDoctype('GP Arcade Plant')

  async function call(method: 'get_plant' | 'water_plant', fallback: string): Promise<PlantStatus> {
    let response: PlantResponse
    try {
      response = await plants.runMethod.submit({ method, params: { today: localDate() } })
    } catch (error) {
      throw new Error(errorText(error, fallback))
    }
    return {
      cycle: response.cycle,
      species: response.species,
      stage: response.stage,
      stages: response.stages,
      drooping: response.drooping,
      bloomed: response.bloomed,
      wateredToday: response.watered_today.map((entry) => ({ user: entry.user, fullName: entry.full_name })),
      wateredByMe: response.watered_by_me,
    }
  }

  return {
    load: () => call('get_plant', 'Could not load the plant'),
    water: () => call('water_plant', 'Could not water the plant'),
  }
}
