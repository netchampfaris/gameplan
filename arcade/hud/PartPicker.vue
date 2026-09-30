<script setup lang="ts" generic="Entry extends StyleEntry">
import { Button } from 'frappe-ui'
import { computed } from 'vue'
import type { ColoredPart, StyleEntry } from '../avatar/catalog'
import SwatchPicker from './SwatchPicker.vue'

/**
 * Steps through the styles of a coloured part, then picks one of that style's colours.
 * With `optional`, "None" comes before the first style.
 */

const props = defineProps<{
  label: string
  entries: Entry[]
  optional?: boolean
  /** Names a style; unnamed styles show as "Style 3 of 20". */
  nameOf?: (entry: Entry) => string
}>()
const model = defineModel<ColoredPart | undefined>({ required: true })

// -1 is "None".
const index = computed(() => props.entries.findIndex((entry) => entry.style === model.value?.style))
const entry = computed(() => props.entries[index.value])

const caption = computed(() => {
  if (!entry.value) return 'None'
  return props.nameOf?.(entry.value) ?? `Style ${index.value + 1} of ${props.entries.length}`
})

function step(by: number) {
  const first = props.optional ? -1 : 0
  const count = props.entries.length - first
  const next = ((index.value - first + by + count) % count) + first
  const nextEntry = props.entries[next]
  if (!nextEntry) {
    model.value = undefined
    return
  }
  // Keep the colour variant where the new style has as many, so stepping mostly changes shape.
  const color = Math.min(model.value?.color ?? 1, nextEntry.colors.length)
  model.value = { style: nextEntry.style, color }
}

const color = computed({
  get: () => model.value?.color ?? 1,
  set: (value: number) => {
    if (model.value) model.value = { ...model.value, color: value }
  },
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm text-ink-gray-5">{{ label }}</span>
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          icon="lucide-chevron-left"
          :aria-label="`Previous ${label.toLowerCase()}`"
          @click="step(-1)"
        />
        <span class="w-28 text-center text-sm-medium text-ink-gray-8 tabular-nums">{{
          caption
        }}</span>
        <Button
          variant="ghost"
          icon="lucide-chevron-right"
          :aria-label="`Next ${label.toLowerCase()}`"
          @click="step(1)"
        />
      </div>
    </div>
    <SwatchPicker v-if="entry" v-model="color" :label="`${label} color`" :colors="entry.colors" />
  </div>
</template>
