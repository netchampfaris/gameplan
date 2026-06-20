import { ref, type Component } from 'vue'

type LucideIconString = `lucide-${string}`

interface Tab {
  label: string
  group?: string
  icon: Component | LucideIconString
  component: Component
}

// Global state for the settings dialog
export const show = ref(false)
export const activeTab = ref<Tab | null>(null)

// Available tabs - these will be imported by SettingsDialog.vue
export const tabs: Tab[] = []

export function showSettingsDialog(defaultTab: string | null = null) {
  show.value = true
  if (defaultTab && tabs.length > 0) {
    activeTab.value = tabs.find((tab) => tab.label === defaultTab) || null
  } else if (tabs.length > 0) {
    activeTab.value = tabs[0]
  }
}

// Function to register tabs (called by SettingsDialog.vue)
export function registerTabs(tabsArray: Tab[]) {
  tabs.splice(0, tabs.length, ...tabsArray)
}
