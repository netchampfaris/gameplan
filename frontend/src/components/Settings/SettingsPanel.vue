<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="shrink-0">
      <h2 class="text-3xl-semibold leading-none text-ink-gray-9">{{ title }}</h2>
      <p v-if="description" class="mt-2 max-w-2xl text-p-base leading-relaxed text-ink-gray-5">
        {{ description }}
      </p>
    </div>
    <div class="mt-8 min-h-0 overflow-y-auto pb-16 pr-2">
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
