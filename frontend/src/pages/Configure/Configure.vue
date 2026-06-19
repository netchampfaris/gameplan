<template>
  <PageHeader>
    <Breadcrumbs class="h-7" :items="breadcrumbs" />
    <Button
      v-if="selectedCommunity"
      icon-left="lucide-plus"
      :disabled="!canCreateSpace"
      @click="openNewSpaceDialog"
    >
      New space
    </Button>
  </PageHeader>

  <NewSpaceDialog v-model="newSpaceDialog" :lockedCommunityId="selectedCommunityId || ''" />

  <div class="body-container pb-16 pt-4">
    <template v-if="selectedCommunityId">
      <div v-if="!selectedCommunity" class="py-12 text-center text-base text-ink-gray-5">
        Community not found
      </div>

      <template v-else>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <TabButtons :options="spaceStatusButtons" v-model="spaceStatusFilter">
              <template #suffix="{ button }">
                <span class="rounded-full bg-surface-gray-3 px-1.5 text-xs text-ink-gray-6">
                  {{ getSpaceStatusCount(button.modelValue) }}
                </span>
              </template>
            </TabButtons>
            <TabButtons :options="spaceVisibilityButtons" v-model="spaceVisibilityFilter">
              <template #suffix="{ button }">
                <span class="rounded-full bg-surface-gray-3 px-1.5 text-xs text-ink-gray-6">
                  {{ getSpaceVisibilityCount(button.modelValue) }}
                </span>
              </template>
            </TabButtons>
          </div>
        </div>

        <div v-if="filteredSpaces.length" class="mt-3 divide-y divide-outline-gray-1 border-b">
          <div
            class="hidden grid-cols-[1.75rem_minmax(8rem,1fr)_6.5rem_15.25rem_3rem] gap-1 py-2 text-sm text-ink-gray-5 md:grid"
          >
            <div class="col-span-2">Space</div>
            <div>Visibility</div>
            <div>Content</div>
            <div class="text-right">Actions</div>
          </div>
          <SpaceRow
            v-for="space in filteredSpaces"
            :key="space.name"
            :space="space"
            :pages-count="getPagesCount(space.name)"
          />
        </div>

        <div v-else class="py-12 text-center">
          <div class="text-base text-ink-gray-6">No spaces match these filters</div>
          <div class="mt-1 text-sm text-ink-gray-5">Try a different status or visibility.</div>
        </div>
      </template>
    </template>

    <template v-else>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <TabButtons :options="communityStatusButtons" v-model="communityStatusFilter">
          <template #suffix="{ button }">
            <span class="rounded-full bg-surface-gray-3 px-1.5 text-xs text-ink-gray-6">
              {{ getCommunityStatusCount(button.modelValue) }}
            </span>
          </template>
        </TabButtons>
        <TabButtons :options="communityVisibilityButtons" v-model="communityVisibilityFilter">
          <template #suffix="{ button }">
            <span class="rounded-full bg-surface-gray-3 px-1.5 text-xs text-ink-gray-6">
              {{ getCommunityVisibilityCount(button.modelValue) }}
            </span>
          </template>
        </TabButtons>
      </div>

      <div v-if="!communities.data?.length" class="py-12 text-center text-base text-ink-gray-5">
        No communities available
      </div>

      <div
        v-else-if="filteredCommunities.length"
        class="mt-3 divide-y divide-outline-gray-1 border-b"
      >
        <div
          class="hidden grid-cols-[1.75rem_minmax(10rem,1fr)_7rem_7rem_7rem_8rem] gap-2 py-2 text-sm text-ink-gray-5 md:grid"
        >
          <div class="col-span-2">Community</div>
          <div>Spaces</div>
          <div>Members</div>
          <div>Visibility</div>
          <div class="text-right">Actions</div>
        </div>
        <CommunityRow
          v-for="community in filteredCommunities"
          :key="community.name"
          :community="community"
          :spaces-count="getCommunitySpacesCount(community.name)"
        />
      </div>

      <div v-else class="py-12 text-center">
        <div class="text-base text-ink-gray-6">No communities match these filters</div>
        <div class="mt-1 text-sm text-ink-gray-5">Try a different status or visibility.</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Breadcrumbs, Button, TabButtons, useList } from 'frappe-ui'
import NewSpaceDialog from '@/components/NewSpaceDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import { communities, type Community } from '@/data/communities'
import { spaces, type Space } from '@/data/spaces'
import type { GPPage } from '@/types/doctypes'
import CommunityRow from './CommunityRow.vue'
import SpaceRow from './SpaceRow.vue'

type StatusFilter = 'Active' | 'Archived'
type VisibilityFilter = 'All' | 'Public' | 'Private'
type PageRecord = Pick<GPPage, 'project'>

const route = useRoute()
const communityStatusFilter = ref<StatusFilter>('Active')
const communityVisibilityFilter = ref<VisibilityFilter>('All')
const spaceStatusFilter = ref<StatusFilter>('Active')
const spaceVisibilityFilter = ref<VisibilityFilter>('All')
const newSpaceDialog = ref(false)

