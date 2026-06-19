<template>
  <div class="flex h-full w-56 flex-col bg-surface-sidebar">
    <template v-if="communityState.doc">
      <div class="flex shrink-0 items-center p-2">
        <AppDropdown />
      </div>

      <ScrollAreaRoot class="relative flex min-h-0 flex-1 flex-col">
        <ScrollAreaViewport class="h-full w-full overflow-y-auto px-2 pt-0.5 pb-10">
          <nav class="space-y-0.5">
            <AppSidebarLink
              :to="{ name: 'Discussions', params: { communityId: communityState.id } }"
              :isActive="isRoute('Discussions')"
            >
              <template #prefix>
                <span class="size-4 lucide-message-square-text" />
              </template>
              All Discussions
            </AppSidebarLink>

            <AppSidebarLink
              :to="{
                name: 'DiscussionsTab',
                params: { communityId: communityState.id, feedType: 'participating' },
              }"
              :isActive="isParticipatingFeed"
            >
              <template #prefix>
                <span class="size-4 lucide-at-sign" />
              </template>
              Participating
            </AppSidebarLink>

            <AppSidebarLink
              :to="{
                name: 'DiscussionsTab',
                params: { communityId: communityState.id, feedType: 'unread' },
              }"
              :isActive="isUnreadFeed"
            >
              <template #prefix>
                <span class="size-4 lucide-mail-open" />
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
                icon="lucide-plus text-ink-gray-5"
                label="New space"
                @click="openNewSpaceDialog"
              />
            </div>

            <nav class="mt-0.5 space-y-0.5">
              <div
                v-for="space in spacesList"
                :key="space.name"
                class="group/space flex h-7 items-center rounded transition"
                :class="
                  isActiveSpace(space.name)
                    ? 'bg-surface-elevation-3 text-ink-gray-8 shadow-sm'
                    : 'text-ink-gray-6 hover:bg-surface-gray-2'
                "
              >
                <AppLink
                  :to="{ name: 'Space', params: { communityId: space.team, spaceId: space.name } }"
                  class="flex h-full min-w-0 flex-1 items-center pl-2"
                  activeClass=""
                  inactiveClass=""
                >
                  <span class="flex w-full min-w-0 items-center">
                    <SpaceIcon :icon="space.icon" class="size-4" />
                    <span class="ml-2 flex-1 truncate text-sm">{{ space.title }}</span>
                    <LucideLock
                      v-if="space.is_private"
                      class="ml-1 size-3 shrink-0 text-ink-gray-5"
                    />
                  </span>
                </AppLink>
                <div class="relative mr-1 flex h-7 w-7 shrink-0 items-center justify-end">
                  <span
                    v-if="getSpaceUnreadCount(space.name) > 0"
                    class="absolute right-1 text-xs text-ink-gray-5 transition-opacity group-hover/space:opacity-0 group-focus-within/space:opacity-0"
                  >
                    {{ getSpaceUnreadCount(space.name) }}
                  </span>
                  <Dropdown :options="spaceOptions(space)" align="start" side="right">
                    <template #default="{ open }">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon="lucide-more-horizontal text-ink-gray-5"
                        :label="`${space.title} options`"
                        class="absolute right-0 opacity-0 group-hover/space:opacity-100 group-focus-within/space:opacity-100"
                        :class="open ? 'opacity-100' : ''"
                      />
                    </template>
                  </Dropdown>
                </div>
              </div>

              <div
                v-if="spacesList.length === 0"
                class="mt-1 px-2 text-xs leading-relaxed text-ink-gray-5"
              >
                {{ communitySpaces.emptyMessage }}
                <Button
                  v-if="isAdmin && communitySpaces.archived.length === 0"
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

  <NewSpaceDialog
    v-model="showNewSpaceDialog"
    :lockedCommunityId="communityState.id ?? undefined"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ScrollAreaRoot, ScrollAreaViewport } from 'reka-ui'
import { Button, Dropdown } from 'frappe-ui'
import { communityState } from '@/data/communityState'
import { communitySpaces } from '@/data/communitySpaces'
import { getSpaceUnreadCount, markAllAsRead, type Space } from '@/data/spaces'
import { useSessionUser } from '@/data/users'
import AppLink from './AppLink.vue'
import AppDropdown from './AppDropdown.vue'
import AppSidebarLink from './AppSidebarLink.vue'
import NewSpaceDialog from './NewSpaceDialog.vue'
import ScrollBar from './ScrollBar.vue'
import SpaceIcon from './SpaceIcon.vue'
import LucideAtSign from '~icons/lucide/at-sign'
import LucideLock from '~icons/lucide/lock'
import LucideMailOpen from '~icons/lucide/mail-open'
import LucideMessageSquareText from '~icons/lucide/message-square-text'

const route = useRoute()
const sessionUser = useSessionUser()

const isAdmin = computed(() => sessionUser.role === 'Gameplan Admin')

const spacesList = computed(() => communitySpaces.list)

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

function isActiveSpace(spaceId: string) {
  const routeName = route.name?.toString() || ''
  return route.params.spaceId?.toString() === spaceId && routeName.startsWith('Space')
}

function openNewSpaceDialog() {
  showNewSpaceDialog.value = true
}

function spaceOptions(space: Space) {
  return [
    {
      label: 'Mark all as read',
      icon: 'lucide-check',
      onClick: () => markAllAsRead([space.name], space.title),
    },
  ]
}
</script>
