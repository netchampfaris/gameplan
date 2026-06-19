<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <TabButtons :options="visibilityButtons" v-model="visibilityFilter">
      <template #suffix="{ button }">
        <span class="rounded-full bg-surface-gray-3 px-1.5 text-xs text-ink-gray-6">
          {{ getVisibilityCount(button.modelValue) }}
        </span>
      </template>
    </TabButtons>
    <Switch v-if="hasArchivedCommunities" v-model="showArchived" label="Show archived" />
  </div>

  <ConfigureEmptyState
    v-if="!communities.data?.length"
    icon="lucide-blocks"
    title="No communities yet"
    description="Create a community to group related spaces, members, and discussions."
  >
    <template #actions>
      <Button icon-left="lucide-plus" variant="solid" @click="emit('create-community')">
        New community
      </Button>
    </template>
  </ConfigureEmptyState>

  <ConfigureList
    v-else-if="filteredCommunities.length"
    header-class="hidden grid-cols-[minmax(12rem,6fr)_minmax(6rem,1.2fr)_minmax(6rem,1.2fr)_minmax(5.5rem,1fr)_3rem] gap-24 items-center h-7 text-sm text-ink-gray-6 md:grid"
  >
    <template #header>
      <div>Community</div>
      <div class="px-1.5">Spaces</div>
      <div class="px-1.5">Members</div>
      <div>Visibility</div>
      <div />
    </template>
    <CommunityRow
      v-for="community in filteredCommunities"
      :key="community.name"
      :community="community"
      :spaces-count="getActiveCommunitySpacesCount(community.name)"
    />
  </ConfigureList>

  <ConfigureEmptyState
    v-else
    icon="lucide-search-x"
    title="No communities match these filters"
    description="Clear the current filters to see every community."
  >
    <template #actions>
      <Button @click="clearFilters">Clear filters</Button>
    </template>
  </ConfigureEmptyState>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button, Switch, TabButtons } from 'frappe-ui'
import { communities, type Community } from '@/data/communities'
import { spaces } from '@/data/spaces'
import ConfigureEmptyState from './ConfigureEmptyState.vue'
import ConfigureList from './ConfigureList.vue'
import CommunityRow from './CommunityRow.vue'

type VisibilityFilter = 'All' | 'Public' | 'Private'

const visibilityFilter = ref<VisibilityFilter>('All')
const showArchived = ref(false)
const emit = defineEmits<{
  (event: 'create-community'): void
}>()

const visibilityButtons = [
  { label: 'All', value: 'All' },
  { label: 'Public', value: 'Public' },
  { label: 'Private', value: 'Private' },
]

const filteredCommunities = computed(() => {
  return visibleCommunities.value.filter((community) =>
    matchesVisibilityFilter(community, visibilityFilter.value),
  )
})

const visibleCommunities = computed(() =>
  (communities.data || []).filter((community) => showArchived.value || !community.archived_at),
)
const hasArchivedCommunities = computed(() =>
  (communities.data || []).some((community) => community.archived_at),
)
const publicCommunityCount = computed(
  () => visibleCommunities.value.filter((community) => !community.is_private).length,
)
const privateCommunityCount = computed(
  () => visibleCommunities.value.filter((community) => community.is_private).length,
)

watch(hasArchivedCommunities, (value) => {
  if (!value) {
    showArchived.value = false
  }
})

function matchesVisibilityFilter(community: Community, filter: VisibilityFilter) {
  if (filter === 'Public') return !community.is_private
  if (filter === 'Private') return Boolean(community.is_private)
  return true
}

function getVisibilityCount(value: unknown) {
  if (value === 'Public') return publicCommunityCount.value
  if (value === 'Private') return privateCommunityCount.value
  return visibleCommunities.value.length
}

function getActiveCommunitySpacesCount(communityId: string) {
  return (spaces.data || []).filter((space) => {
    return space.team === communityId && !space.archived_at
  }).length
}

function clearFilters() {
  visibilityFilter.value = 'All'
  showArchived.value = true
}
</script>
