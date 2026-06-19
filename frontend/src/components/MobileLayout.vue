<template>
  <div class="fixed inset-0 flex flex-col overflow-hidden touch-none">
    <div v-if="showHomeTopBar" class="shrink-0 border-b border-outline-gray-2 bg-surface-base">
      <div class="flex items-center gap-2 px-4 py-2">
        <button
          v-if="communityState.doc"
          class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-gray-7 transition active:bg-surface-gray-2"
          @click="showCommunitySpacesSheet = true"
        >
          <CommunityImage
            :community="communityState.doc"
            class="size-6 shrink-0 bg-surface-gray-1"
          />
          <span class="truncate text-base-medium text-ink-gray-9">
            {{ communityState.doc.title }}
          </span>
          <LucideChevronsUpDown
            v-if="activeCommunities.length > 1"
            class="ml-auto size-4 text-ink-gray-5"
          />
        </button>
      </div>
    </div>

    <div id="pageHeaderTarget" />

    <div
      id="scrollContainer"
      class="flex-1 overflow-y-auto overscroll-auto bg-surface-base [-webkit-overflow-scrolling:touch]"
    >
      <ReadOnlyBanner v-if="readOnlyMode" />
      <slot />
    </div>

    <div
      v-if="!isNewCommentOpen"
      class="shrink-0 border-t border-outline-gray-2 bg-surface-elevation-2 standalone:pb-4"
    >
      <div class="grid grid-cols-4">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          class="flex flex-col items-center justify-center py-3 transition active:scale-95"
          @click="onTabClick(tab)"
        >
          <span
            :class="[tab.icon, 'size-6', tab.isActive ? 'text-ink-gray-8' : 'text-ink-gray-5']"
          />
        </button>
      </div>
    </div>
  </div>

  <MobileCommunitySpacesSheet v-model="showCommunitySpacesSheet" />
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { communityState } from '@/data/communityState'
import { isNewCommentOpen } from '@/data/newComment'
import { showCommunitySpacesSheet } from '@/data/communitySpacesSheet'
import { activeCommunities } from '@/data/communities'
import { scrollTo } from '@/utils/scrollContainer'
import CommunityImage from './CommunityImage.vue'
import MobileCommunitySpacesSheet from './MobileCommunitySpacesSheet.vue'
import ReadOnlyBanner from './ReadOnlyBanner.vue'
import { readOnlyMode } from '@/data/readOnlyMode'
import LucideChevronsUpDown from '~icons/lucide/chevrons-up-down'

interface MobileTab {
  name: 'Home' | 'Inbox' | 'Search' | 'More'
  icon: string
  route: RouteLocationRaw
  isActive: boolean
}

const route = useRoute()
const router = useRouter()

const onCommunityRoute = computed(() => route.matched.some((record) => record.meta?.communityScope))
const isHomeRoute = computed(() => ['Discussions', 'DiscussionsTab'].includes(String(route.name)))

const showHomeTopBar = computed(() => onCommunityRoute.value && Boolean(communityState.doc))

const tabs = computed<MobileTab[]>(() => [
  {
    name: 'Home',
    icon: 'lucide-home',
    route: communityState.id
      ? { name: 'Discussions', params: { communityId: communityState.id } }
      : { name: 'Home' },
    isActive: isHomeRoute.value,
  },
  {
    name: 'Inbox',
    icon: 'lucide-inbox',
    route: { name: 'Notifications' },
    isActive: route.name === 'Notifications',
  },
  {
    name: 'Search',
    icon: 'lucide-search',
    route: { name: 'Search' },
    isActive: route.name === 'Search',
  },
  {
    name: 'More',
    icon: 'lucide-menu',
    route: { name: 'More' },
    isActive: isMoreRoute(),
  },
])

function isMoreRoute() {
  const name = route.name?.toString() || ''
  return [
    'More',
    'Bookmarks',
    'People',
    'PersonProfile',
    'PersonProfileAboutMe',
    'PersonProfilePosts',
    'PersonProfileReplies',
    'MyPages',
    'Page',
    'MyTasks',
    'Task',
    'Drafts',
    'Spaces',
    'CommunitySpaces',
  ].includes(name)
}

function onTabClick(tab: MobileTab) {
  if (tab.isActive) {
    scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  router.push(tab.route)
}
</script>
