<template>
  <router-view v-slot="{ Component, route }">
    <MobileHeader v-if="!route.meta.hideHeader" class="sm:hidden" :title="space?.title || 'Space'">
      <MobileHeaderTitle :title="space?.title || 'Space'">
        <template #icon>
          <SpaceIcon :icon="space?.icon" class="size-5 text-ink-gray-6" />
        </template>
      </MobileHeaderTitle>
      <template #left>
        <Button
          variant="ghost"
          size="md"
          icon="lucide-chevron-left"
          label="Community menu"
          @click="router.push({ name: 'MobileCommunityMenu', params: { communityId } })"
        />
      </template>
      <template #right>
        <Button
          v-if="route.name === 'SpaceDiscussions' && canEditSpace"
          variant="ghost"
          size="md"
          icon="lucide-plus"
          label="New discussion"
          :route="{
            name: 'NewDiscussion',
            params: { communityId },
            query: { spaceId },
          }"
        />
      </template>
    </MobileHeader>
    <PageHeader v-if="!route.meta.hideHeader" class="hidden sm:flex">
      <div class="flex w-full items-center justify-between gap-3">
        <div class="flex items-center space-x-2">
          <SpaceBreadcrumbs :spaceId="spaceId" />
          <Badge v-if="space?.archived_at">Archived</Badge>
        </div>
        <SpaceHeaderActionsTarget />
      </div>
    </PageHeader>
    <component class="flex-1" v-if="space" :is="Component" :space="space" />
    <div class="body-container pt-5" v-if="spaceList.isFinished && !space">
      <EmptyStateBox>
        <div class="text-ink-gray-6">Page not found</div>
      </EmptyStateBox>
    </div>
  </router-view>
</template>
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, useDoctype } from 'frappe-ui'
import SpaceHeaderActionsTarget from '@/components/SpaceHeaderActionsTarget.vue'
import { useSpace, spaces as spaceList } from '@/data/spaces'
import { GPProject } from '@/types/doctypes'
import EmptyStateBox from '@/components/EmptyStateBox.vue'
import SpaceBreadcrumbs from '@/components/SpaceBreadcrumbs.vue'
import MobileHeader from '@/components/MobileHeader.vue'
import MobileHeaderTitle from '@/components/MobileHeaderTitle.vue'
import SpaceIcon from '@/components/SpaceIcon.vue'
import { readOnlyMode } from '@/data/readOnlyMode'

const props = defineProps<{
  communityId: string
  spaceId: string
}>()

const router = useRouter()
const spaces = useDoctype<GPProject>('GP Project')
const space = useSpace(() => props.spaceId)
const canEditSpace = computed(() => !readOnlyMode && !space.value?.archived_at)

// A space can only be reached under the community that owns it. If the URL carries a stale
// community (e.g. after a move), heal it to the canonical route instead of rendering a mismatch.
watch(
  space,
  (resolved) => {
    if (resolved?.team && resolved.team !== props.communityId) {
      router.replace({
        name: 'Space',
        params: { communityId: resolved.team, spaceId: props.spaceId },
      })
    }
  },
  { immediate: true },
)

onMounted(() => {
  spaces.runDocMethod.submit({
    method: 'track_visit',
    name: props.spaceId,
  })
})
</script>
