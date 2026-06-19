import { computed, reactive } from 'vue'
import { communityState } from './communityState'
import { joinedSpaces, spaces } from './spaces'

const communitySpaceList = computed(() => {
  if (!communityState.id) {
    return []
  }

  return (spaces.data || []).filter((space) => {
    return !space.archived_at && space.team === communityState.id
  })
})

const archivedCommunitySpaceList = computed(() => {
  if (!communityState.id) {
    return []
  }

  return (spaces.data || []).filter((space) => {
    return space.archived_at && space.team === communityState.id
  })
})

const joinedCommunitySpaceList = computed(() => {
  return communitySpaceList.value.filter((space) => joinedSpaces.data?.includes(space.name))
})

const communitySpaceOptions = computed(() => {
  return communitySpaceList.value.map((space) => ({
    label: space.title,
    value: space.name,
    icon: space.icon,
  }))
})

export const communitySpaces = reactive({
  list: communitySpaceList,
  archived: archivedCommunitySpaceList,
  joined: joinedCommunitySpaceList,
  options: communitySpaceOptions,
})
