<template>
  <SettingsPanel title="Notifications" description="Control what interrupts you and what waits.">
    <SettingsSection title="Notify me for">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow
          v-for="item in notificationTypes"
          :key="item.key"
          :title="item.title"
          :description="item.description"
        >
          <Switch size="sm" v-model="item.enabled" />
        </SettingsRow>
      </div>
    </SettingsSection>

    <SettingsSection title="Delivery">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow title="Digest">
          <Select class="w-44" :options="digestOptions" v-model="digest" />
        </SettingsRow>
        <SettingsRow title="Quiet hours">
          <Select class="w-44" :options="quietHourOptions" v-model="quietHours" />
        </SettingsRow>
      </div>
    </SettingsSection>

    <SettingsSection title="Spaces">
      <div class="space-y-2">
        <div
          v-for="space in spaces"
          :key="space.name"
          class="flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-surface-gray-1"
        >
          <div class="min-w-0">
            <div class="truncate text-base-medium text-ink-gray-8">{{ space.title }}</div>
            <div class="text-p-sm text-ink-gray-5">{{ space.community }}</div>
          </div>
          <Select class="w-32" :options="spaceLevelOptions" v-model="space.level" />
        </div>
      </div>
    </SettingsSection>
  </SettingsPanel>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Select, Switch } from 'frappe-ui'
import SettingsPanel from './SettingsPanel.vue'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'

const digest = ref('daily')
const quietHours = ref('evening')

const notificationTypes = reactive([
  {
    key: 'mentions',
    title: 'Mentions',
    description: 'Direct @mentions and rich quote references.',
    enabled: true,
  },
  {
    key: 'replies',
    title: 'Replies',
    description: 'New comments on discussions I started or joined.',
    enabled: true,
  },
  {
    key: 'tasks',
    title: 'Tasks',
    description: 'Assignments, due dates, and task comments.',
    enabled: true,
  },
  {
    key: 'reactions',
    title: 'Reactions',
    description: 'Reactions on my discussions and comments.',
    enabled: false,
  },
])

const spaces = reactive([
  { name: 'roadmap', title: 'Roadmap', community: 'Product', level: 'follow' },
  { name: 'support', title: 'Customer Support', community: 'Internal', level: 'normal' },
  { name: 'random', title: 'Random', community: 'Internal', level: 'mute' },
])

const digestOptions = [
  { label: 'Off', value: 'off' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
]

const quietHourOptions = [
  { label: 'Off', value: 'off' },
  { label: '6 PM - 9 AM', value: 'evening' },
  { label: 'Custom', value: 'custom' },
]

const spaceLevelOptions = [
  { label: 'Follow', value: 'follow' },
  { label: 'Normal', value: 'normal' },
  { label: 'Mute', value: 'mute' },
]
</script>
