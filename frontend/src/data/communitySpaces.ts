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

const communitySpacesEmptyMessage = computed(() => {
  if (archivedCommunitySpaceList.value.length > 0) {
    return 'All spaces in this community are archived.'
  }

  return 'No spaces in this community yet.'
})

export const communitySpaces = reactive({
  list: communitySpaceList,
  archived: archivedCommunitySpaceList,
  joined: joinedCommunitySpaceList,
  options: communitySpaceOptions,
  emptyMessage: communitySpacesEmptyMessage,
})
