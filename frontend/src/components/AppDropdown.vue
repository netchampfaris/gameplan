<template>
  <Dropdown :options="dropdownItems" match-target-width>
    <template #default="{ open }">
      <button
        type="button"
        class="flex w-full min-w-0 items-center justify-between rounded px-2 py-1 text-ink-gray-7 transition"
        :class="open ? 'bg-surface-elevation-3 shadow-sm' : 'hover:bg-surface-gray-2'"
      >
        <span class="truncate text-lg-medium">Gameplan</span>
        <div class="grid size-7 place-content-center">
          <span class="lucide-chevron-down size-4 shrink-0 text-ink-gray-5" />
        </div>
      </button>
    </template>
  </Dropdown>

  <AboutDialog v-model="showAboutDialog" />
</template>

<script setup lang="ts">
import { markRaw, ref } from 'vue'
import { Dropdown } from 'frappe-ui'
import { clear as clearIndexDb } from 'idb-keyval'
import { showSettingsDialog } from '@/components/Settings'
import AboutDialog from './AboutDialog.vue'
import AppSelector from './AppSelector.vue'

const showAboutDialog = ref(false)

const dropdownItems = [
  {
    icon: 'lucide-layout-grid',
    label: 'Apps',
    submenu: [
      {
        component: markRaw(AppSelector),
      },
    ],
  },
  {
    icon: 'lucide-settings',
    label: 'Settings',
    onClick: () => showSettingsDialog(),
  },
  {
    icon: 'lucide-list-restart',
    label: 'Clear cache',
    onClick: clearCache,
  },
  {
    icon: 'lucide-info',
    label: 'About',
    onClick: () => {
      showAboutDialog.value = true
    },
  },
]

function clearCache() {
  localStorage.clear()
  sessionStorage.clear()
  clearIndexDb().then(() => {
    console.log('Cache cleared')
    window.location.reload()
  })
}
</script>
