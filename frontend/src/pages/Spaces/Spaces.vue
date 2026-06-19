<template>
  <PageHeader>
    <Breadcrumbs class="h-7" :items="[{ label: 'Community Spaces', route: { name: 'Spaces' } }]" />
    <Button icon-left="lucide-plus" :disabled="!canCreateSpace" @click="openNewSpaceDialog">
      New space
    </Button>
  </PageHeader>

  <NewSpaceDialog v-model="newSpaceDialog" :lockedCommunityId="selectedCommunityId || ''" />

  <div class="body-container pb-16 pt-4">
    <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <Combobox
        v-model="selectedCommunityId"
        :options="communityOptions"
        placeholder="Select community"
        trigger="button"
        variant="outline"
        size="md"
        align="start"
        class="w-full lg:max-w-xl"
        open-on-click
      >
        <template #item-prefix="{ item }">
          <CommunityImage
            :community="item"
            class="size-5 shrink-0 rounded-[7px] border border-outline-gray-1 bg-surface-gray-1"
          />
        </template>

        <template #item-suffix="{ item }">
          <span v-if="item.archived_at" class="text-sm text-ink-gray-5">Archived</span>
          <span v-if="item.is_private" class="lucide-lock size-3.5 text-ink-gray-5" />
        </template>

        <template #suffix="{ open }">
          <span
            :class="[
              'lucide-chevron-down size-4 shrink-0 text-ink-gray-4 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
              open && 'rotate-180',
            ]"
          />
        </template>
      </Combobox>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <TabButtons :options="statusButtons" v-model="statusFilter">
          <template #suffix="{ button }">
            <span class="rounded-full bg-surface-gray-3 px-1.5 text-xs text-ink-gray-6">
              {{ getStatusCount(button.modelValue) }}
            </span>
          </template>
        </TabButtons>
        <TabButtons :options="visibilityButtons" v-model="visibilityFilter">
          <template #suffix="{ button }">
            <span class="rounded-full bg-surface-gray-3 px-1.5 text-xs text-ink-gray-6">
              {{ getVisibilityCount(button.modelValue) }}
            </span>
          </template>
        </TabButtons>
      </div>
    </div>

    <div v-if="!selectedCommunity" class="py-12 text-center text-base text-ink-gray-5">
      No communities available
    </div>

    <div v-else-if="filteredSpaces.length" class="mt-3 divide-y divide-outline-gray-1 border-b">
      <div
        class="hidden grid-cols-[1.75rem_minmax(8rem,1fr)_6.5rem_15.25rem_3rem] gap-1 py-2 text-sm text-ink-gray-5 md:grid"
      >
        <div class="col-span-2">Space</div>
        <div>Visibility</div>
        <div>Content</div>
        <div class="text-right">Actions</div>
      </div>
      <SpaceManagerRow
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Breadcrumbs, Button, Combobox, TabButtons, type ComboboxOption, useList } from 'frappe-ui'
import CommunityImage from '@/components/CommunityImage.vue'
import NewSpaceDialog from '@/components/NewSpaceDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import { communities } from '@/data/communities'
import { communityState } from '@/data/communityState'
import { spaces, type Space } from '@/data/spaces'
import type { GPPage } from '@/types/doctypes'
import SpaceManagerRow from './SpaceManagerRow.vue'

type StatusFilter = 'Active' | 'Archived'
type VisibilityFilter = 'All' | 'Public' | 'Private'
type PageRecord = Pick<GPPage, 'project'>

const route = useRoute()
const router = useRouter()
const selectedCommunityId = ref<string | null>(null)
const statusFilter = ref<StatusFilter>('Active')
const visibilityFilter = ref<VisibilityFilter>('All')
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
const pages = useList<PageRecord>({
  doctype: 'GP Page',
  fields: ['project'],
  initialData: [],
  limit: 99999,
  cacheKey: 'space-page-counts',
})

const communityOptions = computed((): ComboboxOption[] => {
  return (communities.data || []).map((community) => ({
    label: community.title,
    value: community.name,
    name: community.name,
    title: community.title,
    icon: community.icon,
    image: community.image,
    archived_at: community.archived_at,
    is_private: community.is_private,
  }))
})

const selectedCommunity = computed(() => {
  return (communities.data || []).find((community) => community.name === selectedCommunityId.value)
})

const communitySpaces = computed(() => {
  if (!selectedCommunityId.value) return []
  return (spaces.data || []).filter((space) => space.team === selectedCommunityId.value)
})

const filteredSpaces = computed(() => {
  return communitySpaces.value.filter((space) => {
    return matchesStatusFilter(space) && matchesVisibilityFilter(space)
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

const activeCount = computed(
  () => communitySpaces.value.filter((space) => !space.archived_at).length,
)
const archivedCount = computed(
  () => communitySpaces.value.filter((space) => space.archived_at).length,
)
const publicCount = computed(
  () => communitySpaces.value.filter((space) => !space.is_private).length,
)
const privateCount = computed(
  () => communitySpaces.value.filter((space) => space.is_private).length,
)

const canCreateSpace = computed(() =>
  Boolean(selectedCommunity.value && !selectedCommunity.value.archived_at),
)

watch(
  communityOptions,
  () => {
    if (!selectedCommunityId.value || !isValidCommunity(selectedCommunityId.value)) {
      selectedCommunityId.value = getInitialCommunityId()
    }
  },
  { immediate: true },
)

watch(
  () => route.query.teamId,
  () => {
    const routeCommunityId = getRouteCommunityId()
    if (routeCommunityId && isValidCommunity(routeCommunityId)) {
      selectedCommunityId.value = routeCommunityId
    }
  },
  { immediate: true },
)

watch(selectedCommunityId, (communityId) => {
  if (!communityId || route.query.teamId === communityId) return

  router.replace({
    name: 'Spaces',
    query: {
      ...route.query,
      teamId: communityId,
    },
  })
})

function matchesStatusFilter(space: Space) {
  return statusFilter.value === 'Active' ? !space.archived_at : Boolean(space.archived_at)
}

function matchesVisibilityFilter(space: Space) {
  if (visibilityFilter.value === 'Public') return !space.is_private
  if (visibilityFilter.value === 'Private') return Boolean(space.is_private)
  return true
}

function getPagesCount(spaceId: string) {
  return pagesCountBySpace.value[spaceId] || 0
}

function getStatusCount(value: unknown) {
  return value === 'Archived' ? archivedCount.value : activeCount.value
}

function getVisibilityCount(value: unknown) {
  if (value === 'Public') return publicCount.value
  if (value === 'Private') return privateCount.value
  return communitySpaces.value.length
}

function getInitialCommunityId() {
  const routeCommunityId = getRouteCommunityId()
  if (routeCommunityId && isValidCommunity(routeCommunityId)) return routeCommunityId
  if (communityState.id && isValidCommunity(communityState.id)) return communityState.id

  const activeCommunity = (communities.data || []).find((community) => !community.archived_at)
  return activeCommunity?.name || communities.data?.[0]?.name || null
}

function getRouteCommunityId() {
  return typeof route.query.teamId === 'string' ? route.query.teamId : null
}

function isValidCommunity(communityId: string) {
  return Boolean((communities.data || []).find((community) => community.name === communityId))
}

function openNewSpaceDialog() {
  if (!canCreateSpace.value) return
  newSpaceDialog.value = true
}
</script>
