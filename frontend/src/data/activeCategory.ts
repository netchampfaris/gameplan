import { computed, reactive } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { activeTeams, getActiveTeam, getTeam } from './teams'

const selectedCategoryId = useLocalStorage<string | null>('gameplan:activeCategory', null)

const activeCategoryId = computed(() => {
  if (selectedCategoryId.value && getActiveTeam(selectedCategoryId.value)) {
    return selectedCategoryId.value
  }

  return activeTeams.value[0]?.name ?? null
})

const activeCategoryTeam = computed(() => {
  if (!activeCategoryId.value) {
    return null
  }

  return getTeam(activeCategoryId.value) ?? null
})

export const activeCategory = reactive({
  id: activeCategoryId,
  team: activeCategoryTeam,
  change(teamId?: string | null) {
    selectedCategoryId.value = teamId ? String(teamId) : null
  },
})
