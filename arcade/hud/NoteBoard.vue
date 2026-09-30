<script setup lang="ts">
import { Button, Dialog, Textarea, dayjsLocal, toast } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import type { NoteBoard } from '../bridge'
import AvatarFace from './AvatarFace.vue'
import QuestionOfTheDay from './QuestionOfTheDay.vue'
import { MAX_NOTE_LENGTH, useArcadeNotes, type ArcadeNote } from './useArcadeNotes'

/**
 * The notes on a board: the Common Room's Notice Board, drawn as a cork board with notes
 * pinned to it under the question of the day, or a Home's Guestbook, drawn as a page of
 * signatures.
 *
 * The parent mounts one per board it opens, so `board` never changes under it.
 */

const props = defineProps<{
  board: NoteBoard
  user: string
  /** Goes up when someone else changes this board; the notes reload. */
  revision: number
}>()
const emit = defineEmits<{
  close: []
  /** The player pinned or removed a note, or answered the question, so the rest of the Room should reload. */
  changed: []
}>()

const notes = useArcadeNotes(props.board)
watch(
  () => props.revision,
  () => notes.reload(),
)

const isGuestbook = props.board.board === 'Guestbook'
const isOwnGuestbook = props.board.board === 'Guestbook' && props.board.home === props.user
const canWrite = !isOwnGuestbook

const open = ref(true)
watch(open, (isOpen) => {
  if (!isOpen) emit('close')
})

const title =
  props.board.board === 'Notice Board'
    ? 'Notice Board'
    : isOwnGuestbook
      ? 'Your guestbook'
      : `${props.board.ownerName}'s guestbook`
const placeholder = isGuestbook ? 'Say hi to whoever lives here' : 'Share something with the room'
const submitLabel = isGuestbook ? 'Sign the guestbook' : 'Pin note'

const draft = ref('')
const length = computed(() => draft.value.trim().length)
const canPost = computed(() => length.value > 0 && length.value <= MAX_NOTE_LENGTH)

async function post() {
  if (!canPost.value || notes.isPosting.value) return
  try {
    await notes.post(draft.value.trim())
  } catch (error) {
    toast.error(messageOf(error, 'Could not post your note'))
    return
  }
  draft.value = ''
  emit('changed')
}

async function remove(note: ArcadeNote) {
  try {
    await notes.remove(note.name)
  } catch (error) {
    toast.error(messageOf(error, 'Could not remove the note'))
    return
  }
  emit('changed')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    post()
  }
}

/** The author removes their note; in a Guestbook, so does the Home's owner. */
function canRemove(note: ArcadeNote): boolean {
  return note.owner === props.user || isOwnGuestbook
}

function when(creation: string): string {
  return dayjsLocal(creation).fromNow()
}

// Each note keeps its own tilt and colour, picked from its name.
const PAPER = ['paper-yellow', 'paper-pink', 'paper-blue', 'paper-green'] as const
const PIN = ['pin-red', 'pin-blue', 'pin-green', 'pin-amber'] as const

function look(note: ArcadeNote) {
  const seed = hash(note.name)
  return {
    paper: PAPER[seed % PAPER.length],
    pin: PIN[(seed >>> 3) % PIN.length],
    tilt: `rotate(${((seed >>> 6) % 7) - 3}deg)`,
  }
}

function hash(text: string): number {
  let value = 2166136261
  for (let index = 0; index < text.length; index++) {
    value = Math.imul(value ^ text.charCodeAt(index), 16777619)
  }
  return value >>> 0
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}
</script>

