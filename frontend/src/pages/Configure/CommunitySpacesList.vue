<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <TabButtons :options="visibilityButtons" v-model="visibilityFilter">
        <template #suffix="{ button }">
          <span class="rounded-full bg-surface-gray-3 px-1.5 text-xs text-ink-gray-6">
            {{ getVisibilityCount(button.modelValue) }}
          </span>
        </template>
      </TabButtons>
    </div>
    <Switch v-if="hasArchivedSpaces" v-model="showArchived" label="Show archived" />
  </div>

  <ConfigureList
    v-if="filteredSpaces.length"
    header-class="hidden grid-cols-[minmax(8rem,1fr)_15.25rem_6.5rem_3rem] gap-24 items-center h-7 text-sm text-ink-gray-6 md:grid"
  >
    <template #header>
      <div>Space</div>
      <div>Content</div>
      <div>Visibility</div>
      <div />
    </template>
    <SpaceRow
      v-for="space in filteredSpaces"
      :key="space.name"
      :space="space"
      :pages-count="getPagesCount(space.name)"
    />
  </ConfigureList>

  <ConfigureEmptyState
    v-else-if="!communitySpaces.length"
    icon="lucide-panels-top-left"
    title="No spaces yet"
    description="Create the first space for discussions, pages, and tasks in this community."
  >
    <template #actions>
      <Button icon-left="lucide-plus" variant="solid" @click="emit('create-space')">
        New space
      </Button>
    </template>
  </ConfigureEmptyState>

  <ConfigureEmptyState
    v-else-if="!visibleSpaces.length"
    icon="lucide-archive"
    title="No active spaces"
    description="Archived spaces are hidden from this view."
  >
    <template #actions>
      <Button @click="showArchived = true">Show archived</Button>
    </template>
  </ConfigureEmptyState>

  <ConfigureEmptyState
    v-else
    icon="lucide-search-x"
    title="No spaces match these filters"
    description="Clear the current filters to see every space in this community."
  >
    <template #actions>
      <Button @click="clearFilters">Clear filters</Button>
    </template>
  </ConfigureEmptyState>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button, Switch, TabButtons, useList } from 'frappe-ui'
import { spaces, type Space } from '@/data/spaces'
import type { GPPage } from '@/types/doctypes'
import ConfigureEmptyState from './ConfigureEmptyState.vue'
import ConfigureList from './ConfigureList.vue'
import SpaceRow from './SpaceRow.vue'

type VisibilityFilter = 'All' | 'Public' | 'Private'
type PageRecord = Pick<GPPage, 'project'>

const props = defineProps<{
  communityId: string
}>()
const emit = defineEmits<{
  (event: 'create-space'): void
}>()

const visibilityFilter = ref<VisibilityFilter>('All')
const showArchived = ref(false)

const visibilityButtons = [
  { label: 'All', value: 'All' },
  { label: 'Public', value: 'Public' },
  { label: 'Private', value: 'Private' },
]

const pages = useList<PageRecord>({
  doctype: 'GP Page',
  fields: ['project'],
  initialData: [],
  limit: 99999,
  cacheKey: 'space-page-counts',
})

const communitySpaces = computed(() => {
  return (spaces.data || []).filter((space) => space.team === props.communityId)
})

const filteredSpaces = computed(() => {
  return visibleSpaces.value.filter((space) =>
    matchesVisibilityFilter(space, visibilityFilter.value),
  )
})

const pagesCountBySpace = computed(() => {
  const counts: Record<string, number> = {}
  for (const page of pages.data || []) {
    if (!page.project) continue
    counts[page.project] = (counts[page.project] || 0) + 1
  }
  return counts
})

const visibleSpaces = computed(() =>
  communitySpaces.value.filter((space) => showArchived.value || !space.archived_at),
)
const hasArchivedSpaces = computed(() => communitySpaces.value.some((space) => space.archived_at))
const publicSpaceCount = computed(
  () => visibleSpaces.value.filter((space) => !space.is_private).length,
)
const privateSpaceCount = computed(
  () => visibleSpaces.value.filter((space) => space.is_private).length,
)

watch(hasArchivedSpaces, (value) => {
  if (!value) {
    showArchived.value = false
  }
})

function matchesVisibilityFilter(space: Space, filter: VisibilityFilter) {
  if (filter === 'Public') return !space.is_private
  if (filter === 'Private') return Boolean(space.is_private)
  return true
}

function getPagesCount(spaceId: string) {
  return pagesCountBySpace.value[spaceId] || 0
}

function getVisibilityCount(value: unknown) {
  if (value === 'Public') return publicSpaceCount.value
  if (value === 'Private') return privateSpaceCount.value
  return visibleSpaces.value.length
}

function clearFilters() {
  visibilityFilter.value = 'All'
  showArchived.value = true
}
</script>
