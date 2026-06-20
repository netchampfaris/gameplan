<template>
  <SettingsPanel title="Reactions" description="Customize quick reactions and team emoji signals.">
    <SettingsSection title="Quick reactions">
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="(emoji, index) in quickReactions"
          :key="index"
          variant="subtle"
          class="!h-10 !min-w-10 !text-lg"
          @click="cycleReaction(index)"
        >
          {{ emoji }}
        </Button>
      </div>
      <p class="mt-2 text-p-sm text-ink-gray-5">Click a reaction to cycle through mock choices.</p>
    </SettingsSection>

    <SettingsSection title="Behavior">
      <div class="space-y-1 divide-y divide-outline-gray-1">
        <SettingsRow title="One-click reaction">
          <Select class="w-44" :options="oneClickOptions" v-model="oneClickReaction" />
        </SettingsRow>
        <SettingsRow title="Show names on hover">
          <Switch size="sm" v-model="showNames" />
        </SettingsRow>
        <SettingsRow title="Use custom emoji in quick reactions">
          <Switch size="sm" v-model="allowCustomQuickReactions" />
        </SettingsRow>
      </div>
    </SettingsSection>

    <SettingsSection title="Workflow reactions">
      <div class="space-y-2">
        <div
          v-for="reaction in workflowReactions"
          :key="reaction.label"
          class="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded px-2 py-1.5 hover:bg-surface-gray-1"
        >
          <div class="text-xl">{{ reaction.emoji }}</div>
          <div class="min-w-0">
            <div class="text-base-medium text-ink-gray-8">{{ reaction.label }}</div>
            <div class="text-p-sm text-ink-gray-5">{{ reaction.meaning }}</div>
          </div>
          <Switch size="sm" v-model="reaction.enabled" />
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

const reactionChoices = ['👍', '✅', '👀', '🎉', '🙌', '🚧', '🧠', '📌']
const quickReactions = ref(['👍', '✅', '👀', '🎉'])
const oneClickReaction = ref('picker')
const showNames = ref(true)
const allowCustomQuickReactions = ref(true)

const workflowReactions = reactive([
  { emoji: '👀', label: 'Seen', meaning: 'Read and acknowledged', enabled: true },
  { emoji: '✅', label: 'Agreed', meaning: 'Decision or next step is clear', enabled: true },
  { emoji: '🚧', label: 'Blocked', meaning: 'Needs help before it can move', enabled: true },
  { emoji: '🧠', label: 'Needs thought', meaning: 'Hold for deeper async review', enabled: true },
])

const oneClickOptions = [
  { label: 'Open picker', value: 'picker' },
  { label: 'Use first quick reaction', value: 'first' },
]

function cycleReaction(index: number) {
  const current = quickReactions.value[index]
  const nextIndex = (reactionChoices.indexOf(current) + 1) % reactionChoices.length
  quickReactions.value[index] = reactionChoices[nextIndex]
}
</script>
