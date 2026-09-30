<script setup lang="ts">
import type { PresenceEntry } from '../bridge'
import AvatarFace from './AvatarFace.vue'

defineProps<{ occupants: PresenceEntry[] }>()
</script>

<template>
  <section class="w-56 rounded-7 bg-surface-elevation-2 p-1.5 shadow-lg" aria-label="Who's here">
    <h2 class="px-1.5 pb-1 pt-1 text-sm-medium text-ink-gray-5">
      Here now · {{ occupants.length }}
    </h2>
    <ul class="max-h-64 overflow-y-auto">
      <li
        v-for="occupant in occupants"
        :key="occupant.id"
        class="flex items-center gap-2 rounded-6 px-1.5 py-1"
      >
        <AvatarFace :appearance="occupant.appearance" />
        <span class="truncate text-p-sm text-ink-gray-8">{{ occupant.fullName }}</span>
        <span v-if="occupant.isSelf" class="shrink-0 text-sm text-ink-gray-5">(you)</span>
      </li>
    </ul>
  </section>
</template>
