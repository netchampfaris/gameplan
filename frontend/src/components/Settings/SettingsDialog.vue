<template>
  <Dialog v-model:open="show" size="4xl" bare>
    <div class="flex overflow-hidden" :style="{ height: 'calc(100vh - 5rem)' }">
      <div
        class="flex w-56 shrink-0 flex-col border-r border-outline-gray-1 bg-surface-sidebar p-3"
      >
        <Dialog.Title as-child>
          <h1 class="px-2 pt-1 text-xl-semibold text-ink-gray-9">Settings</h1>
        </Dialog.Title>
        <div class="mt-5 min-h-0 overflow-y-auto">
          <div v-for="group in groupedTabs" :key="group.title" class="mb-5 last:mb-0">
            <div class="mb-1.5 flex items-center gap-1.5 px-2 text-p-sm text-ink-gray-5">
              <span :class="[group.icon, 'size-3.5']" />
              <span>{{ group.title }}</span>
            </div>
            <nav class="space-y-0.5">
              <button
                class="flex h-8 w-full items-center gap-2 rounded px-2 text-left transition"
                :class="
                  activeTab?.label === tab.label
                    ? 'bg-surface-base text-ink-gray-8 shadow-sm'
                    : 'text-ink-gray-6 hover:bg-surface-gray-2'
                "
                v-for="tab in group.tabs"
                :key="tab.label"
                @click="activeTab = tab"
              >
                <span :class="[tab.icon, 'size-4 shrink-0 text-ink-gray-5']" />
                <span class="truncate text-base">
                  {{ tab.label }}
                </span>
              </button>
            </nav>
          </div>
        </div>
      </div>
      <div class="flex min-w-0 flex-1 flex-col bg-surface-base px-6 pt-7 sm:px-8">
        <component v-if="activeTab" :is="activeTab.component" @close-dialog="show = false" />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, type Component } from 'vue'
import { Dialog } from 'frappe-ui'
import { show, activeTab, registerTabs } from './index'
import Members from './Members.vue'
import InvitePeople from './InvitePeople.vue'
import SettingsTabDialog from './SettingsTab.vue'
import ProfileSettings from './ProfileSettings.vue'
import AppearanceSettings from './AppearanceSettings.vue'
import PreferenceSettings from './PreferenceSettings.vue'
import NotificationSettings from './NotificationSettings.vue'
import ReactionSettings from './ReactionSettings.vue'
import CommunitySettings from './CommunitySettings.vue'
import SpaceSettings from './SpaceSettings.vue'

type LucideIconString = `lucide-${string}`

interface Tab {
  label: string
  group: string
  icon: Component | LucideIconString
  component: Component
}

const tabs: Tab[] = [
  {
    label: 'Profile',
    group: 'My Settings',
    icon: 'lucide-circle-user-round',
    component: markRaw(ProfileSettings),
  },
  {
    label: 'Appearance',
    group: 'My Settings',
    icon: 'lucide-paintbrush',
    component: markRaw(AppearanceSettings),
  },
  {
    label: 'Preferences',
    group: 'My Settings',
    icon: 'lucide-sliders-horizontal',
    component: markRaw(PreferenceSettings),
  },
  {
    label: 'Notifications',
    group: 'My Settings',
    icon: 'lucide-bell',
    component: markRaw(NotificationSettings),
  },
  {
    label: 'Reactions',
    group: 'My Settings',
    icon: 'lucide-smile-plus',
    component: markRaw(ReactionSettings),
  },
  {
    label: 'Account',
    group: 'My Settings',
    icon: 'lucide-key-round',
    component: markRaw(SettingsTabDialog),
  },
  {
    label: 'General',
    group: 'Community',
    icon: 'lucide-settings',
    component: markRaw(CommunitySettings),
  },
  {
    label: 'Members',
    group: 'Community',
    icon: 'lucide-users',
    component: markRaw(Members),
  },
  {
    label: 'Invites',
    group: 'Community',
    icon: 'lucide-user-plus',
    component: markRaw(InvitePeople),
  },
  {
    label: 'Spaces',
    group: 'Spaces',
    icon: 'lucide-layout-list',
    component: markRaw(SpaceSettings),
  },
]

const groupIcons: Record<string, LucideIconString> = {
  'My Settings': 'lucide-circle-user-round',
  Community: 'lucide-building-2',
  Spaces: 'lucide-hash',
}

const groupedTabs = computed(() => {
  const groups = tabs.reduce(
    (acc, tab) => {
      acc[tab.group] = acc[tab.group] || []
      acc[tab.group].push(tab)
      return acc
    },
    {} as Record<string, Tab[]>,
  )

  return Object.entries(groups).map(([title, grouped]) => ({
    title,
    icon: groupIcons[title] || 'lucide-settings',
    tabs: grouped,
  }))
})

onMounted(() => {
  registerTabs(tabs)
  if (!activeTab.value) {
    activeTab.value = tabs[0]
  }
})
</script>
