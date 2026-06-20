<template>
  <MobileHeader class="sm:hidden" :title="mobileTitle">
    <template #left>
      <MobileBackButton :to="mobileBackRoute" />
    </template>
    <template #right>
      <Button
        v-if="showNewCommunityButton"
        variant="ghost"
        size="md"
        icon="lucide-plus"
        label="New community"
        @click="newCommunityDialog = true"
      />
      <Button
        v-if="showNewSpaceButton"
        variant="ghost"
        size="md"
        icon="lucide-plus"
        label="New space"
        :disabled="!canCreateSpace"
        @click="openNewSpaceDialog"
      />
    </template>
  </MobileHeader>
  <PageHeader class="hidden sm:flex">
    <Breadcrumbs class="h-7" :items="breadcrumbs" />
    <Button
      v-if="showNewCommunityButton"
      icon-left="lucide-plus"
      @click="newCommunityDialog = true"
    >
      New community
    </Button>
    <Button
      v-if="showNewSpaceButton"
      icon-left="lucide-plus"
      :disabled="!canCreateSpace"
      @click="openNewSpaceDialog"
    >
      New space
    </Button>
  </PageHeader>

  <NewCommunityDialog v-model="newCommunityDialog" />
  <NewSpaceDialog v-model="newSpaceDialog" :lockedCommunityId="selectedCommunityId || ''" />

  <div class="body-container pb-16 pt-4">
    <template v-if="selectedCommunityId">
      <ConfigureEmptyState
        v-if="!selectedCommunity"
        icon="lucide-circle-alert"
        title="Community not found"
        description="This community may have been archived, deleted, or moved."
      >
        <template #actions>
          <Button :route="{ name: 'Spaces' }">View communities</Button>
        </template>
      </ConfigureEmptyState>

      <CommunityMembersList
        v-else-if="isMembersView && selectedCommunity"
        :community="selectedCommunity"
      />
      <CommunitySpacesList
        v-else
        :community-id="selectedCommunityId"
        @create-space="openNewSpaceDialog"
      />
    </template>

    <CommunitiesList v-else @create-community="newCommunityDialog = true" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { Breadcrumbs, Button } from 'frappe-ui'
import NewSpaceDialog from '@/components/NewSpaceDialog.vue'
import MobileBackButton from '@/components/MobileBackButton.vue'
import MobileHeader from '@/components/MobileHeader.vue'
import PageHeader from '@/components/PageHeader.vue'
import { communities } from '@/data/communities'
import CommunitiesList from './CommunitiesList.vue'
import ConfigureEmptyState from './ConfigureEmptyState.vue'
import CommunityMembersList from './CommunityMembersList.vue'
import CommunitySpacesList from './CommunitySpacesList.vue'
import NewCommunityDialog from './NewCommunityDialog.vue'

type BreadcrumbItem = {
  label: string
  route?: {
    name: string
    params?: Record<string, string>
  }
}

const route = useRoute()
const newSpaceDialog = ref(false)
const newCommunityDialog = ref(false)

const selectedCommunityId = computed(() => {
  return typeof route.params.communityId === 'string' ? route.params.communityId : null
})

const selectedCommunity = computed(() => {
  if (!selectedCommunityId.value) return null
  return (communities.data || []).find((community) => community.name === selectedCommunityId.value)
})

const isMembersView = computed(() => route.name === 'CommunityMembers')
const showNewCommunityButton = computed(() => !selectedCommunityId.value)
const showNewSpaceButton = computed(() => Boolean(selectedCommunity.value && !isMembersView.value))

const mobileTitle = computed(() => {
  if (isMembersView.value) return 'Members'
  return selectedCommunity.value?.title || 'Communities'
})

// Mobile back walks one level up the hierarchy: members → spaces → communities list.
const mobileBackRoute = computed<RouteLocationRaw>(() => {
  if (isMembersView.value && selectedCommunityId.value) {
    return { name: 'CommunitySpaces', params: { communityId: selectedCommunityId.value } }
  }
  if (selectedCommunityId.value) {
    return { name: 'Spaces' }
  }
  return { name: 'More' }
})

const breadcrumbs = computed(() => {
  const items: BreadcrumbItem[] = [{ label: 'Communities', route: { name: 'Spaces' } }]
  if (selectedCommunity.value) {
    items.push({
      label: selectedCommunity.value.title,
      route: isMembersView.value
        ? { name: 'CommunitySpaces', params: { communityId: selectedCommunity.value.name } }
        : undefined,
    })
  }
  if (selectedCommunity.value && isMembersView.value) {
    items.push({ label: 'Members' })
  }
  if (selectedCommunity.value && !isMembersView.value) {
    items.push({ label: 'Spaces' })
  }
  return items
})

const canCreateSpace = computed(() =>
  Boolean(selectedCommunity.value && !selectedCommunity.value.archived_at),
)

function openNewSpaceDialog() {
  if (!canCreateSpace.value) return
  newSpaceDialog.value = true
}
</script>
