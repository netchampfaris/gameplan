<template>
  <Teleport to="#pageHeaderTarget">
    <header
      class="z-10 flex min-h-12 flex-col justify-center border-b bg-surface-base px-3 sm:px-5"
      @click="handleHeaderClick"
    >
      <div class="flex items-center justify-between">
        <slot></slot>
      </div>
    </header>
  </Teleport>
</template>

<script setup lang="ts">
import { scrollToTop } from '@/utils/scrollContainer'

function handleHeaderClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return
  if (
    target.closest(
      'a, button, input, textarea, select, label, [role="button"], [data-no-scroll-top]',
    )
  ) {
    return
  }
  scrollToTop()
}
</script>
