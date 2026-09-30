<script setup lang="ts">
import { KeyboardShortcut } from 'frappe-ui'

defineProps<{ label: string }>()
</script>

<template>
  <div
    class="flex items-center gap-2 rounded-7 bg-surface-elevation-2 py-1.5 pl-1.5 pr-3 shadow-lg"
    role="status"
  >
    <KeyboardShortcut combo="E" bg />
    <span class="text-sm-medium text-ink-gray-8">{{ label }}</span>
  </div>
</template>
