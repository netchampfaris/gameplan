<template>
  <Dropdown :options="dropdownItems">
    <template v-slot="{ open }">
      <button
        v-if="activeCategory.team"
        class="flex w-full items-center rounded-md px-2 py-1 text-left"
        :class="open ? 'bg-surface-selected shadow-sm' : 'hover:bg-surface-gray-3'"
      >
        <span class="mr-2">{{ activeCategory.team.icon }}</span>
        <div class="text-base font-medium text-ink-gray-8 leading-none">
          {{ activeCategory.team.title }}
        </div>
        <span class="lucide-chevron-down ml-auto hidden h-4 w-4 sm:inline text-ink-gray-7" />
      </button>
    </template>
  </Dropdown>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { Dropdown } from 'frappe-ui'
import { activeCategory } from '@/data/activeCategory'

const dropdownItems = computed(() => [
  {
    label: 'Settings',
    icon: 'lucide-settings',
  },
])
</script>
