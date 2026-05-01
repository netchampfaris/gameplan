<template>
  <Dropdown :options="dropdownItems">
    <template v-slot="{ open }">
      <slot name="trigger" :open="open"></slot>
    </template>
  </Dropdown>
  <AboutDialog v-model="showAboutDialog" />
</template>
<script setup>
import { h, computed, ref, markRaw } from 'vue'
import { Dropdown } from 'frappe-ui'
import { showSettingsDialog } from '@/components/Settings'
import AboutDialog from './AboutDialog.vue'
import AppSelector from './AppSelector.vue'
import { useUser } from '@/data/users'
import { session } from '@/data/session'
import { clear as clearIndexDb } from 'idb-keyval'
import { useTheme } from '@/utils/useTheme'
import { shellIconStyle, toggleShellIconStyle } from '@/data/shellPreferences'

const user = useUser()
const showAboutDialog = ref(false)
const { setTheme } = useTheme()

const dropdownItems = computed(() => [
  {
    icon: 'lucide-user',
    label: 'My Profile',
    route: {
      name: 'PersonProfile',
      params: { personId: user.user_profile },
    },
  },
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
    label: 'Settings & Members',
    onClick: () => showSettingsDialog(),
    condition: () => user.isNotGuest,
  },
  {
    icon: 'lucide-moon',
    label: 'Toggle theme',
    submenu: [
      {
        label: 'Light Mode',
        icon: 'lucide-sun',
        onClick: () => setTheme('light'),
      },
      {
        label: 'Dark Mode',
        icon: 'lucide-moon',
        onClick: () => setTheme('dark'),
      },
      {
        label: 'System Default',
        icon: 'lucide-monitor',
        onClick: () => setTheme('system'),
      },
    ],
  },
  {
    icon: 'lucide-layout-panel-left',
    label:
      shellIconStyle.value === 'logo' ? 'Use category icon at top' : 'Use Gameplan logo at top',
    onClick: toggleShellIconStyle,
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
  {
    icon: () => h('span', { class: 'lucide-credit-card' }),
    label: 'Subscription',
    condition: () => user.isNotGuest && window.frappecloud_host && window.site_name,
    onClick: () => {
      window.open(`${window.frappecloud_host}/dashboard/subscription/${window.site_name}`, '_blank')
    },
  },
  {
    icon: 'lucide-log-out',
    label: 'Log out',
    onClick: () => session.logout.submit(),
  },
])

function clearCache() {
  localStorage.clear()
  sessionStorage.clear()
  clearIndexDb().then(() => {
    console.log('Cache cleared')
    window.location.reload()
  })
}
</script>
