<template>
  <Teleport to="#pageHeaderTarget">
    <header v-bind="headerAttrs" :class="[baseClass, attrs.class]" @click="handleHeaderClick">
      <slot />
    </header>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { scrollToTop } from '@/utils/scrollContainer'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    baseClass?: string
  }>(),
  {
    baseClass: '',
  },
)

const attrs = useAttrs()
const headerAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

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
