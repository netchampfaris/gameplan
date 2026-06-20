<template>
  <SettingsPanel
    title="Community"
    description="Defaults and permissions shared across a Community."
  >
    <SettingsSection title="General">
      <div class="space-y-3">
        <FormControl label="Community name" v-model="communityName" />
        <FormControl label="Description" type="textarea" v-model="description" />
      </div>
    </SettingsSection>

    <SettingsSection title="Permissions">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow title="Members can create Spaces">
          <Switch size="sm" v-model="membersCanCreateSpaces" />
        </SettingsRow>
        <SettingsRow title="Members can upload custom emoji">
          <Switch size="sm" v-model="membersCanUploadEmoji" />
        </SettingsRow>
        <SettingsRow title="Default invite role">
          <Select class="w-44" :options="roleOptions" v-model="defaultRole" />
        </SettingsRow>
      </div>
    </SettingsSection>

    <SettingsSection title="Custom emoji">
      <div class="overflow-hidden rounded border border-outline-gray-1">
        <div
          v-for="emoji in customEmojis"
          :key="emoji.name"
          class="grid grid-cols-[40px_minmax(0,1fr)_160px] items-center gap-3 border-b border-outline-gray-1 px-3 py-2 last:border-b-0"
        >
          <div class="text-xl">{{ emoji.preview }}</div>
          <div class="min-w-0">
            <div class="text-base-medium text-ink-gray-8">:{{ emoji.name }}:</div>
            <div class="truncate text-p-sm text-ink-gray-5">{{ emoji.keywords }}</div>
          </div>
          <div class="text-right text-p-sm text-ink-gray-5">{{ emoji.owner }}</div>
        </div>
      </div>
      <Button class="mt-3" icon-left="lucide-upload">Upload emoji</Button>
    </SettingsSection>
  </SettingsPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Select, Switch } from 'frappe-ui'
import SettingsPanel from './SettingsPanel.vue'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'

const communityName = ref('Product')
const description = ref('Product planning, decisions, and launch notes.')
const membersCanCreateSpaces = ref(true)
const membersCanUploadEmoji = ref(false)
const defaultRole = ref('member')

const roleOptions = [
  { label: 'Member', value: 'member' },
  { label: 'Admin', value: 'admin' },
  { label: 'Guest', value: 'guest' },
]

const customEmojis = [
  { preview: '🚢', name: 'shipit', keywords: 'launch, ready, shipped', owner: 'Faris' },
  { preview: '🧱', name: 'blocked', keywords: 'stuck, dependency', owner: 'Anita' },
  { preview: '🔍', name: 'review', keywords: 'needs review, inspect', owner: 'Sofia' },
]
</script>
