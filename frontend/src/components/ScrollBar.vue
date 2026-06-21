<template>
  <ScrollAreaScrollbar
    class="flex select-none touch-none p-0.5 z-20 bg-transparent transition-colors duration-150 ease-out hover:bg-black/5 dark:hover:bg-white/5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
    orientation="vertical"
  >
    <ScrollAreaThumb
      class="flex-1 bg-gray-400 dark:bg-gray-700 rounded-lg relative transition-opacity duration-150 ease-out before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]"
      :class="isThumbVisible ? 'opacity-100' : 'opacity-0'"
    />
  </ScrollAreaScrollbar>
</template>
<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { onUnmounted, ref } from 'vue'
import { injectScrollAreaRootContext, ScrollAreaScrollbar, ScrollAreaThumb } from 'reka-ui'

const rootContext = injectScrollAreaRootContext()
const isThumbVisible = ref(false)
const isPointerDown = ref(false)

let idleTimeout: ReturnType<typeof window.setTimeout> | undefined

function clearIdleTimeout() {
  if (!idleTimeout) return

  window.clearTimeout(idleTimeout)
  idleTimeout = undefined
}

function scheduleHide() {
  clearIdleTimeout()

  idleTimeout = window.setTimeout(() => {
    isThumbVisible.value = false
    idleTimeout = undefined
  }, rootContext.scrollHideDelay.value)
}

function showThumb() {
  isThumbVisible.value = true

  if (!isPointerDown.value) scheduleHide()
}

function hideThumb() {
  if (isPointerDown.value) return

  clearIdleTimeout()
  isThumbVisible.value = false
}

function handlePointerDown() {
  isPointerDown.value = true
  clearIdleTimeout()
  isThumbVisible.value = true
}

function handlePointerUp() {
  if (!isPointerDown.value) return

  isPointerDown.value = false
  scheduleHide()
}

useEventListener(rootContext.scrollArea, 'pointerenter', showThumb)
useEventListener(rootContext.scrollArea, 'pointermove', showThumb)
useEventListener(rootContext.scrollArea, 'pointerdown', handlePointerDown)
useEventListener(rootContext.scrollArea, 'pointerleave', hideThumb)
useEventListener(rootContext.viewport, 'scroll', showThumb)
useEventListener(window, 'pointerup', handlePointerUp)

onUnmounted(clearIdleTimeout)
</script>
