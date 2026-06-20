<template>
  <MobileHeader :title="community?.title || 'Community'">
    <template #left>
      <MobileBackButton :to="{ name: 'Home' }" label="Communities" />
    </template>
    <MobileHeaderTitle :title="community?.title || 'Community'">
      <template #icon>
        <CommunityImage
          v-if="community"
          :community="community"
          class="size-5 shrink-0 rounded-sm bg-surface-gray-1"
        />
      </template>
    </MobileHeaderTitle>
  </MobileHeader>

  <div class="pb-24 pt-5">
    <nav>
      <MobileListRow
        v-for="(feed, index) in feeds"
        :key="feed.label"
        :border="index > 0"
        @click="router.push(feed.route)"
      >
        <template #icon>
          <span :class="[feed.icon, 'size-5 text-ink-gray-6']" aria-hidden="true" />
        </template>
        {{ feed.label }}
      </MobileListRow>
    </nav>

    <div class="mt-5 px-4 text-md text-ink-gray-5">Spaces</div>

    <nav class="mt-1">
      <MobileListRow
        v-for="(space, index) in communitySpaceList"
        :key="space.name"
        :border="index > 0"
        @click="
          router.push({
            name: 'Space',
            params: { communityId: props.communityId, spaceId: space.name },
          })
        "
      >
        <template #icon>
          <SpaceIcon :icon="space.icon" class="size-5 text-ink-gray-6" />
        </template>
        {{ space.title }}
        <template #trailing>
          <span class="flex w-12 shrink-0 items-center justify-end gap-2">
            <span v-if="getSpaceUnreadCount(space.name) > 0" class="text-md text-ink-gray-5">
              {{ getSpaceUnreadCount(space.name) }}
            </span>
            <span
              v-if="space.is_private"
              class="size-4 text-ink-gray-4 lucide-lock"
              aria-hidden="true"
            />
          </span>
        </template>
      </MobileListRow>

      <div
        v-if="communitySpaceList.length === 0"
        class="px-3 py-3 text-base leading-relaxed text-ink-gray-5"
      >
        {{ emptyMessage }}
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { usePageMeta } from 'frappe-ui'
import CommunityImage from '@/components/CommunityImage.vue'
import MobileBackButton from '@/components/MobileBackButton.vue'
import MobileHeader from '@/components/MobileHeader.vue'
import MobileHeaderTitle from '@/components/MobileHeaderTitle.vue'
import MobileListRow from '@/components/MobileListRow.vue'
import SpaceIcon from '@/components/SpaceIcon.vue'
import { useCommunity } from '@/data/communities'
import { getSpaceUnreadCount, spaces } from '@/data/spaces'

const props = defineProps<{
  communityId: string
}>()

interface FeedRow {
  label: string
  icon: string
  route: RouteLocationRaw
}

const router = useRouter()
const community = useCommunity(() => props.communityId)

const feeds = computed<FeedRow[]>(() => [
  {
    label: 'All discussions',
    icon: 'lucide-message-square-text',
    route: { name: 'Discussions', params: { communityId: props.communityId } },
  },
  {
    label: 'Unread',
    icon: 'lucide-mail-open',
    route: {
      name: 'DiscussionsTab',
      params: { communityId: props.communityId, feedType: 'unread' },
    },
  },
  {
    label: 'Participating',
    icon: 'lucide-at-sign',
    route: {
      name: 'DiscussionsTab',
      params: { communityId: props.communityId, feedType: 'participating' },
    },
  },
])

const communitySpaceList = computed(() => {
  return (spaces.data || []).filter((space) => {
    return !space.archived_at && space.team === props.communityId
  })
})

const archivedCommunitySpaces = computed(() => {
  return (spaces.data || []).filter((space) => {
    return space.archived_at && space.team === props.communityId
  })
})

const emptyMessage = computed(() => {
  if (archivedCommunitySpaces.value.length > 0) {
    return 'All spaces in this community are archived.'
  }

  return 'No spaces in this community yet.'
})

usePageMeta(() => ({ title: community.value?.title || 'Community' }))
</script>
