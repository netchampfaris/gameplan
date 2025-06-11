<template>
  <div class="my-4 rounded border border-outline-gray-2 bg-surface-gray-1 p-3">
    <!-- Tool Header -->
    <div class="text-xs font-medium text-ink-gray-6 mb-2">Tool</div>
    <div class="flex items-center gap-2">
      <code class="text-sm font-mono text-ink-gray-7 bg-surface-gray-3 px-2 py-0.5 rounded-sm">
        {{ toolCall.name }}
      </code>
      <div v-if="toolCall.isExecuting" class="flex items-center gap-1 ml-auto">
        <LoadingIndicator class="h-3 w-3" />
        <span class="text-xs text-ink-gray-5">Executing...</span>
      </div>
      <div v-else-if="toolCall.completed" class="ml-auto">
        <span class="text-xs text-ink-gray-6">✅ Completed</span>
      </div>
      <button
        @click="isCollapsed = !isCollapsed"
        class="ml-2 p-1 hover:bg-surface-gray-2 rounded transition-colors"
        :title="isCollapsed ? 'Expand' : 'Collapse'"
      >
        <LucideChevronDown
          class="h-4 w-4 text-ink-gray-5 transition-transform duration-200"
          :class="{ 'rotate-180': isCollapsed }"
        />
      </button>
    </div>

    <!-- Collapsible Content -->
    <div v-if="!isCollapsed" class="mt-3">
      <!-- Arguments -->
      <div v-if="toolCall.arguments" class="mb-3">
        <div class="text-xs font-medium text-ink-gray-6 mb-2">Arguments</div>
        <pre
          class="text-xs bg-surface-white border border-outline-gray-2 rounded p-2 overflow-x-auto text-ink-gray-7"
        ><code>{{ formatJson(toolCall.arguments) }}</code></pre>
      </div>

      <!-- Result -->
      <div v-if="toolCall.result !== null">
        <div class="text-xs font-medium text-ink-gray-6 mb-2">Result</div>
        <pre
          class="text-xs bg-surface-white border border-outline-gray-2 rounded p-2 overflow-auto text-ink-gray-7 h-32 max-h-32"
        ><code>{{ formatResult(toolCall.result) }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { LoadingIndicator } from 'frappe-ui'
import LucideChevronDown from '~icons/lucide/chevron-down'

interface ToolCallData {
  name: string
  arguments?: any
  result?: any
  isExecuting: boolean
  completed: boolean
}

defineProps<{
  toolCall: ToolCallData
}>()

const isCollapsed = ref(false)

const formatJson = (data: any): string => {
  if (typeof data === 'string') {
    try {
      return JSON.stringify(JSON.parse(data), null, 2)
    } catch {
      return data
    }
  }
  return JSON.stringify(data, null, 2)
}

const formatResult = (result: any): string => {
  if (typeof result === 'string') {
    return result
  }
  return JSON.stringify(result, null, 2)
}
</script>
