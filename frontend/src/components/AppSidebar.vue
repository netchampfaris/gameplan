<template>
  <div class="flex h-full w-56 flex-col border-r bg-surface-base">
    <template v-if="activeCategory.team">
      <div class="flex h-12 shrink-0 items-center border-b px-2 py-3">
        <CategoryDropdown />
      </div>

      <ScrollAreaRoot class="relative flex min-h-0 flex-1 flex-col">
        <ScrollAreaViewport class="h-full w-full overflow-y-auto px-2 pt-3 pb-10">
          <nav class="space-y-0.5">
            <AppSidebarLink
              :to="{ name: 'Discussions', params: { teamId: activeCategory.id } }"
              :isActive="isRoute('Discussions')"
            >
              <template #prefix>
                <LucideMessageSquareText class="size-4 text-ink-gray-6" />
              </template>
              All Discussions
            </AppSidebarLink>

            <AppSidebarLink
              :to="{
                name: 'DiscussionsTab',
                params: { teamId: activeCategory.id, feedType: 'participating' },
              }"
              :isActive="isParticipatingFeed"
            >
              <template #prefix>
                <LucideAtSign class="size-4 text-ink-gray-6" />
              </template>
              Participating
            </AppSidebarLink>

            <AppSidebarLink
              :to="{
                name: 'DiscussionsTab',
                params: { teamId: activeCategory.id, feedType: 'unread' },
              }"
              :isActive="isUnreadFeed"
            >
              <template #prefix>
                <LucideMailOpen class="size-4 text-ink-gray-6" />
              </template>
              Unread
            </AppSidebarLink>
          </nav>

          <div class="group/spaces mt-4">
            <div class="flex h-7 items-center justify-between pl-2 text-base text-ink-gray-5">
              <span>Spaces</span>
              <Button
                v-if="isAdmin"
                variant="ghost"
                size="sm"
                icon="lucide-plus"
                aria-label="New space"
                @click="openNewSpaceDialog"
              />
            </div>

            <nav class="mt-0.5 space-y-0.5">
              <AppLink
                v-for="space in spacesList"
                :key="space.name"
                :to="{ name: 'Space', params: { teamId: space.team, spaceId: space.name } }"
                class="flex h-7 items-center rounded px-2 text-ink-gray-7 transition"
                activeClass="bg-surface-elevation-3 shadow-sm"
                inactiveClass="hover:bg-surface-gray-2"
              >
                <span class="flex w-full min-w-0 items-center">
                  <component
                    :is="space.is_private ? LucideLock : LucideGlobe"
                    class="size-4 shrink-0 text-ink-gray-5"
                  />
                  <span class="ml-2 flex-1 truncate text-sm">{{ space.title }}</span>
                  <span
                    v-if="getSpaceUnreadCount(space.name) > 0"
                    class="ml-2 shrink-0 text-xs text-ink-gray-5"
                  >
                    {{ getSpaceUnreadCount(space.name) }}
                  </span>
                </span>
              </AppLink>

              <div
                v-if="spacesList.length === 0"
                class="mt-1 px-2 text-xs leading-relaxed text-ink-gray-5"
              >
                No spaces in this community yet.
                <Button
                  v-if="isAdmin"
                  size="sm"
                  icon-left="lucide-plus"
                  class="mt-2"
                  @click="openNewSpaceDialog"
                >
                  Create a space
                </Button>
              </div>
            </nav>
          </div>
        </ScrollAreaViewport>
        <ScrollBar />
      </ScrollAreaRoot>
    </template>
  </div>

  <NewSpaceDialog v-model="showNewSpaceDialog" :category="activeCategory.id ?? undefined" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ScrollAreaRoot, ScrollAreaViewport } from 'reka-ui'
import { Button } from 'frappe-ui'
import { activeCategory } from '@/data/activeCategory'
import { categorySpaces } from '@/data/categorySpaces'
import { getSpaceUnreadCount } from '@/data/spaces'
import { useSessionUser } from '@/data/users'
import AppLink from './AppLink.vue'
import AppSidebarLink from './AppSidebarLink.vue'
import CategoryDropdown from './CategoryDropdown.vue'
import NewSpaceDialog from './NewSpaceDialog.vue'
import ScrollBar from './ScrollBar.vue'
import LucideAtSign from '~icons/lucide/at-sign'
import LucideGlobe from '~icons/lucide/globe'
import LucideHash from '~icons/lucide/hash'
import LucideLock from '~icons/lucide/lock'
import LucideMailOpen from '~icons/lucide/mail-open'
import LucideMessageSquareText from '~icons/lucide/message-square-text'

const route = useRoute()
const sessionUser = useSessionUser()

const isAdmin = computed(() => sessionUser.role === 'Gameplan Admin')

const spacesList = computed(() => categorySpaces.list)

const feedType = computed(() => {
  if (route.name !== 'DiscussionsTab') return null
  return String(route.params.feedType || '')
})

const isUnreadFeed = computed(() => feedType.value === 'unread')
const isParticipatingFeed = computed(() => feedType.value === 'participating')

const showNewSpaceDialog = ref(false)

function isRoute(name: string) {
  return route.name === name
}

function openNewSpaceDialog() {
  showNewSpaceDialog.value = true
}
</script>
