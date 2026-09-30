<script setup lang="ts">
import { Tooltip } from 'frappe-ui'
import { EMOTE_CELL, EMOTE_DEFINITIONS, EMOTE_SHEET_COLUMNS } from '../avatar/emotes'
import { GameAssetPaths } from '../config/assets'
import { EMOTES, type EmoteId } from '../net/protocol'

/** One button per emote, numbered for the 1 to 8 keys (handled in `Arcade.vue`). */

const emit = defineEmits<{ emote: [emote: EmoteId] }>()

const SIZE = 32
const scale = SIZE / EMOTE_CELL

// The first icon frame, cut out of the emote sheet with CSS.
function iconStyle(emote: EmoteId) {
  const frame = EMOTE_DEFINITIONS[emote].icon[0]
  const column = frame % EMOTE_SHEET_COLUMNS
  const row = Math.floor(frame / EMOTE_SHEET_COLUMNS)
  return {
    backgroundImage: `url(${GameAssetPaths.emotes})`,
    backgroundSize: `${EMOTE_SHEET_COLUMNS * SIZE}px auto`,
    backgroundPosition: `-${column * EMOTE_CELL * scale}px -${row * EMOTE_CELL * scale}px`,
  }
}
</script>

<template>
  <div class="flex items-center gap-0.5">
    <Tooltip
      v-for="(emote, index) in EMOTES"
      :key="emote"
      :text="`${EMOTE_DEFINITIONS[emote].label} (${index + 1})`"
    >
      <button
        type="button"
        class="relative flex size-8 items-center justify-center rounded-6 outline-none transition-colors hover:bg-surface-gray-3 focus-visible:ring-2 focus-visible:ring-outline-gray-3 active:bg-surface-gray-4"
        :aria-label="EMOTE_DEFINITIONS[emote].label"
        @click="emit('emote', emote)"
      >
        <span
          class="block size-8 bg-no-repeat [image-rendering:pixelated]"
          :style="iconStyle(emote)"
        />
      </button>
    </Tooltip>
  </div>
</template>
