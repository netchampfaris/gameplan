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
        <!-- MCP Tools Status -->
        <div v-if="mcpTools.data?.tools?.length" class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-ink-gray-6"></div>
          <span class="text-xs text-ink-gray-5">
            {{ mcpTools.data.tools.length }} tools available
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
        <!-- Tools Toggle Button -->
        <Button
          v-if="mcpTools.data?.tools?.length"
          @click="showTools = !showTools"
          appearance="outline"
          size="sm"
          :class="[showTools ? 'bg-surface-gray-2' : '']"
        >
          🔧 Tools
        </Button>
        <!-- Clear Chat Button -->
        <Button v-if="messages.length > 0" @click="clearChat" appearance="outline" size="sm">
          🗑️ Clear Chat
        </Button>
        <!-- MCP Servers Link -->
        <Button @click="$router.push({ name: 'MCPServers' })" appearance="outline" size="sm">
          ⚙️ MCP Servers
        </Button>
      </div>
    </PageHeader>

    <!-- MCP Tools Panel -->
    <div
      v-if="showTools && mcpTools.data?.tools?.length"
      class="border-b border-outline-gray-2 bg-surface-gray-1 px-6 py-4"
    >
      <div class="mx-auto max-w-3xl">
        <h3 class="text-sm font-medium text-ink-gray-8 mb-3">Available MCP Tools</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="tool in mcpTools.data.tools"
            :key="`${tool.server}.${tool.name}`"
            class="rounded-lg border border-outline-gray-2 bg-surface-white p-3"
          >
            <div class="flex items-start gap-2">
              <div
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-gray-2 text-xs"
              >
                🔧
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1">
                  <span class="text-xs font-medium text-ink-gray-8">{{ tool.server }}</span>
                  <span class="text-xs text-ink-gray-5">.</span>
                  <span class="text-xs font-medium text-ink-gray-8">{{ tool.name }}</span>
                </div>
                <p class="text-xs text-ink-gray-6 mt-1 line-clamp-2">
                  {{ tool.description }}
                </p>
                <div v-if="tool.input_schema?.properties" class="flex flex-wrap gap-1 mt-2">
                  <span
                    v-for="param in Object.keys(tool.input_schema.properties).slice(0, 3)"
                    :key="param"
                    class="inline-flex items-center rounded-full bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6"
                  >
                    {{ param }}
                  </span>
                  <span
                    v-if="Object.keys(tool.input_schema.properties).length > 3"
                    class="inline-flex items-center rounded-full bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6"
                  >
                    +{{ Object.keys(tool.input_schema.properties).length - 3 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Messages Container -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto">
      <div class="mx-auto max-w-3xl py-8 space-y-6">
        <!-- Message List -->
        <template v-for="message in messages" :key="message.id">
          <!-- User Message -->
          <div v-if="message.type === 'user'" class="flex justify-end">
            <div class="max-w-[80%] rounded-lg bg-surface-gray-2 text-ink-gray-8 px-4 py-3">
              <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
            </div>
          </div>

          <!-- AI Message -->
          <div v-else class="flex gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-gray-2 text-sm"
            >
              ✨
            </div>
            <div class="flex-1 max-w-[80%]">
              <div v-if="message.loading" class="flex items-center gap-2 text-ink-gray-5">
                <LoadingIndicator class="h-4 w-4" />
                <span class="text-sm">Thinking...</span>
              </div>
              <div v-else>
                <!-- Render blocks in order -->
                <template v-if="message.blocks?.length">
                  <template
                    v-for="block in message.blocks"
                    :key="block.type + '-' + (block.toolCall?.id || 'content')"
                  >
                    <ToolCall
                      v-if="block.type === 'tool_call' && block.toolCall"
                      :tool-call="block.toolCall"
                    />
                    <JunoResponse
                      v-else-if="block.type === 'content' && block.content"
                      :content="block.content"
                    />
                  </template>
                </template>
                <!-- Fallback to old content structure -->
                <JunoResponse v-else-if="message.content" :content="message.content" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Chat Input -->
    <div class="bg-surface-white px-6 pb-4">
      <div class="mx-auto max-w-3xl">
        <div class="flex gap-3">
          <div class="flex-1">
            <div
              class="rounded-lg border border-outline-gray-2 bg-surface-white text-ink-gray-9 focus-within:border-outline-gray-3"
            >
              <textarea
                ref="messageInput"
                v-model="newMessage"
                placeholder="Ask Juno anything..."
                :rows="1"
                class="w-full resize-none border-0 bg-transparent p-3 text-sm focus:ring-0"
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
import ToolCall from './ToolCall.vue'

// Icons will be added later

interface ToolCallData {
  id: string
  name: string
  arguments?: any
  result?: any
  isExecuting: boolean
  completed: boolean
}

interface MessageBlock {
  type: 'content' | 'tool_call'
  content?: string
  toolCall?: ToolCallData
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  loading?: boolean
  blocks?: MessageBlock[]
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

interface MCPTool {
  server: string
  name: string
  description: string
  input_schema?: {
    type: string
    properties: Record<string, any>
  }
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
const messagesContainer = useTemplateRef<HTMLDivElement>('messagesContainer')
const showTools = ref(false)

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

// Use useCall for getting MCP tools
const mcpTools = useCall<{ tools: MCPTool[] }>({
  url: '/api/v2/method/gameplan.ai.juno.get_mcp_tools',
  immediate: true,
})

const generateMessageId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

const clearChat = () => {
  messages.value = []
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
    blocks: reactive([]),
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
  scrollToBottom()
}

const isAtBottom = () => {
  if (!messagesContainer.value) return false
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  // Allow for 1px tolerance for rounding errors
  return scrollTop + clientHeight >= scrollHeight - 1
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const scrollToBottomIfNeeded = () => {
  if (isAtBottom()) {
    scrollToBottom()
  }
}

const sendStreamingMessage = async (message: string, assistantMessage: Message) => {
  return new Promise((resolve, reject) => {
    // Prepare conversation history (excluding the current loading message)
    const conversationHistory = messages.value
      .filter((msg) => msg !== assistantMessage && !msg.loading)
      .map((msg) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }))

    // Create URL parameters
    const params = new URLSearchParams({
      message: message,
      model: selectedModel.value || '',
    })

    // Add conversation history as JSON if not empty
    if (conversationHistory.length > 0) {
      params.append('conversation_history', JSON.stringify(conversationHistory))
    }

    const eventSource = new EventSource(
      `/api/v2/method/gameplan.ai.juno.get_streaming_response?${params}`,
    )

    let hasContent = false
    let isSettled = false

    const settlePromise = (type: 'resolve' | 'reject', value?: any) => {
      if (isSettled) return
      isSettled = true
      eventSource.close()
      if (type === 'resolve') {
        resolve(value)
      } else {
        reject(value)
      }
    }

    let currentToolCall: ToolCallData | null = null
    let currentContentBlock: MessageBlock | null = null

    const ensureContentBlock = () => {
      if (!currentContentBlock || currentContentBlock.type !== 'content') {
        currentContentBlock = reactive({ type: 'content' as const, content: '' })
        if (!assistantMessage.blocks) {
          assistantMessage.blocks = reactive([])
        }
        assistantMessage.blocks.push(currentContentBlock)
      }
    }

    eventSource.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'content') {
          if (!hasContent) {
            assistantMessage.loading = false
            hasContent = true
          }

          ensureContentBlock()
          if (currentContentBlock) {
            currentContentBlock.content += data.content
          }

          assistantMessage.content += data.content
          scrollToBottomIfNeeded()
        } else if (data.type === 'thinking') {
          if (!hasContent) {
            assistantMessage.loading = false
            hasContent = true
          }

          const thinkingContent = data.content

          ensureContentBlock()
          if (currentContentBlock) {
            currentContentBlock.content += thinkingContent
          }

          assistantMessage.content += thinkingContent
          scrollToBottomIfNeeded()
        } else if (data.type === 'tool_call_start') {
          if (!hasContent) {
            assistantMessage.loading = false
            hasContent = true
          }

          const toolCall = data.tool_call
          if (toolCall) {
            let toolDisplayName = 'unknown tool'

            if (toolCall.name) {
              toolDisplayName = toolCall.name
            } else if (toolCall.server && toolCall.tool) {
              toolDisplayName = `${toolCall.server}.${toolCall.tool}`
            }

            currentToolCall = reactive({
              id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: toolDisplayName,
              arguments: toolCall.arguments || toolCall.input,
              result: null,
              isExecuting: true,
              completed: false,
            })

            const toolCallBlock: MessageBlock = reactive({
              type: 'tool_call' as const,
              toolCall: currentToolCall,
            })

            if (!assistantMessage.blocks) {
              assistantMessage.blocks = reactive([])
            }
            assistantMessage.blocks.push(toolCallBlock)

            currentContentBlock = null
          }
          scrollToBottomIfNeeded()
        } else if (data.type === 'tool_call_result') {
          if (currentToolCall && data.result) {
            currentToolCall.result = data.result
          }
          scrollToBottomIfNeeded()
        } else if (data.type === 'tool_call_end') {
          if (currentToolCall) {
            currentToolCall.isExecuting = false
            currentToolCall.completed = true
            currentToolCall = null
          }
          scrollToBottomIfNeeded()
        } else if (data.type === 'done') {
          settlePromise('resolve', undefined)
        } else if (data.type === 'error') {
          assistantMessage.content = data.error || 'An error occurred'
          assistantMessage.loading = false
          scrollToBottomIfNeeded()
          settlePromise('reject', new Error(data.error))
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
        assistantMessage.content = 'Error parsing response data. Please try again.'
        assistantMessage.loading = false
        scrollToBottomIfNeeded()
        settlePromise('reject', new Error('Failed to parse response data'))
      }
    }

    eventSource.onerror = function (error) {
      console.error('EventSource failed:', error)
      assistantMessage.content = 'Connection error. Please try again.'
      assistantMessage.loading = false
      settlePromise('reject', error)
    }

    setTimeout(() => {
      if (!isSettled) {
        if (!hasContent) {
          assistantMessage.content = 'Request timed out. Please try again.'
          assistantMessage.loading = false
          settlePromise('reject', new Error('Request timed out'))
        } else {
          settlePromise('resolve', undefined)
        }
      }
    }, 300000)
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
    nextTick(() => sendMessage())
  }
})
</script>
