<template>
  <SettingsPanel title="Preferences" description="Defaults for writing and browsing.">
    <SettingsSection title="Discussions">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow title="Default feed">
          <Select class="w-52" :options="feedOptions" v-model="defaultFeed" />
        </SettingsRow>
        <SettingsRow title="Default sort">
          <Select class="w-52" :options="sortOptions" v-model="discussionSort" />
        </SettingsRow>
        <SettingsRow title="Open at first unread">
          <Switch size="sm" v-model="openAtUnread" />
        </SettingsRow>
        <SettingsRow title="Auto-follow discussions I comment on">
          <Switch size="sm" v-model="autoFollow" />
        </SettingsRow>
      </div>
    </SettingsSection>

    <SettingsSection title="Editor">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow title="Enter key">
          <Select class="w-52" :options="enterOptions" v-model="enterKey" />
        </SettingsRow>
        <SettingsRow title="Auto-save drafts">
          <Switch size="sm" v-model="autoSaveDrafts" />
        </SettingsRow>
        <SettingsRow title="Paste formatting">
          <Select class="w-52" :options="pasteOptions" v-model="pasteMode" />
        </SettingsRow>
      </div>
    </SettingsSection>

    <SettingsSection title="Tasks and pages">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow title="Default task view">
          <Select class="w-52" :options="taskViewOptions" v-model="taskView" />
        </SettingsRow>
        <SettingsRow title="Default page sort">
          <Select class="w-52" :options="pageSortOptions" v-model="pageSort" />
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

const defaultFeed = ref('unread')
const discussionSort = ref('last_post_at desc')
const openAtUnread = ref(true)
const autoFollow = ref(true)
const enterKey = ref('new-line')
const autoSaveDrafts = ref(true)
const pasteMode = ref('preserve')
const taskView = ref('assigned')
const pageSort = ref('modified desc')

const feedOptions = [
  { label: 'Unread', value: 'unread' },
  { label: 'All discussions', value: 'recent' },
  { label: 'Participating', value: 'participating' },
]

const sortOptions = [
  { label: 'Newest activity', value: 'last_post_at desc' },
  { label: 'Oldest activity', value: 'last_post_at asc' },
  { label: 'Created date', value: 'creation desc' },
]

const enterOptions = [
  { label: 'New line', value: 'new-line' },
  { label: 'Send', value: 'send' },
]

const pasteOptions = [
  { label: 'Preserve formatting', value: 'preserve' },
  { label: 'Plain text', value: 'plain' },
]

const taskViewOptions = [
  { label: 'Assigned to me', value: 'assigned' },
  { label: 'All my tasks', value: 'all' },
  { label: 'Created by me', value: 'created' },
]

const pageSortOptions = [
  { label: 'Date updated', value: 'modified desc' },
  { label: 'Page title', value: 'title asc' },
  { label: 'Date created', value: 'creation desc' },
]
</script>
