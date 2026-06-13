<template>
  <div
    class="flex h-full w-[50px] shrink-0 flex-col items-center bg-surface-sidebar px-[11px] pb-3 pt-2.5"
  >
    <TooltipProvider>
      <div class="flex shrink-0 items-center justify-center mb-3">
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-[7px] transition"
          :class="isRoute('Home') ? 'bg-surface-base shadow-sm' : 'hover:opacity-90'"
          aria-label="Home"
          @click="goHome"
        >
          <GameplanLogo class="size-7 rounded-[7px]" />
        </button>
      </div>

      <div
        v-if="activeTeams.length"
        class="flex w-full flex-col items-center gap-3 border-t border-outline-gray-2 pt-3"
      >
        <TooltipRoot v-for="team in visibleCommunities" :key="team.name">
          <TooltipTrigger as-child>
            <button
              type="button"
              class="relative flex h-7 w-full items-center justify-center text-base"
              :aria-label="team.title"
              @click="goToCommunity(team)"
            >
              <span
                v-if="team.name === activeCategory.id"
                class="absolute -left-[11px] top-1/2 h-7 w-1 -translate-y-1/2 rounded-r bg-surface-gray-8"
              />
              <span
                class="flex size-7 items-center justify-center overflow-hidden rounded-[7px] transition"
                :class="communityIconClass(team.name)"
              >
                <img
                  v-if="team.image"
                  :src="team.image"
                  :alt="team.title"
                  class="size-full object-cover"
                />
                <span v-else-if="team.icon" class="leading-none">{{ team.icon }}</span>
                <span v-else class="text-xs font-medium uppercase">{{ team.title?.[0] }}</span>
              </span>
            </button>
          </TooltipTrigger>
          <TooltipBubble side="right">
            <template #content>
              <div class="text-base">{{ team.title }}</div>
            </template>
          </TooltipBubble>
        </TooltipRoot>

        <TooltipRoot>
          <TooltipTrigger as-child>
            <div class="flex">
              <CategorySwitcherCombobox>
                <template #default="{ open }">
                  <button
                    type="button"
                    class="flex size-7 items-center justify-center rounded-[7px] text-ink-gray-6 transition"
                    :class="open ? 'bg-surface-base shadow-sm' : 'hover:bg-surface-gray-3'"
                    aria-label="More communities"
                  >
                    <span class="lucide-more-horizontal size-4" />
                  </button>
                </template>
              </CategorySwitcherCombobox>
            </div>
          </TooltipTrigger>
          <TooltipBubble side="right">
            <template #content>
              <div class="leading-relaxed">More communities</div>
            </template>
          </TooltipBubble>
        </TooltipRoot>
      </div>

      <div
        class="mt-3 flex w-full flex-col items-center gap-0.5 border-t border-outline-gray-2 pt-3"
      >
        <RailIcon
          v-for="item in primaryShortcuts"
          :key="item.label"
          :label="item.label"
          :icon="item.icon"
          :is-active="item.isActive"
          @click="goTo(item)"
        />
      </div>

      <div
        class="mt-3 flex w-full flex-col items-center gap-0.5 border-t border-outline-gray-2 pt-3"
      >
        <RailIcon
          v-for="item in shortcuts"
          :key="item.label"
          :label="item.label"
          :icon="item.icon"
          :is-active="item.isActive"
          @click="goTo(item)"
        />
      </div>

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
import { TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui'
import { TooltipBubble } from 'frappe-ui'
import type { RouteLocationRaw } from 'vue-router'
import { activeCategory } from '@/data/activeCategory'
import { activeTeams } from '@/data/teams'
import type { Team } from '@/data/teams'
import { useSessionUser } from '@/data/users'
import CategorySwitcherCombobox from './CategorySwitcherCombobox.vue'
import GameplanLogo from './GameplanLogo.vue'
import RailIcon from './AppRail/RailIcon.vue'
import UserAvatar from './UserAvatar.vue'
import UserDropdown from './UserDropdown.vue'

interface RailItem {
  label: string
  icon: string
  isActive: boolean
  route: RouteLocationRaw
}

const route = useRoute()
const router = useRouter()
const sessionUser = useSessionUser()

const communitySlotCount = 5

const isAdmin = computed(() => sessionUser.role === 'Gameplan Admin')

const visibleCommunities = computed(() => {
  return activeTeams.value.slice(0, communitySlotCount)
})

const homeRoute = computed<RouteLocationRaw>(() => {
  if (activeCategory.id) {
    return { name: 'Discussions', params: { teamId: activeCategory.id } }
  }
  return { name: 'Home' }
})

function communityIconClass(teamId: string): string {
  if (teamId === activeCategory.id) return ''
  return 'grayscale opacity-50'
}

const primaryShortcuts = computed<RailItem[]>(() => [
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

const secondaryShortcuts = computed<RailItem[]>(() => [
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
])

const adminShortcuts = computed<RailItem[]>(() => {
  if (!isAdmin.value) return []

  return [
    {
      label: 'Spaces',
      icon: 'lucide-layout-grid',
      isActive: isRoute('Spaces'),
      route: { name: 'Spaces' },
    },
  ]
})

const shortcuts = computed(() => [...secondaryShortcuts.value, ...adminShortcuts.value])

function goTo(item: RailItem) {
  router.push(item.route)
}

function goToCommunity(team: Team) {
  activeCategory.change(team.name)
  router.push({ name: 'Discussions', params: { teamId: team.name } })
}

function goHome() {
  router.push(homeRoute.value)
}

function isRoute(...names: string[]) {
  return names.includes(route.name?.toString() || '')
}
</script>
