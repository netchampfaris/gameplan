<template>
  <ScrollAreaViewport
    class="inline-flex h-full w-56 flex-1 flex-col overflow-y-auto rounded-tl-md border-r bg-surface-sidebar pb-40"
  >
    <div class="px-2 py-2">
      <CategoryDropdown />
    </div>

    <div class="flex-1 px-2 pb-4">
      <nav class="space-y-0.5" v-if="false">
        <AppSidebarLink
          v-for="link in globalNavigation"
          :key="link.name"
          :to="link.route"
          :isActive="link.isActive"
        >
          <template #prefix>
            <span :class="[link.icon, 'h-4 w-4 text-ink-gray-6']" />
          </template>
          {{ link.name }}
          <template #suffix>
            <span v-if="link.count" class="block text-xs text-ink-gray-5">
              {{ link.count }}
            </span>
            <span v-if="link.name === 'Search'" class="text-sm text-ink-gray-4">
              <template v-if="$platform === 'mac'">⌘K</template>
              <template v-else>Ctrl+K</template>
            </span>
          </template>
        </AppSidebarLink>
      </nav>

      <div v-if="activeCategory.team" class="mt-">
        <div class="px-2 flex items-center text-xs h-7 text-ink-gray-5">Channels</div>

        <!-- <CategorySwitcher v-if="activeTeams.length > 1" :is-active="isCategoryActive" />

        <AppSidebarLink v-else :to="categoryRoute" :isActive="isCategoryActive">
          <template #prefix>
            <span class="grid h-5 w-6 place-items-center text-base text-ink-gray-6">
              {{ activeCategory.team.icon }}
            </span>
          </template>
          {{ activeCategory.team.title }}
        </AppSidebarLink> -->

        <nav class="mt-0.5 space-y-0.5">
          <AppLink
            v-for="space in visibleSpaces"
            :key="space.name"
            :to="{ name: 'Space', params: { teamId: space.team, spaceId: space.name } }"
            class="flex h-7 items-center rounded px-2 text-ink-gray-7 transition"
            activeClass="bg-surface-elevation-3 shadow-sm"
            inactiveClass="hover:bg-surface-gray-2"
          >
            <span class="inline-flex min-w-0 w-full items-center">
              <span class="flex size-4 flex-shrink-0 items-center justify-center text-xl">
                {{ space.icon }}
              </span>
              <span class="ml-2 w-full flex-grow truncate text-sm">
                {{ space.title }}
              </span>
              <span v-if="space.is_private" class="lucide-lock ml-2 h-3 w-3 flex-shrink-0" />
              <span
                v-if="getSpaceUnreadCount(space.name) > 0"
                class="ml-auto pl-2 text-xs text-ink-gray-5"
              >
                {{ getSpaceUnreadCount(space.name) }}
              </span>
            </span>
          </AppLink>

          <div
            v-if="visibleSpaces.length === 0"
            class="flex h-7 items-center px-2 text-sm text-ink-gray-5"
          >
            No spaces
          </div>
        </nav>
      </div>
    </div>
  </ScrollAreaViewport>
  <ScrollBar />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { activeCategory } from '@/data/activeCategory'
import { categorySpaces } from '@/data/categorySpaces'
import { unreadNotifications } from '@/data/notifications'
import { getSpaceUnreadCount } from '@/data/spaces'
import { activeTeams } from '@/data/teams'
import { useSessionUser } from '@/data/users'
import CategorySwitcher from './CategorySwitcher.vue'
import AppSidebarLink from './AppSidebarLink.vue'
import AppLink from './AppLink.vue'
import UserDropdown from './UserDropdown.vue'
import CategoryDropdown from './CategoryDropdown.vue'
import { ScrollAreaViewport } from 'reka-ui'
import ScrollBar from './ScrollBar.vue'

const route = useRoute()
const sessionUser = useSessionUser()

const categoryRoute = computed(() => {
  if (!activeCategory.id) {
    return { name: 'Home' }
  }

  return {
    name: 'Discussions',
    params: { teamId: activeCategory.id },
  }
})

const isCategoryActive = computed(() => {
  return isCurrentRoute('Discussions', 'DiscussionsTab', 'NewDiscussion')
})

const visibleSpaces = computed(() => {
  return categorySpaces.list
})

const globalNavigation = computed(() => {
  return [
    // {
    //   name: 'Bookmarks',
    //   icon: 'lucide-bookmark',
    //   route: { name: 'Bookmarks' },
    //   isActive: isCurrentRoute('Bookmarks'),
    // },
    // {
    //   name: 'Inbox',
    //   icon: 'lucide-inbox',
    //   route: { name: 'Notifications' },
    //   count: unreadNotifications.data || 0,
    //   isActive: isCurrentRoute('Notifications'),
    // },
    // {
    //   name: 'Drafts',
    //   icon: 'lucide-pencil-line',
    //   route: { name: 'Drafts' },
    //   isActive: isCurrentRoute('Drafts'),
    // },
    // {
    //   name: 'Tasks',
    //   icon: 'lucide-list-todo',
    //   route: { name: 'MyTasks' },
    //   isActive: isCurrentRoute('MyTasks', 'Task'),
    // },
    // {
    //   name: 'Pages',
    //   icon: 'lucide-files',
    //   route: { name: 'MyPages' },
    //   isActive: isCurrentRoute('MyPages', 'Page'),
    // },
    // {
    //   name: 'People',
    //   icon: 'lucide-users-2',
    //   route: { name: 'People' },
    //   isActive: isCurrentRoute(
    //     'People',
    //     'PersonProfile',
    //     'PersonProfileAboutMe',
    //     'PersonProfilePosts',
    //     'PersonProfileReplies',
    //     'PersonProfileBookmarks',
    //   ),
    //   condition: () => sessionUser.isNotGuest,
    // },
    // {
    //   name: 'Search',
    //   icon: 'lucide-search',
    //   route: { name: 'Search' },
    //   isActive: isCurrentRoute('Search'),
    // },
    // {
    //   name: 'Spaces',
    //   icon: 'lucide-layout-grid',
    //   route: { name: 'Spaces' },
    //   isActive: isCurrentRoute('Spaces'),
    // },
  ].filter((link) => (link.condition ? link.condition() : true))
})

function isCurrentRoute(...names: string[]) {
  let routeName = route.name?.toString() || ''
  return names.includes(routeName)
}
</script>
