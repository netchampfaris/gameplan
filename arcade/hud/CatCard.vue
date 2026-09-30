<script setup lang="ts">
import { Button } from 'frappe-ui'
import { computed } from 'vue'
import type { CatPerson, CatStatus } from '../interactions/pet'

/**
 * The team cat, shown above the prompt while the player stands next to it: its name, who
 * named it, its favourite person, and a button to rename it.
 */

const props = defineProps<{ status: CatStatus; user: string }>()
const emit = defineEmits<{ rename: [] }>()

const title = computed(() => props.status.name ?? 'The cat')

function who(person: CatPerson): string {
  return person.user === props.user ? 'you' : person.fullName
}

const namedBy = computed(() => {
  const { namedBy } = props.status
  return namedBy ? `Named by ${who(namedBy)}` : 'Nobody has named it yet'
})

const favourite = computed(() => {
  const { favourite } = props.status
  return favourite ? `Favourite person: ${who(favourite)}` : 'No favourite person yet'
})
</script>

<template>
  <div
    class="pointer-events-auto w-72 max-w-full rounded-7 bg-surface-elevation-2 p-3 shadow-lg"
    role="status"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate text-base-medium text-ink-gray-8">{{ title }}</p>
        <p class="mt-1 truncate text-sm text-ink-gray-5">{{ namedBy }}</p>
      </div>
      <Button
        class="shrink-0"
        :label="status.name ? 'Rename' : 'Name it'"
        :disabled="status.namedToday"
        @click="emit('rename')"
      />
    </div>
    <p class="mt-2 text-p-sm text-ink-gray-7">{{ favourite }}</p>
    <p v-if="status.namedToday" class="mt-1 text-p-sm text-ink-gray-5">
      You named it today. You can rename it again tomorrow.
    </p>
    <p
      v-else-if="!status.favourite || status.favourite.user !== user"
      class="mt-1 text-p-sm text-ink-gray-5"
    >
      Pet it on more days than anyone to become its favourite.
    </p>
  </div>
</template>
