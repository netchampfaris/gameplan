<template>
  <SettingsPanel
    title="Spaces"
    description="Mock Space defaults for access, notifications, and content."
  >
    <SettingsSection title="Defaults">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow title="New Space access">
          <Select class="w-44" :options="accessOptions" v-model="defaultAccess" />
        </SettingsRow>
        <SettingsRow title="Default notification level">
          <Select class="w-44" :options="notificationOptions" v-model="defaultNotification" />
        </SettingsRow>
        <SettingsRow title="Default discussion sort">
          <Select class="w-44" :options="sortOptions" v-model="defaultSort" />
        </SettingsRow>
      </div>
    </SettingsSection>

    <SettingsSection title="Per-Space quick reactions">
      <div class="space-y-2">
        <div
          v-for="space in spaces"
          :key="space.name"
          class="flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-surface-gray-1"
        >
          <div class="min-w-0">
            <div class="truncate text-base-medium text-ink-gray-8">{{ space.title }}</div>
            <div class="text-p-sm text-ink-gray-5">{{ space.reactions.join(' ') }}</div>
          </div>
          <Button variant="ghost" icon="lucide-settings" :label="`${space.title} reactions`" />
        </div>
      </div>
    </SettingsSection>
  </SettingsPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Select } from 'frappe-ui'
import SettingsPanel from './SettingsPanel.vue'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'

const defaultAccess = ref('public')
const defaultNotification = ref('normal')
const defaultSort = ref('last_post_at desc')

const accessOptions = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
]

const notificationOptions = [
  { label: 'Normal', value: 'normal' },
  { label: 'Follow', value: 'follow' },
  { label: 'Mute', value: 'mute' },
]

const sortOptions = [
  { label: 'Newest activity', value: 'last_post_at desc' },
  { label: 'Created date', value: 'creation desc' },
]

const spaces = [
  { name: 'roadmap', title: 'Roadmap', reactions: ['👀', '✅', '🚧', '📌'] },
  { name: 'design', title: 'Design Reviews', reactions: ['👀', '🧠', '✅', '🙌'] },
  { name: 'support', title: 'Customer Support', reactions: ['👀', '🚧', '🙋', '✅'] },
]
</script>
