<template>
  <!-- PROTOTYPE — throwaway. Deliberately high-contrast so it reads as scaffolding,
       not as part of the design being judged. Never rendered in a production build. -->
  <Teleport to="body">
    <div
      class="fixed bottom-5 left-1/2 z-[900] flex -translate-x-1/2 items-center gap-1 rounded-full bg-surface-gray-9 p-1 shadow-2xl"
    >
      <button
        type="button"
        :class="iconButtonClass"
        aria-label="Previous variant"
        @click="step(-1)"
      >
        <span class="lucide-chevron-left size-4" aria-hidden="true" />
      </button>

      <div class="px-2 text-sm font-medium tabular-nums text-ink-white">
        {{ current.key }} — {{ current.name }}
      </div>

      <button type="button" :class="iconButtonClass" aria-label="Next variant" @click="step(1)">
        <span class="lucide-chevron-right size-4" aria-hidden="true" />
      </button>

      <div class="mx-1 h-5 w-px bg-surface-white/25" />

      <button
        type="button"
        :class="[toggleButtonClass, showCustomCards ? activeToggleClass : '']"
        @click="setQuery({ cards: showCustomCards ? 'default' : 'custom' })"
      >
        Custom cards
      </button>
      <button
        type="button"
        :class="[toggleButtonClass, isNarrow ? activeToggleClass : '']"
        @click="setQuery({ w: isNarrow ? undefined : 'mobile' })"
      >
        Mobile
      </button>

      <div class="mx-1 h-5 w-px bg-surface-white/25" />

      <button type="button" :class="toggleButtonClass" @click="setQuery(exitQuery)">Exit</button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'

const variants = [
  { key: 'A', name: 'All cards' },
  { key: 'B', name: 'Fixed header' },
  { key: 'C', name: 'Cards + About' },
]

const route = useRoute()
const router = useRouter()

const iconButtonClass =
  'grid size-7 place-items-center rounded-full text-ink-white transition hover:bg-surface-white/15'
const toggleButtonClass =
  'rounded-full px-2.5 py-1 text-sm text-ink-white/70 transition hover:bg-surface-white/15'
const activeToggleClass = '!bg-surface-white/25 !text-ink-white'

const current = computed(() => {
  return variants.find((variant) => variant.key === route.query.variant) || variants[0]
})
const showCustomCards = computed(() => route.query.cards === 'custom')
const isNarrow = computed(() => route.query.w === 'mobile')
const exitQuery = { variant: undefined, cards: undefined, w: undefined }

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) return
  if (event.key === 'ArrowLeft') step(-1)
  if (event.key === 'ArrowRight') step(1)
})

function step(direction: number) {
  let index = variants.findIndex((variant) => variant.key === current.value.key)
  let next = variants[(index + direction + variants.length) % variants.length]
  setQuery({ variant: next.key })
}

function setQuery(patch: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, ...patch } })
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'),
  )
}
</script>
