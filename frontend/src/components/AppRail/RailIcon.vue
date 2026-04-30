<template>
  <TooltipRoot>
    <TooltipTrigger as-child>
      <button
        type="button"
        class="flex size-7 items-center justify-center rounded transition"
        :class="
          isActive
            ? 'bg-surface-white text-ink-gray-8 shadow-sm'
            : 'text-ink-gray-6 hover:bg-surface-gray-3'
        "
        @click="emit('click')"
      >
        <span :class="[icon, 'size-4']" />
      </button>
    </TooltipTrigger>
    <TooltipBubble side="right">
      <template #content>
        <div class="leading-relaxed">{{ label }}</div>
      </template>
    </TooltipBubble>
  </TooltipRoot>
</template>

<script setup lang="ts">
import { TooltipRoot, TooltipTrigger } from 'reka-ui'
import { TooltipBubble } from 'frappe-ui'

defineProps<{
  label: string
  icon: string
  isActive: boolean
}>()

const emit = defineEmits<{ click: [] }>()
</script>
