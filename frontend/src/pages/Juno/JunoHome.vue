<template>
  <div class="min-h-screen">
    <!-- Header with PageHeader -->
    <PageHeader>
      <Breadcrumbs class="h-7" :items="[{ label: 'Juno', route: { name: 'JunoHome' } }]" />
      <div class="flex items-center gap-3">
        <!-- Connection Status -->
        <div v-if="connectionTestCall.data" class="flex items-center gap-2">
          <div
            :class="[
              'h-2 w-2 rounded-full',
              connectionTestCall.data?.success ? 'bg-ink-gray-7' : 'bg-ink-gray-4',
            ]"
          ></div>
          <span class="text-xs text-ink-gray-5">
            {{ connectionTestCall.data?.success ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
        <!-- Model Selector -->
        <Select
          v-if="availableModels.data?.length"
          v-model="selectedModel"
          :options="availableModels.data"
          placeholder="Select model..."
          size="sm"
          variant="outline"
          class="min-w-[150px]"
        />
      </div>
    </PageHeader>

    <!-- Main Content -->
    <div class="px-6 py-8">
      <div class="mx-auto max-w-4xl">
        <!-- Greeting -->
        <div class="mb-4">
          <h1 class="text-xl font-medium text-ink-gray-8 mb-2">
            Good {{ getGreeting() }}, {{ getUserName() }}
          </h1>
        </div>

        <!-- Main Search -->
        <div class="mb-12">
          <div class="relative">
            <div
              class="rounded-lg border bg-surface-white overflow-hidden focus-within:border-outline-gray-3"
            >
              <textarea
                ref="messageInput"
                v-model="newMessage"
                placeholder="Ask Juno anything..."
                :rows="1"
                class="w-full resize-none border-0 p-4 text-base focus:ring-0"
                @keydown.enter.prevent="handleEnterKey"
                @input="adjustTextareaHeight"
              />
              <div class="flex justify-end px-4 pb-4">
                <Button
                  @click="sendMessage"
                  appearance="primary"
                  size="sm"
                  :disabled="!newMessage.trim() || isLoading || !connectionTestCall.data?.success"
                  :loading="isLoading"
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- Recently Visited -->
        <div class="mb-12">
          <div class="flex items-center gap-2 mb-6">
            <LucideClock class="h-4 w-4 text-ink-gray-4" />
            <h2 class="text-sm font-medium text-ink-gray-6">Recently visited</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="item in recentItems"
              :key="item.id"
              @click="connectionTestCall.data?.success ? sendQuickAction(item.message) : null"
              :class="[
                'rounded-lg border border-outline-gray-2 bg-surface-white p-3 transition-all',
                connectionTestCall.data?.success
                  ? 'cursor-pointer hover:border-outline-gray-3'
                  : 'cursor-not-allowed opacity-50',
              ]"
            >
              <div class="flex items-center gap-3 mb-2">
                <div
                  :class="[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white bg-surface-gray-2',
                  ]"
                >
                  <component :is="item.icon" class="h-4 w-4 text-ink-gray-6" />
                </div>
                <div class="flex-1 min-w-0"></div>
              </div>
              <h3 class="text-sm mt-4 font-medium text-ink-gray-9 truncate">{{ item.title }}</h3>
              <p class="text-p-xs mt-2 text-ink-gray-5">{{ item.description }}</p>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="mb-12">
          <div class="flex items-center gap-2 mb-6">
            <LucideZap class="h-4 w-4 text-ink-gray-4" />
            <h2 class="text-sm font-medium text-ink-gray-6">Get started</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="action in quickActions.slice(0, 6)"
              :key="action.id"
              @click="connectionTestCall.data?.success ? sendQuickAction(action.message) : null"
              :class="[
                'rounded-lg border border-outline-gray-2 bg-surface-white p-4 transition-all',
                connectionTestCall.data?.success
                  ? 'cursor-pointer hover:border-outline-gray-3 hover:shadow-sm'
                  : 'cursor-not-allowed opacity-50',
              ]"
            >
              <p class="text-sm text-ink-gray-7">{{ action.message }}</p>
            </div>
          </div>
        </div>

        <!-- MCP Tools Section -->
        <div v-if="mcpTools.data?.tools?.length">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-2">
              <div class="h-4 w-4 text-ink-gray-6">🔧</div>
              <h2 class="text-sm font-medium text-ink-gray-6">Available MCP Tools</h2>
              <span
                class="inline-flex items-center rounded-full bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-7"
              >
                {{ mcpTools.data.tools.length }} tools
              </span>
            </div>
            <Button @click="$router.push({ name: 'MCPServers' })" appearance="outline" size="sm">
              View All Tools
            </Button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            <div
              v-for="tool in mcpTools.data.tools.slice(0, 6)"
              :key="`${tool.server}.${tool.name}`"
              class="rounded-lg border border-outline-gray-2 bg-surface-white p-4 hover:shadow-sm transition-shadow"
            >
              <div class="flex items-start gap-3">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-gray-2 text-sm"
                >
                  🔧
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1 mb-1">
                    <span class="text-xs font-medium text-ink-gray-6">{{ tool.server }}</span>
                    <span class="text-xs text-ink-gray-5">.</span>
                    <span class="text-sm font-medium text-ink-gray-8">{{ tool.name }}</span>
                  </div>
                  <p class="text-xs text-ink-gray-6 line-clamp-2">
                    {{ tool.description || 'No description available' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, useTemplateRef, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePageMeta, Button, Breadcrumbs, useCall } from 'frappe-ui'
import { Select } from 'frappe-ui'
import { useLocalStorage } from '@vueuse/core'
import PageHeader from '@/components/PageHeader.vue'
import { useSessionUser } from '@/data/users'

import LucideClock from '~icons/lucide/clock'
import LucideZap from '~icons/lucide/zap'
import LucideCheckCircle from '~icons/lucide/check-circle'
import LucideFileText from '~icons/lucide/file-text'
import LucideUsers from '~icons/lucide/users'
import LucideBarChart from '~icons/lucide/bar-chart'
import LucideCalendar from '~icons/lucide/calendar'

interface ConnectionStatus {
  success: boolean
  connected: boolean
  base_url?: string
  configured_model?: string
  model_available?: boolean
  available_models?: string[]
  error?: string
}

interface QuickAction {
  id: string
  message: string
}

usePageMeta(() => ({
  title: 'Juno',
}))

const router = useRouter()
const newMessage = ref('')
const isLoading = ref(false)
const testingConnection = ref(false)
const connectionStatus = ref<ConnectionStatus | null>(null)
const messageInput = useTemplateRef<HTMLTextAreaElement>('messageInput')

// Model selection state with localStorage
const selectedModel = useLocalStorage<string>('juno-selected-model', '')

// Recently visited items
const recentItems = ref([
  {
    id: '1',
    title: 'Tasks Tracker',
    description: 'Your personal task management',
    icon: LucideCheckCircle,
    bgColor: 'bg-green-500',
    message: 'Show me my tasks for today',
  },
  {
    id: '2',
    title: 'Calendar',
    description: 'Your personal calendar',
    icon: LucideCalendar,
    bgColor: 'bg-blue-500',
    message: 'Show me my calendar for today',
  },
  {
    id: '3',
    title: 'Team Updates',
    description: 'Recent team activities',
    icon: LucideUsers,
    bgColor: 'bg-purple-500',
    message: 'Show me recent team updates',
  },
  {
    id: '4',
    title: 'Documentation',
    description: 'Project documentation',
    icon: LucideFileText,
    bgColor: 'bg-orange-500',
    message: 'Help me find project documentation',
  },
])

// Quick actions for onboarding
const quickActions = ref<QuickAction[]>([
  {
    id: '1',
    message: 'Show me my schedule and tasks for today',
  },
  {
    id: '2',
    message: 'Give me an overview of all my active projects and their current status',
  },
  {
    id: '3',
    message: 'Show me all my overdue tasks and help me prioritize them',
  },
  {
    id: '4',
    message: 'Show me the current workload distribution across my team members',
  },
  {
    id: '5',
    message: 'What are my main goals and objectives for this week?',
  },
  {
    id: '6',
    message: 'Show me recent activity and updates from my projects',
  },
])

// Use useCall for connection testing
const connectionTestCall = useCall<ConnectionStatus>({
  url: '/api/v2/method/gameplan.ai.juno.test_ollama_connection',
  immediate: false,
})

// Use useCall for getting MCP tools
const mcpTools = useCall<{ tools: any[] }>({
  url: '/api/v2/method/gameplan.ai.juno.get_mcp_tools',
  immediate: true,
})

// Use useCall for getting available models
const availableModels = useCall<string[]>({
  url: '/api/v2/method/gameplan.ai.juno.get_available_models',
  onSuccess(data: string[]) {
    // Only set a default if no model is currently selected
    if (!selectedModel.value && data.length > 0) {
      // Prefer deepseek model if available
      for (let model of data) {
        if (model.includes('deepseek')) {
          selectedModel.value = model
          break
        }
      }
      // Fall back to first model if deepseek not found
      if (!selectedModel.value) {
        selectedModel.value = data[0]
      }
    }
  },
})

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

const getUserName = () => {
  const user = useSessionUser()
  return user.full_name || 'there'
}

const sendQuickAction = (message: string) => {
  newMessage.value = message
  sendMessage()
}

const adjustTextareaHeight = () => {
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.style.height = 'auto'
      messageInput.value.style.height = messageInput.value.scrollHeight + 'px'
    }
  })
}

const handleEnterKey = (event: KeyboardEvent) => {
  if (event.shiftKey) return
  event.preventDefault()
  sendMessage()
}

const sendMessage = async () => {
  const message = newMessage.value.trim()
  if (!message || isLoading.value || !connectionTestCall.data?.success) return

  // Navigate to chat with the message
  router.push({
    name: 'JunoChat',
    query: { message: message },
  })
}

// Test Ollama connection
const testConnection = async () => {
  testingConnection.value = true

  try {
    await connectionTestCall.submit()
    connectionStatus.value = connectionTestCall.data || null
  } catch (error) {
    console.error('Connection test failed:', error)
    connectionStatus.value = {
      success: false,
      connected: false,
      error: 'Failed to test connection',
    }
  } finally {
    testingConnection.value = false
  }
}

// Test connection on component mount
onMounted(() => {
  testConnection()
})
</script>
