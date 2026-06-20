<template>
  <section class="border-b border-outline-gray-1 py-5 first:pt-0 last:border-b-0">
    <div>
      <h3 class="text-base-semibold text-ink-gray-9">{{ title }}</h3>
      <p v-if="description" class="mt-1 text-p-sm leading-relaxed text-ink-gray-5">
        {{ description }}
      </p>
    </div>
    <div class="mt-3 min-w-0">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>
