<template>
  <router-view v-slot="{ Component, route }">
    <PageHeader v-if="!route.meta.hideHeader">
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
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDoctype } from 'frappe-ui'
import SpaceHeaderActionsTarget from '@/components/SpaceHeaderActionsTarget.vue'
import { useSpace, spaces as spaceList } from '@/data/spaces'
import { GPProject } from '@/types/doctypes'
import EmptyStateBox from '@/components/EmptyStateBox.vue'
import SpaceBreadcrumbs from '@/components/SpaceBreadcrumbs.vue'

const props = defineProps<{
  communityId: string
  spaceId: string
}>()

const router = useRouter()
const spaces = useDoctype<GPProject>('GP Project')
const space = useSpace(() => props.spaceId)

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
