<template>
  <SettingsPanel title="Profile" description="How you appear across discussions, tasks, and pages.">
    <SettingsSection title="Identity">
      <div class="space-y-3">
        <FormControl label="Display name" v-model="displayName" />
        <FormControl label="Bio" type="textarea" v-model="bio" />
      </div>
    </SettingsSection>

    <SettingsSection title="Availability">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow title="Status">
          <Select class="w-44" :options="statusOptions" v-model="status" />
        </SettingsRow>
        <SettingsRow title="Working hours" description="Used for quiet-hour suggestions.">
          <Select class="w-44" :options="workingHourOptions" v-model="workingHours" />
        </SettingsRow>
      </div>
    </SettingsSection>

    <SettingsSection title="Start page">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow title="Open Gameplan to">
          <Select class="w-52" :options="startPageOptions" v-model="startPage" />
        </SettingsRow>
        <SettingsRow title="Default Community">
          <Select class="w-52" :options="communityOptions" v-model="defaultCommunity" />
        </SettingsRow>
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

const displayName = ref('Faris Ansari')
const bio = ref('Building calmer async workflows.')
const status = ref('available')
const workingHours = ref('10-6')
const startPage = ref('unread')
const defaultCommunity = ref('current')

const statusOptions = [
  { label: 'Available', value: 'available' },
  { label: 'Focus mode', value: 'focus' },
  { label: 'Away', value: 'away' },
  { label: 'Invisible', value: 'invisible' },
]

const workingHourOptions = [
  { label: '10 AM - 6 PM', value: '10-6' },
  { label: '9 AM - 5 PM', value: '9-5' },
  { label: 'Custom', value: 'custom' },
]

const startPageOptions = [
  { label: 'Unread discussions', value: 'unread' },
  { label: 'All discussions', value: 'all' },
  { label: 'My tasks', value: 'tasks' },
  { label: 'Last opened Space', value: 'last-space' },
]

const communityOptions = [
  { label: 'Last active Community', value: 'current' },
  { label: 'Internal', value: 'internal' },
  { label: 'Product', value: 'product' },
]
</script>
