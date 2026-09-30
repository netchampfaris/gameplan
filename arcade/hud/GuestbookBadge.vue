<script setup lang="ts">
import { watch } from 'vue'
import type { NoteBoard } from '../bridge'
import { useGuestbookUnread } from './useArcadeNotes'

/**
 * Shown to a player in their own Home: how many people signed their Guestbook since they
 * last read it. Opening the Guestbook marks those notes read.
 */

const props = defineProps<{
  user: string
  /** The board the player has open, if any. */
  board: NoteBoard | null
  /** Goes up when someone in the Room changes a board. */
  revision: number
}>()

const unread = useGuestbookUnread(props.user)

watch(
  () => props.board,
  (board) => {
    if (board?.board === 'Guestbook' && board.home === props.user) unread.markRead()
  },
  { immediate: true },
)
watch(
  () => props.revision,
  () => {
    const reading = props.board?.board === 'Guestbook' && props.board.home === props.user
    if (reading) unread.markRead()
    else unread.reload()
  },
)
</script>

<template>
  <div
    v-if="unread.count.value"
    class="flex items-center gap-2 rounded-7 bg-surface-elevation-2 py-1.5 pl-2 pr-3 shadow-lg"
    role="status"
  >
    <span class="lucide-book-open size-4 text-ink-gray-6" aria-hidden="true" />
    <span class="text-sm-medium text-ink-gray-8">
      {{ unread.count.value }} new in your guestbook
    </span>
  </div>
</template>
