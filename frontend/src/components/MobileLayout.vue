<template>
  <div class="fixed inset-0 flex flex-col overflow-hidden touch-none">
    <div
      id="scrollContainer"
      class="flex-1 overflow-y-auto overscroll-auto bg-surface-base [-webkit-overflow-scrolling:touch]"
    >
      <slot />
    </div>

    <div
      v-if="!isNewCommentOpen"
      class="shrink-0 border-t border-outline-gray-2 bg-surface-elevation-2 standalone:pb-4"
    >
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          class="flex flex-col items-center justify-center py-3 transition active:scale-95"
          @click="onTabClick(tab)"
        >
          <span
            :class="[tab.icon, 'h-6 w-6', tab.isActive ? 'text-ink-gray-8' : 'text-ink-gray-5']"
          />
        </button>
      </div>
    </div>
  </div>

  <MobileCategorySpacesSheet v-model="showCategorySpacesSheet" />
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { activeCategory } from '@/data/activeCategory'
import { isNewCommentOpen } from '@/data/newComment'
import { showCategorySpacesSheet } from '@/data/categorySpacesSheet'
import { useSessionUser } from '@/data/users'
import { scrollTo } from '@/utils/scrollContainer'
import MobileCategorySpacesSheet from './MobileCategorySpacesSheet.vue'

const route = useRoute()
const router = useRouter()
const sessionUser = useSessionUser()

const tabs = computed(() => {
  return [
    {
      name: 'Discussions',
      icon: 'lucide-newspaper',
      route: activeCategory.id
        ? { name: 'Discussions', params: { teamId: activeCategory.id } }
        : { name: 'Home' },
      isActive: testRoute(/Discussions|Discussion|NewDiscussion/g),
    },
    {
      name: 'MyTasks',
      icon: 'lucide-list-todo',
      route: { name: 'MyTasks' },
      isActive: testRoute(/MyTasks|Task/g),
    },
    {
      name: 'Spaces',
      icon: 'lucide-layout-grid',
      route: { name: 'Spaces' },
      isActive: route.name === 'Spaces',
    },
    {
      name: 'People',
      icon: 'lucide-users-2',
      route: { name: 'People' },
      isActive: testRoute(/People|PersonProfile/g),
      condition: () => sessionUser.isNotGuest,
    },
    {
      name: 'Search',
      icon: 'lucide-search',
      route: { name: 'Search' },
      isActive: route.name === 'Search',
      condition: () => sessionUser.isNotGuest,
    },
    {
      name: 'Notifications',
      icon: 'lucide-inbox',
      route: { name: 'Notifications' },
      isActive: route.name === 'Notifications',
    },
  ].filter((tab) => (tab.condition ? tab.condition() : true))
})

function onTabClick(tab: (typeof tabs.value)[number]) {
  if (tab.isActive) {
    scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  router.push(tab.route)
}

function testRoute(regex: RegExp) {
  return route.name ? regex.test(route.name.toString()) : false
}
</script>
