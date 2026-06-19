<template>
  <PageHeader>
    <Breadcrumbs class="h-7" :items="[{ label: 'Community Spaces', route: { name: 'Spaces' } }]" />
    <Button icon-left="lucide-plus" :disabled="!canCreateSpace" @click="openNewSpaceDialog">
      New space
    </Button>
  </PageHeader>

  <NewSpaceDialog v-model="newSpaceDialog" :lockedCommunityId="selectedCommunityId || ''" />
  <EditSpaceDialog v-model="editSpaceDialog" :spaceId="spaceIdBeingEdited || ''" />

  <div class="body-container pb-16 pt-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-3xl-semibold text-ink-gray-8">Community Spaces</h1>
        <p class="mt-1 text-base text-ink-gray-5">Manage spaces for one community at a time.</p>
      </div>
      <Combobox
        v-model="selectedCommunityId"
        :options="communityOptions"
        placeholder="Select community"
        class="w-full sm:w-80"
        open-on-click
      />
    </div>

    <div class="mt-5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <TextInput
        ref="searchInputRef"
        v-model="query"
        :debounce="150"
        :placeholder="$platform == 'mac' ? 'Search spaces (⌘+F)' : 'Search spaces (Ctrl+F)'"
        class="w-full lg:max-w-sm"
      >
        <template #prefix>
          <span class="lucide-search size-4 text-ink-gray-5" />
        </template>
      </TextInput>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <TabButtons :options="statusButtons" v-model="statusFilter" />
        <TabButtons :options="visibilityButtons" v-model="visibilityFilter" />
      </div>
    </div>

    <div
      v-if="selectedCommunity"
      class="mt-5 flex flex-col gap-3 border-y border-outline-gray-1 py-3 sm:flex-row sm:items-center sm:justify-between"
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

    <div v-else-if="filteredSpaces.length" class="mt-3 divide-y divide-outline-gray-1 border-b">
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
        @edit="openEditSpaceDialog"
      />
    </div>

    <div v-else class="py-12 text-center">
      <div class="text-base text-ink-gray-6">No spaces match these filters</div>
      <div class="mt-1 text-sm text-ink-gray-5">
        Try a different status, visibility, or search term.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Breadcrumbs,
  Button,
  Combobox,
  TabButtons,
  TextInput,
  type ComboboxOption,
} from 'frappe-ui'
import NewSpaceDialog from '@/components/NewSpaceDialog.vue'
import EditSpaceDialog from '@/components/EditSpaceDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import { communities } from '@/data/communities'
import { communityState } from '@/data/communityState'
import { spaces, type Space } from '@/data/spaces'
import SpaceManagerRow from './SpaceManagerRow.vue'

type StatusFilter = 'Active' | 'Archived'
type VisibilityFilter = 'All' | 'Public' | 'Private'

const route = useRoute()
const router = useRouter()
const selectedCommunityId = ref<string | null>(null)
const query = ref('')
const statusFilter = ref<StatusFilter>('Active')
const visibilityFilter = ref<VisibilityFilter>('All')
const newSpaceDialog = ref(false)
const editSpaceDialog = ref(false)
const spaceIdBeingEdited = ref<string | null>(null)
const searchInputRef = useTemplateRef<InstanceType<typeof TextInput>>('searchInputRef')

const statusButtons = [{ label: 'Active' }, { label: 'Archived' }]
const visibilityButtons = [{ label: 'All' }, { label: 'Public' }, { label: 'Private' }]

const communityOptions = computed((): ComboboxOption[] => {
  return (communities.data || []).map((community) => ({
    label: community.archived_at ? `${community.title} (archived)` : community.title,
    value: community.name,
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
  const searchText = query.value.trim().toLowerCase()
  return communitySpaces.value.filter((space) => {
    return (
      matchesStatusFilter(space) &&
      matchesVisibilityFilter(space) &&
      (!searchText || space.title.toLowerCase().includes(searchText))
    )
  })
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

function openEditSpaceDialog(spaceId: string) {
  spaceIdBeingEdited.value = spaceId
  editSpaceDialog.value = true
}

function handleKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    const inputEl = searchInputRef.value?.el
    if (inputEl && document.activeElement !== inputEl) {
      e.preventDefault()
      inputEl.focus()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  nextTick(() => searchInputRef.value?.el?.focus())
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>
