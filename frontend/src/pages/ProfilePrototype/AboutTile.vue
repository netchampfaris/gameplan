<template>
  <!-- PROTOTYPE — throwaway. About squeezed into a fixed-height bento tile (variant A).
       The clipping and the "Read more" escape hatch are the point: they are what
       the all-cards model costs. -->
  <article
    class="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base"
  >
    <div class="flex items-center justify-between px-4 pt-4">
      <div class="text-xs font-medium text-ink-gray-5 sm:text-sm">About</div>
      <Button
        v-if="isOwnProfile"
        variant="ghost"
        size="sm"
        icon="lucide-edit-2"
        label="Edit about"
        @click="$emit('edit')"
      />
    </div>

    <div class="relative min-h-0 flex-1">
      <div
        ref="proseElement"
        class="prose prose-v3 h-full max-w-none overflow-hidden px-4 pb-4 pt-2"
        v-html="readme"
      />
      <div
        v-if="isClipped"
        class="pointer-events-none absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-gradient-to-t from-surface-base via-surface-base/85 to-transparent pb-3"
      >
        <span
          class="pointer-events-auto rounded-full border border-outline-gray-2 bg-surface-base px-3 py-1 text-sm text-ink-gray-7"
        >
          Read more
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { Button } from 'frappe-ui'
import { useElementSize } from '@vueuse/core'

defineProps<{ readme?: string | null; isOwnProfile: boolean }>()
defineEmits<{ edit: [] }>()

// Rough clip detection: the prose block is height-constrained by the tile, so
// compare its scroll height against the box it was given.
const proseElement = useTemplateRef<HTMLElement>('proseElement')
const { height } = useElementSize(proseElement)
const isClipped = computed(() => {
  let element = proseElement.value
  if (!element) return true
  return element.scrollHeight > height.value + 8
})
</script>
