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
        class="w-full lg:max-w-sm"
        open-on-click
      >
        <template #item-prefix="{ item }">
          <CommunityImage :community="item" class="size-5 shrink-0 bg-surface-gray-1" />
        </template>
      </Combobox>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <TabButtons :options="statusButtons" v-model="statusFilter" />
        <TabButtons :options="visibilityButtons" v-model="visibilityFilter" />
      </div>
    </div>

    <div
      v-if="selectedCommunity"
      class="mt-3 flex flex-col gap-2 border-y border-outline-gray-1 py-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex min-w-0 items-center gap-2">
        <div class="min-w-0 text-base-medium text-ink-gray-8">
          {{ selectedCommunity.title }}
        </div>
        <Badge v-if="selectedCommunity.archived_at">Archived community</Badge>
        <Badge v-if="selectedCommunity.is_private">
          <template #prefix><span class="lucide-lock size-3" /></template>
          Private
        </Badge>
      </div>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-gray-5">
        <span>{{ activeCount }} active</span>
        <span>{{ archivedCount }} archived</span>
        <span>{{ publicCount }} public</span>
        <span>{{ privateCount }} private</span>
      </div>
    </div>

    <div v-if="!selectedCommunity" class="py-12 text-center text-base text-ink-gray-5">
      No communities available
    </div>

    <div v-else-if="filteredSpaces.length" class="mt-2 divide-y divide-outline-gray-1 border-b">
      <div
        class="hidden grid-cols-[2rem_minmax(0,1fr)_7rem_8rem_8rem] gap-3 px-3 py-2 text-sm text-ink-gray-5 md:grid"
      >
        <div></div>
        <div>Space</div>
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
import {
  Badge,
  Breadcrumbs,
  Button,
  Combobox,
  TabButtons,
  type ComboboxOption,
  useList,
} from 'frappe-ui'
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

const statusButtons = [{ label: 'Active' }, { label: 'Archived' }]
const visibilityButtons = [{ label: 'All' }, { label: 'Public' }, { label: 'Private' }]
const pages = useList<PageRecord>({
  doctype: 'GP Page',
  fields: ['project'],
  initialData: [],
  limit: 99999,
  cacheKey: 'space-page-counts',
})

const communityOptions = computed((): ComboboxOption[] => {
  return (communities.data || []).map((community) => ({
    label: community.archived_at ? `${community.title} (archived)` : community.title,
    value: community.name,
    name: community.name,
    title: community.title,
    icon: community.icon,
    image: community.image,
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
