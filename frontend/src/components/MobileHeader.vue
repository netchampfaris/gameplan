<template>
  <PageHeaderShell
    base-class="z-10 flex h-[var(--mobile-header-height)] flex-col justify-center border-b bg-surface-base px-3"
  >
    <div class="relative flex h-full w-full items-center">
      <div
        v-if="hasLeftSlot"
        class="absolute left-0 top-1/2 z-[1] flex max-w-10 -translate-y-1/2 justify-start overflow-hidden"
      >
        <slot name="left" />
      </div>
      <h1
        class="mx-10 min-w-0 flex-1 overflow-hidden text-center text-xl-semibold leading-tight text-ink-gray-9 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
      >
        <slot>{{ title }}</slot>
      </h1>
      <div
        v-if="hasRightSlot"
        class="absolute right-0 top-1/2 z-[1] flex max-w-[45%] -translate-y-1/2 justify-end"
      >
        <slot name="right" />
      </div>
    </div>
  </PageHeaderShell>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import PageHeaderShell from './PageHeaderShell.vue'

defineProps<{
  title?: string
}>()

const slots = useSlots()
const hasLeftSlot = computed(() => Boolean(slots.left))
const hasRightSlot = computed(() => Boolean(slots.right))
</script>
