<script setup lang="ts">
import { Progress } from 'frappe-ui'
import { computed } from 'vue'
import type { PlantStatus } from '../interactions/plant'

/** The shared plant, shown above the prompt while the player stands next to it. */

const props = defineProps<{ status: PlantStatus; user: string }>()

const stageText = computed(() =>
  props.status.bloomed ? 'In bloom' : `Stage ${props.status.stage} of ${props.status.stages}`,
)

const note = computed(() => {
  const { status } = props
  if (status.bloomed) return 'Everyone who watered it got a cutting. A new plant sprouts tomorrow.'
  if (status.drooping) return 'It is drooping. It needs water.'
  return 'It grows a stage on each day someone waters it.'
})

const watered = computed(() => {
  const names = props.status.wateredToday.map((entry) =>
    entry.user === props.user ? 'you' : entry.fullName,
  )
  if (!names.length) return 'Nobody has watered it today.'
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `Watered today by ${list}.`
})
</script>

<template>
  <div class="w-72 max-w-full rounded-7 bg-surface-elevation-2 p-3 shadow-lg" role="status">
    <div class="flex items-baseline justify-between gap-3">
      <span class="truncate text-base-medium text-ink-gray-8">{{ status.species.name }}</span>
      <span class="shrink-0 text-sm text-ink-gray-5">{{ stageText }}</span>
    </div>
    <Progress
      class="mt-2"
      :value="(status.stage / status.stages) * 100"
      intervals
      :interval-count="status.stages"
    />
    <p class="mt-2 text-p-sm text-ink-gray-7">{{ note }}</p>
    <p class="mt-1 text-p-sm text-ink-gray-5">{{ watered }}</p>
  </div>
</template>