<template>
  <Dialog v-model:open="open" :size="isGuestbook ? 'xl' : '3xl'" :title="title">
    <div class="flex flex-col gap-4">
      <QuestionOfTheDay
        v-if="!isGuestbook"
        :user="user"
        :revision="revision"
        @answered="emit('changed')"
      />

      <!-- The Notice Board: notes pinned to cork. -->
      <div v-if="!isGuestbook" class="cork rounded-6 p-2.5">
        <div class="cork-surface max-h-[40vh] min-h-48 overflow-y-auto rounded-4 p-5">
          <p v-if="notes.isLoading.value" class="py-12 text-center text-p-base text-white/80">
            Fetching notes
          </p>
          <div
            v-else-if="!notes.data.value.length"
            class="note paper-yellow mx-auto mt-8 max-w-64 -rotate-2 px-5 pb-5 pt-7 text-center"
          >
            <span class="pin pin-red" aria-hidden="true" />
            <p class="text-p-base">Nothing pinned yet. Be the first!</p>
          </div>
          <ul v-else class="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-3">
            <li
              v-for="note in notes.data.value"
              :key="note.name"
              class="note group flex flex-col gap-3 px-3.5 pb-3 pt-5"
              :class="look(note).paper"
              :style="{ transform: look(note).tilt }"
            >
              <span class="pin" :class="look(note).pin" aria-hidden="true" />
              <p class="whitespace-pre-wrap break-words text-p-base">{{ note.message }}</p>
              <footer class="mt-auto flex items-center gap-1.5">
                <AvatarFace :appearance="note.author.appearance" :size="20" />
                <div class="min-w-0 flex-1 leading-tight">
                  <div class="truncate text-sm-medium">{{ note.author.name }}</div>
                  <div class="note-muted text-xs">{{ when(note.creation) }}</div>
                </div>
                <button
                  v-if="canRemove(note)"
                  type="button"
                  class="note-remove"
                  aria-label="Remove note"
                  title="Remove note"
                  :disabled="notes.isRemoving(note.name)"
                  @click="remove(note)"
                >
                  <span class="lucide-x size-3.5" aria-hidden="true" />
                </button>
              </footer>
            </li>
          </ul>
        </div>
      </div>

      <!-- The Guestbook: a page of signatures, newest first. -->
      <div v-else class="page max-h-[55vh] overflow-y-auto rounded-6 py-4 pl-10 pr-5">
        <p v-if="notes.isLoading.value" class="py-10 text-center text-p-base note-muted">
          Opening the guestbook
        </p>
        <p v-else-if="!notes.data.value.length" class="py-10 text-center text-p-base note-muted">
          {{
            isOwnGuestbook
              ? 'Nobody has signed your guestbook yet.'
              : 'Nobody has signed yet. Be the first!'
          }}
        </p>
        <ol v-else>
          <li
            v-for="note in notes.data.value"
            :key="note.name"
            class="signature group flex gap-3 py-3"
          >
            <AvatarFace :appearance="note.author.appearance" :size="32" class="shrink-0" />
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline gap-2">
                <span class="truncate text-base-medium">{{ note.author.name }}</span>
                <span class="note-muted shrink-0 text-sm">{{ when(note.creation) }}</span>
              </div>
              <p class="mt-1 whitespace-pre-wrap break-words text-p-base">{{ note.message }}</p>
            </div>
            <button
              v-if="canRemove(note)"
              type="button"
              class="note-remove self-start"
              aria-label="Remove note"
              title="Remove note"
              :disabled="notes.isRemoving(note.name)"
              @click="remove(note)"
            >
              <span class="lucide-x size-3.5" aria-hidden="true" />
            </button>
          </li>
        </ol>
      </div>

      <form v-if="canWrite" class="flex flex-col gap-2" @submit.prevent="post">
        <Textarea
          v-model="draft"
          :placeholder="placeholder"
          :rows="2"
          :maxlength="MAX_NOTE_LENGTH"
          aria-label="Your note"
          @keydown="onKeydown"
        />
        <div class="flex items-center justify-between gap-3">
          <span
            class="text-sm tabular-nums"
            :class="length > MAX_NOTE_LENGTH - 20 ? 'text-ink-gray-7' : 'text-ink-gray-5'"
          >
            {{ length }}/{{ MAX_NOTE_LENGTH }}
          </span>
          <Button
            type="submit"
            variant="solid"
            :label="submitLabel"
            :disabled="!canPost"
            :loading="notes.isPosting.value"
          />
        </div>
      </form>
    </div>
  </Dialog>
</template>

<style scoped>
/*
 * The board and its notes are drawn things, like the pixel art behind them, so they keep
 * their own colours in light and dark mode rather than following the theme.
 */
.cork {
  background: linear-gradient(135deg, #8a5a33, #6e4526);
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.25);
}
.cork-surface {
  background-color: #c79461;
  background-image: radial-gradient(rgb(90 55 25 / 0.35) 1px, transparent 1.5px),
    radial-gradient(rgb(255 235 200 / 0.25) 1px, transparent 1.5px);
  background-size:
    7px 7px,
    11px 11px;
  background-position:
    0 0,
    3px 5px;
  box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.35);
}

.note {
  position: relative;
  color: #3a3226;
  border-radius: 2px;
  box-shadow:
    0 1px 1px rgb(0 0 0 / 0.15),
    0 6px 12px -4px rgb(0 0 0 / 0.35);
  transition: transform 150ms ease;
}
.note:hover {
  transform: rotate(0deg) scale(1.02) !important;
}
.paper-yellow {
  background: #fff3b0;
}
.paper-pink {
  background: #ffd9e2;
}
.paper-blue {
  background: #d6ecff;
}
.paper-green {
  background: #dcf5d0;
}

.pin {
  position: absolute;
  top: 6px;
  left: 50%;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  border-radius: 9999px;
  box-shadow:
    inset -2px -2px 0 rgb(0 0 0 / 0.25),
    0 2px 2px rgb(0 0 0 / 0.35);
}
.pin::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 3px;
  width: 3px;
  height: 3px;
  border-radius: 9999px;
  background: rgb(255 255 255 / 0.7);
}
.pin-red {
  background: #e5484d;
}
.pin-blue {
  background: #3e8ed0;
}
.pin-green {
  background: #3f9b5a;
}
.pin-amber {
  background: #e7a53a;
}

.page {
  color: #3a3226;
  background-color: #fbf6e9;
  background-image: linear-gradient(
    90deg,
    transparent 22px,
    rgb(229 72 77 / 0.25) 22px 23px,
    transparent 23px
  );
  box-shadow: inset 0 0 0 1px rgb(58 50 38 / 0.12);
}
.signature + .signature {
  border-top: 1px dashed rgb(58 50 38 / 0.2);
}

.note-muted {
  color: rgb(58 50 38 / 0.6);
}

.note-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 6px;
  color: rgb(58 50 38 / 0.6);
  opacity: 0;
  transition: opacity 120ms ease;
}
.group:hover .note-remove,
.note-remove:focus-visible {
  opacity: 1;
}
.note-remove:hover {
  color: #3a3226;
  background: rgb(58 50 38 / 0.1);
}
@media (hover: none) {
  .note-remove {
    opacity: 1;
  }
}
</style>
