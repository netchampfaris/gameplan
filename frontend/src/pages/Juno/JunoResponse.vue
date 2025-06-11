<template>
  <div class="message-renderer prose prose-sm max-w-none">
    <template v-for="(block, index) in contentBlocks" :key="index">
      <!-- Function call blocks with special styling -->
      <div v-if="block.type === 'function_call'" class="mb-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Button
            @click="toggleBlock(index)"
            variant="ghost"
            size="sm"
            class="w-full justify-start"
          >
            <div class="flex items-center gap-3 w-full">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span class="font-medium text-blue-700">Function Call</span>
              </div>
              <div v-if="block.toolCall" class="flex items-center gap-2 text-sm text-blue-600">
                <span class="bg-blue-100 px-2 py-0.5 rounded font-mono">{{
                  block.toolCall.server
                }}</span>
                <span>•</span>
                <span class="bg-blue-100 px-2 py-0.5 rounded font-mono">{{
                  block.toolCall.tool
                }}</span>
              </div>
              <div class="flex-1"></div>
              <span :class="{ 'rotate-180': block.expanded }" class="text-blue-600 duration-200">
                {{ block.expanded ? '▼' : '▶' }}
              </span>
            </div>
          </Button>

          <div v-if="block.expanded" class="mt-4 space-y-3">
            <!-- Tool Details -->
            <div v-if="block.toolCall" class="bg-white border border-blue-100 rounded p-3">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm font-medium text-gray-700">Tool Details:</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-gray-500">Server:</span>
                  <span class="ml-2 font-mono bg-gray-100 px-2 py-0.5 rounded">{{
                    block.toolCall.server
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-500">Tool:</span>
                  <span class="ml-2 font-mono bg-gray-100 px-2 py-0.5 rounded">{{
                    block.toolCall.tool
                  }}</span>
                </div>
              </div>

              <!-- Arguments -->
              <div v-if="Object.keys(block.toolCall.arguments).length > 0" class="mt-3">
                <span class="text-sm font-medium text-gray-700 block mb-2">Arguments:</span>
                <div class="bg-gray-50 rounded p-2 font-mono text-sm">
                  <pre>{{ JSON.stringify(block.toolCall.arguments, null, 2) }}</pre>
                </div>
              </div>
            </div>

            <!-- Raw JSON -->
            <div class="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm overflow-x-auto">
              <div class="text-gray-500 text-xs mb-2">Raw Function Call:</div>
              <pre>{{ formatFunctionCall(block.content) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Other collapsible XML tag blocks -->
      <div v-else-if="collapsibleTags.includes(block.type)" class="mb-4">
        <Button @click="toggleBlock(index)" size="sm" variant="subtle">
          <template #prefix>
            <div
              class="w-2 h-2 rounded-full bg-orange-500"
              :class="{
                'animate-pulse': block.isOpen,
              }"
            ></div>
          </template>
          {{ getBlockLabel(block) }}
        </Button>

        <div
          v-if="block.expanded"
          class="mt-3 text-gray-600 whitespace-pre-wrap border-l-4 border-gray-200 pl-3 bg-gray-50 rounded-r p-3"
        >
          {{ block.content }}
        </div>
      </div>

      <!-- Regular content blocks -->
      <div v-else v-html="block.renderedContent"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import showdown from 'showdown'
import { LoadingIndicator, Button } from 'frappe-ui'

interface Props {
  content: string
}

const props = defineProps<Props>()

// Configure showdown converter
const converter = new showdown.Converter({
  tables: true,
  strikethrough: true,
  tasklists: true,
  ghCodeBlocks: true,
  smoothLivePreview: true,
  openLinksInNewWindow: true,
  emoji: true,
})

// List of XML tags to render as collapsible details
const collapsibleTags = [
  'think',
  'thinking',
  'reasoning',
  'analysis',
  'planning',
  'internal',
  'debug',
  'function_call',
]

interface ContentBlock {
  type: string
  content: string
  isOpen?: boolean
  expanded?: boolean
  renderedContent?: string
  toolCall?: {
    server: string
    tool: string
    arguments: Record<string, any>
  }
}

// Track expanded state for each block
const expandedBlocks = ref<Set<number>>(new Set())

// Thinking animation state
const thinkingText = ref('Thinking.')
const thinkingDuration = ref<string>('')
let thinkingInterval: number | null = null
let thinkingStartTime: number | null = null

const startThinking = () => {
  thinkingStartTime = Date.now()
  let dotCount = 1

  thinkingInterval = setInterval(() => {
    const dots = '.'.repeat(dotCount)
    thinkingText.value = `Thinking${dots}`
    dotCount = dotCount === 3 ? 1 : dotCount + 1
  }, 500)
}

const stopThinking = () => {
  if (thinkingInterval) {
    clearInterval(thinkingInterval)
    thinkingInterval = null
  }

  if (thinkingStartTime) {
    const duration = Date.now() - thinkingStartTime
    const seconds = Math.round(duration / 1000)
    thinkingDuration.value = seconds === 1 ? '1 second' : `${seconds} seconds`
  }
}

const getBlockLabel = (block: ContentBlock): string => {
  if (block.type === 'think' || block.type === 'thinking') {
    if (block.isOpen) {
      return thinkingText.value
    } else if (thinkingDuration.value) {
      return `Thought for ${thinkingDuration.value}`
    } else {
      return 'Thought'
    }
  }
  return block.type
}

const toggleBlock = (index: number) => {
  if (expandedBlocks.value.has(index)) {
    expandedBlocks.value.delete(index)
  } else {
    expandedBlocks.value.add(index)
  }
}

const formatFunctionCall = (content: string): string => {
  try {
    // Try to parse and pretty-print JSON if it's valid JSON
    const parsed = JSON.parse(content.trim())
    return JSON.stringify(parsed, null, 2)
  } catch {
    // If not valid JSON, return as-is
    return content.trim()
  }
}

const parseToolCall = (
  content: string,
): { server: string; tool: string; arguments: Record<string, any> } | undefined => {
  try {
    const parsed = JSON.parse(content.trim())
    if (parsed.server && parsed.tool) {
      return {
        server: parsed.server,
        tool: parsed.tool,
        arguments: parsed.arguments || {},
      }
    }
  } catch {
    // Not valid JSON or missing required fields
  }
  return undefined
}

const contentBlocks = computed((): ContentBlock[] => {
  const blocks: ContentBlock[] = []
  let content = props.content
  let currentIndex = 0

  // First, handle tool execution indicators
  content = content.replace(
    /🔧 \*\*Executing tool:\*\* `([^`]+)`/g,
    '<div class="tool-execution-start">🔧 **Executing tool:** `$1`</div>',
  )
  content = content.replace(
    /🔧 \*Executing tool\.\.\.\*/g,
    '<div class="tool-execution-start">🔧 *Executing tool...*</div>',
  )
  content = content.replace(
    /✅ \*Tool execution completed\*/g,
    '<div class="tool-execution-end">✅ *Tool execution completed*</div>',
  )

  while (currentIndex < content.length) {
    // Find the next XML tag
    let nextTagMatch: RegExpMatchArray | null = null
    let nextTagIndex = content.length
    let matchedTag = ''

    // Look for the earliest occurring collapsible tag
    for (const tagName of collapsibleTags) {
      const regex = new RegExp(`<${tagName}>`, 'gi')
      regex.lastIndex = currentIndex
      const match = regex.exec(content)
      if (match && match.index < nextTagIndex) {
        nextTagMatch = match
        nextTagIndex = match.index
        matchedTag = tagName
      }
    }

    if (nextTagMatch && matchedTag) {
      // A tag was found
      // Add content before the tag as a regular block
      if (nextTagIndex > currentIndex) {
        const beforeContent = content.slice(currentIndex, nextTagIndex).trim()
        if (beforeContent) {
          blocks.push({
            type: 'response',
            content: beforeContent,
            renderedContent: converter.makeHtml(beforeContent),
          })
        }
      } // Process the XML tag
      const tagStart = nextTagIndex + nextTagMatch[0].length

      // Look for closing tag
      const closingTagRegex = new RegExp(`</${matchedTag}>`, 'gi')
      closingTagRegex.lastIndex = tagStart
      const closingMatch = closingTagRegex.exec(content)

      if (closingMatch) {
        // Closed tag
        const tagContent = content.slice(tagStart, closingMatch.index)
        const block: ContentBlock = {
          type: matchedTag,
          content: tagContent.trim(),
          isOpen: false,
          expanded: expandedBlocks.value.has(blocks.length),
        }

        // Parse tool call if this is a function_call
        if (matchedTag === 'function_call') {
          block.toolCall = parseToolCall(tagContent.trim())
        }

        blocks.push(block)
        currentIndex = closingMatch.index + closingMatch[0].length
      } else {
        // Unclosed tag (streaming)
        const tagContent = content.slice(tagStart)
        const block: ContentBlock = {
          type: matchedTag,
          content: tagContent.trim(),
          isOpen: true,
          expanded: expandedBlocks.value.has(blocks.length),
        }

        // Parse tool call if this is a function_call
        if (matchedTag === 'function_call') {
          block.toolCall = parseToolCall(tagContent.trim())
        }

        blocks.push(block)
        currentIndex = content.length
      }
    } else {
      // No more collapsible tags found from currentIndex
      // No more tags, add remaining content
      const remainingContent = content.slice(currentIndex).trim()
      if (remainingContent) {
        blocks.push({
          type: 'response',
          content: remainingContent,
          renderedContent: converter.makeHtml(remainingContent),
        })
      }
      break // All remaining content is processed, exit loop
    }
  }

  return blocks
})

// Watch for thinking blocks and manage animation
const hasOpenThinkingBlock = computed(() => {
  return contentBlocks.value.some(
    (block) => (block.type === 'think' || block.type === 'thinking') && block.isOpen,
  )
})

// Watch for changes in thinking state
let previousHasThinking = false
const watchThinking = () => {
  const hasThinking = hasOpenThinkingBlock.value

  if (hasThinking && !previousHasThinking) {
    startThinking()
  } else if (!hasThinking && previousHasThinking) {
    stopThinking()
  }

  previousHasThinking = hasThinking
}

// Watch for changes in content blocks
let previousContentLength = 0
const checkForChanges = () => {
  const currentLength = props.content.length
  if (currentLength !== previousContentLength) {
    watchThinking()
    previousContentLength = currentLength
  }
  requestAnimationFrame(checkForChanges)
}

onMounted(() => {
  checkForChanges()
})

onUnmounted(() => {
  if (thinkingInterval) {
    clearInterval(thinkingInterval)
  }
})
</script>

<style scoped>
:deep(.tool-execution-start) {
  background-color: rgb(239 246 255);
  border: 1px solid rgb(147 197 253);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin: 0.5rem 0;
  color: rgb(29 78 216);
  font-weight: 500;
}

:deep(.tool-execution-end) {
  background-color: rgb(240 253 244);
  border: 1px solid rgb(134 239 172);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin: 0.5rem 0;
  color: rgb(21 128 61);
  font-weight: 500;
}

/* Enhanced code block styling */
:deep(pre) {
  background-color: rgb(17 24 39);
  color: rgb(243 244 246);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

:deep(code) {
  background-color: rgb(243 244 246);
  color: rgb(31 41 55);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo,
    monospace;
}

/* Table styling for better readability */
:deep(table) {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid rgb(209 213 219);
  margin: 1rem 0;
}

:deep(th) {
  border: 1px solid rgb(209 213 219);
  background-color: rgb(243 244 246);
  padding: 0.75rem;
  font-weight: 600;
  text-align: left;
}

:deep(td) {
  border: 1px solid rgb(209 213 219);
  padding: 0.75rem;
}
</style>
