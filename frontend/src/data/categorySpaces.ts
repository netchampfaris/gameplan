import { computed, reactive } from 'vue'
import { activeCategory } from './activeCategory'
import { joinedSpaces, spaces } from './spaces'

const categorySpaceList = computed(() => {
  if (!activeCategory.id) {
    return []
  }

  return (spaces.data || []).filter((space) => {
    return !space.archived_at && space.team === activeCategory.id
  })
})

const joinedCategorySpaceList = computed(() => {
  return categorySpaceList.value.filter((space) => joinedSpaces.data?.includes(space.name))
})

const categorySpaceOptions = computed(() => {
  return categorySpaceList.value.map((space) => ({
    label: space.title,
    value: space.name,
    icon: space.icon,
  }))
})

export const categorySpaces = reactive({
  list: categorySpaceList,
  joined: joinedCategorySpaceList,
  options: categorySpaceOptions,
})
