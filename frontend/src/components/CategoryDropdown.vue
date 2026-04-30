<template>
  <Dropdown v-if="activeCategory.team" :options="dropdownItems" placement="left">
    <template v-slot="{ open }">
      <Button :variant="open ? 'subtle' : 'ghost'" icon-right="lucide-chevron-down" size="md">
        <template v-if="showIconInSidebar" #prefix>
          <span class="text-base leading-none">
            {{ activeCategory.team.icon || activeCategory.team.title?.[0] }}
          </span>
        </template>
        <span class="font-medium">
          {{ activeCategory.team.title }}
        </span>
      </Button>
    </template>
  </Dropdown>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { Button, Dropdown } from 'frappe-ui'
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
