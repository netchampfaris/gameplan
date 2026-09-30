<script setup lang="ts">
/**
 * A row of colour swatches. The colours are sampled from the pack's sprites, so they are
 * data, not theme colours. `modelValue` is 1-based, like the pack's variant numbers.
 */
defineProps<{ label: string; colors: string[] }>()
const model = defineModel<number>({ required: true })
</script>

<template>
  <div class="flex flex-wrap gap-1" role="radiogroup" :aria-label="label">
    <button
      v-for="(color, index) in colors"
      :key="index"
      type="button"
      role="radio"
      :aria-checked="model === index + 1"
      :aria-label="`${label} ${index + 1}`"
      class="rounded-full border-2 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-outline-gray-3"
      :class="
        model === index + 1
          ? 'border-outline-gray-5'
          : 'border-transparent hover:border-outline-gray-2'
      "
      @click="model = index + 1"
    >
      <span class="block size-5 rounded-full" :style="{ backgroundColor: color }" />
    </button>
  </div>
</template>
