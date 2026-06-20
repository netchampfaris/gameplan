<template>
  <div class="flex min-h-10 items-center justify-between gap-4 py-2">
    <div class="min-w-0">
      <div class="text-base text-ink-gray-8">{{ title }}</div>
      <div v-if="description" class="mt-0.5 text-p-sm leading-relaxed text-ink-gray-5">
        {{ description }}
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>
