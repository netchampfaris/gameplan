<template>
  <Dropdown v-if="activeCategory.team" :options="dropdownItems" placement="left">
    <template v-slot="{ open }">
      <button
        class="flex items-center gap-2 rounded px-2 py-1 transition-colors"
        :class="open ? 'bg-surface-gray-3' : 'hover:bg-surface-gray-2'"
      >
        <template v-if="showIconInSidebar">
          <img
            v-if="activeCategory.team.image"
            :src="activeCategory.team.image"
            :alt="activeCategory.team.title"
            class="size-7 shrink-0 rounded object-cover"
          />
          <span v-else class="text-base leading-none">
            {{ activeCategory.team.icon || activeCategory.team.title?.[0] }}
          </span>
        </template>
        <span class="font-medium">
          {{ activeCategory.team.title }}
        </span>
        <span class="lucide-chevron-down size-4 text-ink-gray-5"></span>
      </button>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dropdown } from 'frappe-ui'
import { activeCategory } from '@/data/activeCategory'
import { useSessionUser } from '@/data/users'
import { shellIconStyle } from '@/data/shellPreferences'

const sessionUser = useSessionUser()

const showIconInSidebar = computed(() => shellIconStyle.value === 'logo')

const dropdownItems = computed(() => {
  const isAdmin = sessionUser.role === 'Gameplan Admin'

  return [
    {
      icon: 'lucide-settings',
      label: 'Category settings',
      condition: () => isAdmin,
      onClick: () => {},
    },
    {
      icon: 'lucide-users',
      label: 'Members',
      onClick: () => {},
    },
    {
      icon: 'lucide-user-plus',
      label: 'Invite people',
      condition: () => isAdmin,
      onClick: () => {},
    },
    {
      icon: 'lucide-log-out',
      label: 'Leave category',
      onClick: () => {},
    },
  ].filter((item) => (item.condition ? item.condition() : true))
})
</script>