const statusButtons = [
  { label: 'Active', value: 'Active' },
  { label: 'Archived', value: 'Archived' },
]
const visibilityButtons = [
  { label: 'All', value: 'All' },
  { label: 'Public', value: 'Public' },
  { label: 'Private', value: 'Private' },
]
const communityStatusButtons = statusButtons
const communityVisibilityButtons = visibilityButtons
const spaceStatusButtons = statusButtons
const spaceVisibilityButtons = visibilityButtons

const pages = useList<PageRecord>({
  doctype: 'GP Page',
  fields: ['project'],
  initialData: [],
  limit: 99999,
  cacheKey: 'space-page-counts',
})

const selectedCommunityId = computed(() => {
  return typeof route.params.communityId === 'string' ? route.params.communityId : null
})

const selectedCommunity = computed(() => {
  if (!selectedCommunityId.value) return null
  return (communities.data || []).find((community) => community.name === selectedCommunityId.value)
})

const breadcrumbs = computed(() => {
  const items: { label: string; route?: { name: string } }[] = [
    { label: 'Communities', route: { name: 'Spaces' } },
  ]
  if (selectedCommunity.value) {
    items.push({ label: selectedCommunity.value.title })
  }
  return items
})

const communitySpaces = computed(() => {
  if (!selectedCommunityId.value) return []
  return (spaces.data || []).filter((space) => space.team === selectedCommunityId.value)
})

const filteredSpaces = computed(() => {
  return communitySpaces.value.filter((space) => {
    return (
      matchesStatusFilter(space, spaceStatusFilter.value) &&
      matchesVisibilityFilter(space, spaceVisibilityFilter.value)
    )
  })
})

const filteredCommunities = computed(() => {
  return (communities.data || []).filter((community) => {
    return (
      matchesCommunityStatusFilter(community, communityStatusFilter.value) &&
      matchesCommunityVisibilityFilter(community, communityVisibilityFilter.value)
    )
  })
})

const pagesCountBySpace = computed(() => {
  const counts: Record<string, number> = {}
  for (const page of pages.data || []) {
    if (!page.project) continue
    counts[page.project] = (counts[page.project] || 0) + 1
  }
  return counts
})

const activeSpaceCount = computed(
  () => communitySpaces.value.filter((space) => !space.archived_at).length,
)
const archivedSpaceCount = computed(
  () => communitySpaces.value.filter((space) => space.archived_at).length,
)
const publicSpaceCount = computed(
  () => communitySpaces.value.filter((space) => !space.is_private).length,
)
const privateSpaceCount = computed(
  () => communitySpaces.value.filter((space) => space.is_private).length,
)
const activeCommunityCount = computed(
  () => (communities.data || []).filter((community) => !community.archived_at).length,
)
const archivedCommunityCount = computed(
  () => (communities.data || []).filter((community) => community.archived_at).length,
)
const publicCommunityCount = computed(
  () => (communities.data || []).filter((community) => !community.is_private).length,
)
const privateCommunityCount = computed(
  () => (communities.data || []).filter((community) => community.is_private).length,
)

const canCreateSpace = computed(() =>
  Boolean(selectedCommunity.value && !selectedCommunity.value.archived_at),
)

function matchesStatusFilter(space: Space, filter: StatusFilter) {
  return filter === 'Active' ? !space.archived_at : Boolean(space.archived_at)
}

function matchesVisibilityFilter(space: Space, filter: VisibilityFilter) {
  if (filter === 'Public') return !space.is_private
  if (filter === 'Private') return Boolean(space.is_private)
  return true
}

function matchesCommunityStatusFilter(community: Community, filter: StatusFilter) {
  return filter === 'Active' ? !community.archived_at : Boolean(community.archived_at)
}

function matchesCommunityVisibilityFilter(community: Community, filter: VisibilityFilter) {
  if (filter === 'Public') return !community.is_private
  if (filter === 'Private') return Boolean(community.is_private)
  return true
}

function getPagesCount(spaceId: string) {
  return pagesCountBySpace.value[spaceId] || 0
}

function getSpaceStatusCount(value: unknown) {
  return value === 'Archived' ? archivedSpaceCount.value : activeSpaceCount.value
}

function getSpaceVisibilityCount(value: unknown) {
  if (value === 'Public') return publicSpaceCount.value
  if (value === 'Private') return privateSpaceCount.value
  return communitySpaces.value.length
}

function getCommunityStatusCount(value: unknown) {
  return value === 'Archived' ? archivedCommunityCount.value : activeCommunityCount.value
}

function getCommunityVisibilityCount(value: unknown) {
  if (value === 'Public') return publicCommunityCount.value
  if (value === 'Private') return privateCommunityCount.value
  return communities.data?.length || 0
}

function getCommunitySpacesCount(communityId: string) {
  return (spaces.data || []).filter((space) => space.team === communityId).length
}

function openNewSpaceDialog() {
  if (!canCreateSpace.value) return
  newSpaceDialog.value = true
}
</script>
