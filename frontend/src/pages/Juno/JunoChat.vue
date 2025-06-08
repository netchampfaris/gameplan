<template>
  <div class="flex h-screen flex-col">
    <PageHeader>
      <div class="flex items-center gap-3">
        <Breadcrumbs
          class="h-7"
          :items="[{ label: 'Juno', route: { name: 'JunoHome' } }, { label: 'Chat' }]"
        />
      </div>
      <div class="flex items-center gap-3">
        <div v-if="connectionStatus" class="flex items-center gap-2">
          <div
            :class="[
              'h-2 w-2 rounded-full',
              connectionStatus.connected ? 'bg-green-500' : 'bg-red-500',
            ]"
          ></div>
          <span class="text-xs text-ink-gray-5">
            {{ connectionStatus.connected ? 'Connected' : 'Disconnected' }}
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

    <!-- Messages Container -->
    <div class="flex-1 overflow-y-auto">
      <div class="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <!-- Message List -->
        <div v-for="message in messages" :key="message.id" class="space-y-6">
          <!-- User Message -->
          <div v-if="message.type === 'user'" class="flex justify-end">
            <div class="max-w-[80%] rounded-lg bg-surface-gray-3 text-ink-gray-8 px-4 py-3">
              <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
            </div>
          </div>

          <!-- AI Message -->
          <div v-else class="flex gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-gray-2"
            >
              <LucideSparkles class="h-4 w-4 text-ink-gray-6" />
            </div>
            <div class="flex-1 max-w-[80%]">
              <div v-if="message.loading" class="flex items-center gap-2 text-ink-gray-5">
                <LoadingIndicator class="h-4 w-4" />
                <span class="text-sm">Thinking...</span>
              </div>
              <JunoResponse v-else :content="message.content" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Input -->
    <div class="border-t border-outline-gray-2 bg-surface-white px-6 py-4">
      <div class="mx-auto max-w-3xl">
        <div class="flex gap-3">
          <div class="flex-1">
            <div
              class="rounded-lg border border-outline-gray-2 bg-surface-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
            >
              <textarea
                ref="messageInput"
                v-model="newMessage"
                placeholder="Ask Juno anything..."
                :rows="1"
                class="w-full resize-none border-0 p-3 text-sm focus:ring-0"
                @keydown.enter.prevent="handleEnterKey"
                @input="adjustTextareaHeight"
              />
              <div class="flex justify-end px-3 pb-3">
                <Button
                  @click="sendMessage"
                  appearance="primary"
                  size="sm"
                  :disabled="!newMessage.trim() || isLoading"
                  :loading="isLoading"
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, useTemplateRef, onMounted, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePageMeta, Button, LoadingIndicator, useCall, Breadcrumbs } from 'frappe-ui'
import { Select } from 'frappe-ui'
import { useLocalStorage } from '@vueuse/core'
import PageHeader from '@/components/PageHeader.vue'
import JunoResponse from './JunoResponse.vue'

import LucideSparkles from '~icons/lucide/sparkles'
import LucideArrowLeft from '~icons/lucide/arrow-left'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  loading?: boolean
  timestamp: Date
}

interface ConnectionStatus {
  success: boolean
  connected: boolean
  base_url?: string
  configured_model?: string
  model_available?: boolean
  available_models?: string[]
  error?: string
}

usePageMeta(() => ({
  title: 'Juno - Chat',
}))

const router = useRouter()
const route = useRoute()
const messages = ref<Message[]>([])
const newMessage = ref('')
const isLoading = ref(false)
const testingConnection = ref(false)
const connectionStatus = ref<ConnectionStatus | null>(null)
const messageInput = useTemplateRef<HTMLTextAreaElement>('messageInput')

// Model selection state with localStorage
const selectedModel = useLocalStorage<string>('juno-selected-model', '')

// Use useCall for connection testing
const connectionTestCall = useCall<ConnectionStatus>({
  url: '/api/v2/method/gameplan.ai.juno.test_ollama_connection',
  immediate: false,
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

const generateMessageId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

const goToHome = () => {
  router.push({ name: 'JunoHome' })
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

const clearMessage = () => {
  newMessage.value = ''
  adjustTextareaHeight()
}

const sendMessage = async () => {
  const message = newMessage.value.trim()
  if (!message || isLoading.value) return

  // Add user message
  const userMessage: Message = {
    id: generateMessageId(),
    type: 'user',
    content: message,
    timestamp: new Date(),
  }
  messages.value.push(userMessage)

  // Clear input
  newMessage.value = ''
  adjustTextareaHeight()

  // Add loading assistant message
  const assistantMessage = reactive<Message>({
    id: generateMessageId(),
    type: 'assistant',
    content: '',
    loading: true,
    timestamp: new Date(),
  })
  messages.value.push(assistantMessage)

  isLoading.value = true

  try {
    await sendStreamingMessage(message, assistantMessage)
  } catch (error) {
    console.error('Error sending message:', error)
    assistantMessage.content =
      'Sorry, I encountered an error while processing your request. Please try again.'
    assistantMessage.loading = false
  } finally {
    isLoading.value = false
  }

  // Scroll to bottom
  nextTick(() => {
    const container = document.querySelector('.overflow-y-auto')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}

const sendStreamingMessage = async (message: string, assistantMessage: Message) => {
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(
      `/api/v2/method/gameplan.ai.juno.get_streaming_response?` +
        new URLSearchParams({
          message: message,
          model: selectedModel.value || '',
        }),
    )

    let hasContent = false

    eventSource.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'content') {
          if (!hasContent) {
            assistantMessage.loading = false
            hasContent = true
          }
          assistantMessage.content += data.content
        } else if (data.type === 'done') {
          eventSource.close()
          resolve(undefined)
        } else if (data.type === 'error') {
          assistantMessage.content = data.error || 'An error occurred'
          assistantMessage.loading = false
          eventSource.close()
          reject(new Error(data.error))
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = function (error) {
      console.error('EventSource failed:', error)
      assistantMessage.content = 'Connection error. Please try again.'
      assistantMessage.loading = false
      eventSource.close()
      reject(error)
    }

    // Set a timeout to close the connection if it takes too long
    setTimeout(() => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        eventSource.close()
        if (!hasContent) {
          assistantMessage.content = 'Request timed out. Please try again.'
          assistantMessage.loading = false
        }
        resolve(undefined)
      }
    }, 30000)
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

// Initialize component
onMounted(() => {
  testConnection()

  // Check if there's an initial message from query params
  const initialMessage = route.query.message as string
  if (initialMessage) {
    newMessage.value = initialMessage
    nextTick(() => {
      sendMessage()
    })
  }
})
</script>
