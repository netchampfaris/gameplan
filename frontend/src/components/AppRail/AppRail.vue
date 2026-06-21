<template>
  <div
    class="flex h-full w-[50px] shrink-0 flex-col items-center bg-surface-sidebar px-[11px] pb-3 pt-2.5"
    :class="showBorder ? 'border-r' : ''"
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
        v-if="activeCommunities.length"
        ref="communityListEl"
        class="flex w-full flex-col items-center gap-3 border-t border-outline-gray-2 pt-3"
      >
        <TooltipRoot v-for="community in visibleCommunities" :key="community.name">
          <TooltipTrigger as-child>
            <button
              type="button"
              class="relative flex h-7 w-full items-center justify-center text-base rounded-[7px]"
              :aria-label="community.title"
              :class="isActiveCommunity(community.name) ? 'bg-surface-gray-4' : 'bg-surface-gray-3'"
              @click="goToCommunity(community)"
            >
              <span
                v-if="isActiveCommunity(community.name)"
                class="absolute -left-[11px] top-1/2 h-7 w-1 -translate-y-1/2 rounded-r bg-surface-gray-8"
              />
              <CommunityImage
                :community="community"
                class="size-7 transition"
                :class="!isActiveCommunity(community.name) ? 'grayscale opacity-30' : ''"
              />
            </button>
          </TooltipTrigger>
          <TooltipBubble side="right">
            <template #content>
              <div class="text-base">{{ community.title }}</div>
            </template>
          </TooltipBubble>
        </TooltipRoot>

        <TooltipRoot>
          <TooltipTrigger as-child>
            <div class="flex">
              <CommunitySwitcherCombobox>
                <template #default="{ open }">
                  <button
                    type="button"
                    class="flex size-7 items-center justify-center rounded-[7px] text-ink-gray-5 transition"
                    :class="open ? 'bg-surface-base shadow-sm' : 'hover:bg-surface-gray-3'"
                    aria-label="More communities"
                  >
                    <span class="lucide-more-horizontal size-4" />
                  </button>
                </template>
              </CommunitySwitcherCombobox>
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
        ref="mainShortcutsEl"
        class="mt-3 flex w-full flex-col items-center gap-0.5 border-t border-outline-gray-2 pt-3"
      >
        <RailIcon
          v-for="item in mainShortcuts"
          :key="item.label"
          :label="item.label"
          :icon="item.icon"
          :is-active="item.isActive"
          @click="goTo(item)"
        />
      </div>

      <div class="flex-1" />
      <div
        ref="bottomGroupEl"
        class="mb-3 flex w-full flex-col items-center gap-0.5 border-b border-outline-gray-2 pb-3"
      >
        <RailIcon
          v-for="item in personalShortcuts"
          :key="item.label"
          :label="item.label"
          :icon="item.icon"
          :is-active="item.isActive"
          @click="goTo(item)"
        />
      </div>
      <UserDropdown>
        <template #trigger="{ open }">
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-full transition focus-visible:ring-0 focus-visible:focus-ring"
            :class="open ? '' : 'hover:opacity-90'"
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
import { communityState } from '@/data/communityState'
import { activeCommunities } from '@/data/communities'
import type { Community } from '@/data/communities'
import { isGameplanAdmin, useSessionUser } from '@/data/users'
import CommunityImage from '../CommunityImage.vue'
import CommunitySwitcherCombobox from './CommunitySwitcherCombobox.vue'
import GameplanLogo from '../GameplanLogo.vue'
import RailIcon from './RailIcon.vue'
import { useCommunitySlots } from './useCommunitySlots'
import UserAvatar from '../UserAvatar.vue'
import UserDropdown from '../UserDropdown.vue'

interface RailItem {
  label: string
  icon: string
  isActive: boolean
  route: RouteLocationRaw
}

const route = useRoute()
const router = useRouter()
const sessionUser = useSessionUser()

const props = defineProps<{
  showBorder: boolean
  showCommunityActiveState: boolean
}>()

const isAdmin = computed(() => isGameplanAdmin(sessionUser))

// Reads `communityListEl` / `mainShortcutsEl` / `bottomGroupEl` template refs to
// fit as many community buttons as the rail's height allows.
const { visibleCommunities } = useCommunitySlots()

const homeRoute = computed<RouteLocationRaw>(() => {
  if (communityState.id) {
    return { name: 'Discussions', params: { communityId: communityState.id } }
  }
  return { name: 'Home' }
})

const adminShortcuts = computed<RailItem[]>(() => {
  if (!isAdmin.value) return []

  return [
    {
      label: 'Configure communities',
      icon: 'lucide-folder-tree',
      isActive: isRoute('Spaces', 'CommunitySpaces', 'CommunityMembers'),
      route: { name: 'Spaces' },
    },
  ]
})

const mainShortcuts = computed<RailItem[]>(() => [
  {
    label: 'Search',
    icon: 'lucide-search',
    isActive: isRoute('Search'),
    route: { name: 'Search' },
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
  ...adminShortcuts.value,
])

const personalShortcuts = computed<RailItem[]>(() => [
  {
    label: 'Inbox',
    icon: 'lucide-inbox',
    isActive: isRoute('Notifications'),
    route: { name: 'Notifications' },
  },
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

function goTo(item: RailItem) {
  router.push(item.route)
}

function goToCommunity(community: Community) {
  communityState.change(community.name)
  router.push({ name: 'Discussions', params: { communityId: community.name } })
}

function isActiveCommunity(communityName: string) {
  return props.showCommunityActiveState && communityName === communityState.id
}

function goHome() {
  router.push(homeRoute.value)
}

function isRoute(...names: string[]) {
  return names.includes(route.name?.toString() || '')
}
</script>
