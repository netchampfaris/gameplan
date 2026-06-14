import { computed, reactive } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { activeCommunities, getActiveCommunity, getCommunity } from './communities'

const selectedCommunityId = useLocalStorage<string | null>('gameplan:communityId', null)

const communityId = computed(() => {
  if (selectedCommunityId.value && getActiveCommunity(selectedCommunityId.value)) {
    return selectedCommunityId.value
  }

  return activeCommunities.value[0]?.name ?? null
})

const communityDoc = computed(() => {
  if (!communityId.value) {
    return null
  }

  return getCommunity(communityId.value) ?? null
})

export const communityState = reactive({
  id: communityId,
  doc: communityDoc,
  change(communityId?: string | null) {
    selectedCommunityId.value = communityId ? String(communityId) : null
  },
})
