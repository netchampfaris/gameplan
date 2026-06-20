<template>
  <SettingsPanel title="Appearance" description="Personal display choices for the app shell.">
    <SettingsSection title="Theme">
      <div class="grid gap-3 sm:grid-cols-3">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          type="button"
          class="rounded border border-outline-gray-2 p-3 text-left transition hover:bg-surface-gray-1"
          :class="theme === option.value ? 'bg-surface-gray-2 ring-1 ring-outline-gray-4' : ''"
          @click="theme = option.value"
        >
          <div class="mb-3 h-20 rounded bg-surface-gray-2 p-2">
            <div class="h-full rounded border border-outline-gray-2 bg-surface-base" />
          </div>
          <div class="text-base-medium text-ink-gray-8">{{ option.label }}</div>
          <div class="mt-0.5 text-p-sm text-ink-gray-5">{{ option.description }}</div>
        </button>
      </div>
    </SettingsSection>

    <SettingsSection title="Layout">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow title="Density">
          <Select class="w-44" :options="densityOptions" v-model="density" />
        </SettingsRow>
        <SettingsRow title="Discussion width">
          <Select class="w-44" :options="widthOptions" v-model="discussionWidth" />
        </SettingsRow>
        <SettingsRow title="Show unread counts">
          <Switch size="sm" v-model="showUnreadCounts" />
        </SettingsRow>
        <SettingsRow title="Reduce motion">
          <Switch size="sm" v-model="reduceMotion" />
        </SettingsRow>
      </div>
    </SettingsSection>
  </SettingsPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Select, Switch } from 'frappe-ui'
import SettingsPanel from './SettingsPanel.vue'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'

type Theme = 'system' | 'light' | 'dark'

const theme = ref<Theme>('system')
const density = ref('comfortable')
const discussionWidth = ref('normal')
const showUnreadCounts = ref(true)
const reduceMotion = ref(false)

const themeOptions: Array<{ label: string; value: Theme; description: string }> = [
  { label: 'System', value: 'system', description: 'Match this device' },
  { label: 'Light', value: 'light', description: 'Bright workspace' },
  { label: 'Dark', value: 'dark', description: 'Low-light workspace' },
]

const densityOptions = [
  { label: 'Comfortable', value: 'comfortable' },
  { label: 'Compact', value: 'compact' },
]

const widthOptions = [
  { label: 'Normal', value: 'normal' },
  { label: 'Wide', value: 'wide' },
]
</script>
