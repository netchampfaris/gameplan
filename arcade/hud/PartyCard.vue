<script setup lang="ts">
import { celebrationTitle, type Celebration } from '../interactions/party'
import AvatarFace from './AvatarFace.vue'

/**
 * Today's celebrations, shown above the prompt while the player stands at the party
 * corner. The celebrant also sees who added candles to their cake.
 */

defineProps<{ celebrations: Celebration[]; user: string }>()

/** Names shown before "and N more". */
const SHOWN = 6

function candleCount(count: number): string {
  return count === 1 ? '1 candle' : `${count} candles`
}

function note(celebration: Celebration, user: string): string {
  if (celebration.celebrant === user) {
    return celebration.candles
      ? 'Candles from your team:'
      : 'Everyone here can add a candle to your cake.'
  }
  return celebration.candled ? 'You added a candle.' : 'Add a candle to wish them well.'
}
</script>

<template>
  <div
    class="w-72 max-w-full divide-y divide-outline-gray-1 rounded-7 bg-surface-elevation-2 px-3 shadow-lg"
    role="status"
  >
    <section
      v-for="celebration in celebrations"
      :key="`${celebration.occasion}:${celebration.celebrant}`"
      class="py-3"
    >
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-base-medium text-ink-gray-8">{{ celebrationTitle(celebration) }}</span>
        <span class="shrink-0 text-sm text-ink-gray-5">{{ candleCount(celebration.candles) }}</span>
      </div>
      <p class="mt-1 text-p-sm text-ink-gray-5">{{ note(celebration, user) }}</p>
      <ul
        v-if="celebration.celebrant === user && celebration.candlesFrom.length"
        class="mt-2 flex flex-col gap-1.5"
      >
        <li
          v-for="giver in celebration.candlesFrom.slice(0, SHOWN)"
          :key="giver.user"
          class="flex items-center gap-2"
        >
          <AvatarFace :appearance="giver.appearance" :size="20" class="shrink-0" />
          <span class="truncate text-sm text-ink-gray-7">
            {{ giver.user === user ? 'You' : giver.fullName }}
          </span>
        </li>
        <li v-if="celebration.candlesFrom.length > SHOWN" class="text-sm text-ink-gray-5">
          and {{ celebration.candlesFrom.length - SHOWN }} more
        </li>
      </ul>
    </section>
  </div>
</template>
