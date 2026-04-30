<template>
  <div class="flex h-full flex-col">
    <div class="px-4 pt-6 pb-2 text-2xl font-semibold text-ink-gray-9">More</div>

    <nav class="flex-1 px-2">
      <button
        v-for="item in items"
        :key="item.label"
        type="button"
        class="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-base text-ink-gray-8 transition active:bg-surface-gray-2"
        @click="onItemClick(item)"
      >
        <span :class="[item.icon, 'size-5 text-ink-gray-6']" />
        <span class="flex-1">{{ item.label }}</span>
        <LucideChevronRight class="size-4 text-ink-gray-4" />
      </button>
    </nav>

    <div class="border-t border-outline-gray-2 px-2 py-2">
      <UserDropdown>
        <template #trigger="{ open }">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition"
            :class="open ? 'bg-surface-gray-2' : 'active:bg-surface-gray-2'"
          >
            <UserAvatar v-if="sessionUser.name" :user="sessionUser.name" size="lg" class="size-9" />
            <span class="flex flex-col">
              <span class="text-base font-medium text-ink-gray-9">{{ sessionUser.full_name }}</span>
              <span class="text-xs text-ink-gray-5">Account &amp; settings</span>
            </span>
            <LucideChevronUp class="ml-auto size-4 text-ink-gray-4" />
          </button>
        </template>
      </UserDropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { useSessionUser } from '@/data/users'
import UserAvatar from './UserAvatar.vue'
import UserDropdown from './UserDropdown.vue'
import LucideChevronRight from '~icons/lucide/chevron-right'
import LucideChevronUp from '~icons/lucide/chevron-up'

interface MoreItem {
  label: string
  icon: string
  route: RouteLocationRaw
}

const router = useRouter()
const sessionUser = useSessionUser()

const isAdmin = computed(() => sessionUser.role === 'Gameplan Admin')

const items = computed<MoreItem[]>(() => {
  const list: MoreItem[] = [
    { label: 'Bookmarks', icon: 'lucide-bookmark', route: { name: 'Bookmarks' } },
    { label: 'People', icon: 'lucide-users-2', route: { name: 'People' } },
    { label: 'Pages', icon: 'lucide-files', route: { name: 'MyPages' } },
    { label: 'Tasks', icon: 'lucide-list-todo', route: { name: 'MyTasks' } },
    { label: 'Drafts', icon: 'lucide-pencil-line', route: { name: 'Drafts' } },
  ]

  if (isAdmin.value) {
    list.push({ label: 'Spaces', icon: 'lucide-layout-grid', route: { name: 'Spaces' } })
  }

  return list
})

function onItemClick(item: MoreItem) {
  router.push(item.route)
}
</script>
