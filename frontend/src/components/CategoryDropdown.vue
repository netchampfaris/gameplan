<template>
  <Dropdown v-if="activeCategory.team" :options="dropdownItems" placement="left">
    <template v-slot="{ open }">
      <button
        class="flex items-center gap-2 rounded px-2 py-1 transition-colors"
        :class="open ? 'bg-surface-gray-3' : 'hover:bg-surface-gray-2'"
      >
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

const sessionUser = useSessionUser()

const dropdownItems = computed(() => {
  const isAdmin = sessionUser.role === 'Gameplan Admin'

  return [
    {
      icon: 'lucide-settings',
      label: 'Community settings',
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
      label: 'Leave community',
      onClick: () => {},
    },
  ].filter((item) => (item.condition ? item.condition() : true))
})
</script>
