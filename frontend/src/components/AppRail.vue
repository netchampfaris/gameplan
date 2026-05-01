<template>
  <div
    class="flex h-full w-[52px] shrink-0 pt-1 flex-col items-center bg-surface-menu-bar px-3 pb-3"
  >
    <TooltipProvider>
      <!-- Top: category icon OR product logo, controlled by shellIconStyle preference.
           Zone is always reserved so the divider below lands at a stable Y. -->
      <div class="flex h-12 shrink-0 items-center justify-center">
        <!-- Logo style: gameplan logo at top of rail. -->
        <button
          v-if="useLogoAtTop"
          type="button"
          class="flex size-8 items-center justify-center rounded-md transition"
          :class="onCategoryRoute ? '' : 'hover:opacity-90'"
          aria-label="Home"
          @click="goHome"
        >
          <GameplanLogo class="size-7 rounded" />
        </button>

        <!-- Category style: rail-icon switcher (existing behavior). -->
        <template v-else-if="activeCategory.team">
          <CategorySwitcherCombobox v-if="hasMultipleCategories">
            <template #default="{ open }">
              <button
                type="button"
                class="flex size-8 items-center justify-center rounded-md text-base transition"
                :class="categoryIconClass(open)"
              >
                <span v-if="activeCategory.team.icon">{{ activeCategory.team.icon }}</span>
                <span v-else>{{ activeCategory.team.title?.[0] }}</span>
              </button>
            </template>
          </CategorySwitcherCombobox>

          <div
            v-else
            class="flex size-7 items-center justify-center rounded-md text-base transition"
            :class="categoryIconClass(false)"
          >
            <span v-if="activeCategory.team.icon">{{ activeCategory.team.icon }}</span>
            <span v-else>{{ activeCategory.team.title?.[0] }}</span>
          </div>
        </template>
      </div>

      <!-- Group 1: Home, Inbox, Search -->
      <div class="flex w-full flex-col items-center gap-0.5 border-outline-gray-2 pt-3">
        <RailIcon
          v-for="item in group1"
          :key="item.label"
          :label="item.label"
          :icon="item.icon"
          :is-active="item.isActive"
          @click="goTo(item)"
        />
      </div>

      <!-- Group 2: Drafts, Bookmarks, Tasks, Pages -->
      <div
        class="mt-3 flex w-full flex-col items-center gap-0.5 border-t border-outline-gray-2 pt-3"
      >
        <RailIcon
          v-for="item in group2"
          :key="item.label"
          :label="item.label"
          :icon="item.icon"
          :is-active="item.isActive"
          @click="goTo(item)"
        />
      </div>

      <!-- Group 3: People, Spaces (admin only) -->
      <div
        class="mt-3 flex w-full flex-col items-center gap-0.5 border-t border-outline-gray-2 pt-3"
      >
        <RailIcon
          v-for="item in group3"
          :key="item.label"
          :label="item.label"
          :icon="item.icon"
          :is-active="item.isActive"
          @click="goTo(item)"
        />
      </div>

      <!-- Spacer + user avatar -->
      <div class="flex-1" />
      <UserDropdown>
        <template #trigger="{ open }">
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-full transition"
            :class="open ? 'ring-2 ring-outline-gray-4' : 'hover:opacity-90'"
          >
            <UserAvatar v-if="sessionUser.name" :user="sessionUser.name" size="md" class="size-7" />
          </button>
        </template>
      </UserDropdown>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TooltipProvider } from 'reka-ui'
import type { RouteLocationRaw } from 'vue-router'
import { activeCategory } from '@/data/activeCategory'
import { activeTeams } from '@/data/teams'
import { useSessionUser } from '@/data/users'
import CategorySwitcherCombobox from './CategorySwitcherCombobox.vue'
import GameplanLogo from './GameplanLogo.vue'
import RailIcon from './AppRail/RailIcon.vue'
import UserAvatar from './UserAvatar.vue'
import UserDropdown from './UserDropdown.vue'
import { shellIconStyle } from '@/data/shellPreferences'

interface RailItem {
  label: string
  icon: string
  isActive: boolean
  route: RouteLocationRaw
}

const route = useRoute()
const router = useRouter()
const sessionUser = useSessionUser()

const hasMultipleCategories = computed(() => activeTeams.value.length > 1)

const isAdmin = computed(() => sessionUser.role === 'Gameplan Admin')

const useLogoAtTop = computed(() => shellIconStyle.value === 'logo')

const onCategoryRoute = computed(() =>
  isRoute(
    'Discussions',
    'DiscussionsTab',
    'Space',
    'SpaceDiscussions',
    'SpacePages',
    'SpacePage',
    'SpaceTasks',
    'SpaceTask',
    'Discussion',
    'NewDiscussion',
    'NewSpace',
  ),
)

const homeRoute = computed<RouteLocationRaw>(() => {
  if (activeCategory.id) {
    return { name: 'Discussions', params: { teamId: activeCategory.id } }
  }
  return { name: 'Home' }
})

function categoryIconClass(open: boolean): string {
  if (open) return 'bg-surface-gray-5 text-ink-white shadow-sm'
  if (onCategoryRoute.value) return 'bg-surface-gray-4 text-ink-white'
  if (hasMultipleCategories.value) return 'text-ink-gray-1 hover:bg-surface-gray-3'
  return 'text-ink-gray-1'
}

const group1 = computed<RailItem[]>(() => [
  {
    label: 'Home',
    icon: 'lucide-home',
    isActive: isRoute('Discussions', 'DiscussionsTab'),
    route: homeRoute.value,
  },
  {
    label: 'Inbox',
    icon: 'lucide-inbox',
    isActive: isRoute('Notifications'),
    route: { name: 'Notifications' },
  },
  {
    label: 'Search',
    icon: 'lucide-search',
    isActive: isRoute('Search'),
    route: { name: 'Search' },
  },
])

const group2 = computed<RailItem[]>(() => [
  {
    label: 'Drafts',
    icon: 'lucide-pencil-line',
    isActive: isRoute('Drafts'),
    route: { name: 'Drafts' },
  },
  {
    label: 'Bookmarks',
    icon: 'lucide-bookmark',
    isActive: isRoute('Bookmarks'),
    route: { name: 'Bookmarks' },
  },
  {
    label: 'Tasks',
    icon: 'lucide-list-todo',
    isActive: isRoute('MyTasks', 'Task'),
    route: { name: 'MyTasks' },
  },
  {
    label: 'Pages',
    icon: 'lucide-files',
    isActive: isRoute('MyPages', 'Page'),
    route: { name: 'MyPages' },
  },
])

const group3 = computed<RailItem[]>(() => {
  const items: RailItem[] = [
    {
      label: 'People',
      icon: 'lucide-users-2',
      isActive: isRoute(
        'People',
        'PersonProfile',
        'PersonProfileAboutMe',
        'PersonProfilePosts',
        'PersonProfileReplies',
      ),
      route: { name: 'People' },
    },
  ]

  if (isAdmin.value) {
    items.push({
      label: 'Spaces',
      icon: 'lucide-layout-grid',
      isActive: isRoute('Spaces'),
      route: { name: 'Spaces' },
    })
  }

  return items
})

function goTo(item: RailItem) {
  router.push(item.route)
}

function goHome() {
  router.push(homeRoute.value)
}

function isRoute(...names: string[]) {
  return names.includes(route.name?.toString() || '')
}
</script>
