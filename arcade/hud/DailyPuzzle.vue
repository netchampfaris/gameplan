<script setup lang="ts">
import { Button, Dialog, TabButtons, toast } from 'frappe-ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { prefabs } from '../maps/prefabs'
import AvatarFace from './AvatarFace.vue'
import PuzzleBoard from './PuzzleBoard.vue'
import TilePicture from './TilePicture.vue'
import { answerCells, gridOf, isSolved, type Cell, type Tool } from './puzzleGrid'
import { clearProgress, progressKey, readProgress, writeProgress } from './puzzleProgress'
import { prefabPicture } from './tileImages'
import { useDailyPuzzle, type PuzzleScore } from './useDailyPuzzle'

/**
 * The daily puzzle, opened at the puzzle cabinet. The player fills the grid the clues
 * describe, against the clock; each wrong fill shows at once and counts as a mistake.
 * Solving it sends the result, which unlocks the item it draws, then shows that item and
 * everyone's results. Until then the server sends only how many people solved it.
 *
 * The parent mounts it when it opens, so it loads fresh each time.
 */

const props = defineProps<{ user: string }>()
const emit = defineEmits<{ close: [] }>()

const open = ref(true)
watch(open, (isOpen) => {
  if (!isOpen) emit('close')
})

const puzzle = useDailyPuzzle()
const data = computed(() => puzzle.data.value)

const cells = ref<Cell[]>([])
const mistakes = ref(0)
const seconds = ref(0)
const tool = ref<Tool>('fill')
const TOOLS = [
  { value: 'fill', label: 'Fill', iconLeft: 'lucide-square' },
  { value: 'mark', label: 'Mark empty', iconLeft: 'lucide-x' },
]
/** A solved grid whose result did not reach the server. */
const unsent = ref(false)
let key = ''

// Set up the board once the puzzle loads, from the saved progress if there is any.
const stopSetup = watch(data, (loaded) => {
  if (!loaded) return
  stopSetup()
  key = progressKey(props.user, loaded.day)
  clearProgress(key, loaded.result === null)
  if (loaded.result) return
  const saved = readProgress(key, loaded.rows.length ** 2)
  cells.value = saved?.cells ?? Array.from({ length: loaded.rows.length ** 2 }, () => 'empty')
  mistakes.value = saved?.mistakes ?? 0
  seconds.value = saved?.seconds ?? 0
})

const solvedHere = computed(
  () =>
    data.value !== null &&
    cells.value.length > 0 &&
    isSolved(answerCells(data.value.rows), cells.value),
)
/** The clock starts with the first move and stops once the grid is solved. */
const started = computed(() => seconds.value > 0 || cells.value.some((cell) => cell !== 'empty'))

const timer = window.setInterval(() => {
  if (started.value && !solvedHere.value && data.value?.result === null) seconds.value++
}, 1000)
onBeforeUnmount(() => window.clearInterval(timer))

watch([cells, mistakes, seconds], () => {
  if (key && data.value?.result === null && started.value) {
    writeProgress(key, { cells: cells.value, mistakes: mistakes.value, seconds: seconds.value })
  }
})

watch(solvedHere, (solved) => {
  if (solved) void send()
})

async function send() {
  const loaded = data.value
  if (!loaded || puzzle.isSubmitting.value) return
  try {
    await puzzle.submit(gridOf(cells.value, loaded.rows.length), {
      seconds: seconds.value,
      mistakes: mistakes.value,
    })
  } catch (error) {
    unsent.value = true
    toast.error(error instanceof Error ? error.message : 'Could not save your result')
    return
  }
  unsent.value = false
  clearProgress(key, false)
}

const item = computed(() => (data.value?.item ? prefabs[data.value.item] : null))

const solvedCount = computed(() => {
  const count = data.value?.count ?? 0
  if (!count) return 'Nobody has solved it yet today.'
  return `${count} ${
    count === 1 ? 'person has' : 'people have'
  } solved it today. Solve it to see their times.`
})

async function copyResult(score: PuzzleScore) {
  const text = `Arcade puzzle #${data.value?.number}\n${scoreText(score)}`
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Result copied')
  } catch {
    toast.error('Could not copy the result')
  }
}

function scoreText(score: PuzzleScore): string {
  return `Solved in ${duration(score.seconds)}, ${mistakeText(score.mistakes)}`
}

function mistakeText(count: number): string {
  if (!count) return 'no mistakes'
  return `${count} ${count === 1 ? 'mistake' : 'mistakes'}`
}

/** `m:ss`, or `h:mm:ss` from an hour. */
function duration(total: number): string {
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = String(total % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}
</script>

<template>
  <Dialog v-model:open="open" size="lg" title="Daily puzzle">
    <p v-if="!data" class="py-10 text-center text-p-base text-ink-gray-5">
      {{ puzzle.error.value ?? "Fetching today's puzzle" }}
    </p>

    <!-- Solved: the item it drew and everyone's results. -->
    <div v-else-if="data.result" class="flex flex-col gap-4">
      <div class="flex items-center gap-4 rounded-6 bg-surface-gray-1 p-4">
        <div class="flex size-24 shrink-0 items-center justify-center rounded-5 bg-surface-base">
          <TilePicture v-if="data.item" :picture="prefabPicture(data.item)" :size="80" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm text-ink-gray-5">Puzzle #{{ data.number }}</div>
          <div class="mt-1 text-lg-semibold text-ink-gray-8">{{ item?.name }}</div>
          <p class="mt-1 text-p-sm text-ink-gray-7">{{ scoreText(data.result) }}.</p>
          <p class="mt-0.5 text-p-sm text-ink-gray-5">
            Find it under Puzzles when you decorate your Home.
          </p>
        </div>
      </div>

      <section aria-label="Today's results">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm text-ink-gray-5">Today's results</div>
          <Button
            variant="ghost"
            icon-left="lucide-copy"
            label="Copy result"
            @click="data.result && copyResult(data.result)"
          />
        </div>
        <ol class="mt-2 flex max-h-60 flex-col gap-1 overflow-y-auto">
          <li
            v-for="(entry, index) in data.results"
            :key="entry.user"
            class="flex items-center gap-2.5 rounded-4 px-1 py-1"
          >
            <span class="w-5 shrink-0 text-right text-sm tabular-nums text-ink-gray-4">
              {{ index + 1 }}
            </span>
            <AvatarFace :appearance="entry.appearance" :size="24" class="shrink-0" />
            <span class="min-w-0 flex-1 truncate text-sm-medium text-ink-gray-8">
              {{ entry.user === user ? 'You' : entry.fullName }}
            </span>
            <span class="text-sm tabular-nums text-ink-gray-7">{{ duration(entry.seconds) }}</span>
            <span class="w-24 shrink-0 text-right text-sm text-ink-gray-5">
              {{ mistakeText(entry.mistakes) }}
            </span>
          </li>
        </ol>
      </section>
    </div>

    <!-- Playing. -->
    <div v-else class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3 text-sm text-ink-gray-5">
        <span>Puzzle #{{ data.number }}</span>
        <div class="flex items-center gap-4 tabular-nums">
          <span class="flex items-center gap-1.5" title="Time">
            <span class="lucide-timer size-4" aria-hidden="true" />
            {{ duration(seconds) }}
          </span>
          <span>Mistakes {{ mistakes }}</span>
        </div>
      </div>

      <PuzzleBoard
        v-model:cells="cells"
        :rows="data.rows"
        :tool="tool"
        :disabled="solvedHere"
        @mistake="mistakes++"
      />

      <div class="flex items-center justify-between gap-3">
        <TabButtons
          :model-value="tool"
          :options="TOOLS"
          @update:model-value="tool = $event === 'mark' ? 'mark' : 'fill'"
        />
        <Button
          v-if="unsent"
          variant="solid"
          label="Send result"
          :loading="puzzle.isSubmitting.value"
          @click="send"
        />
        <span v-else class="hidden text-sm text-ink-gray-5 sm:inline">
          Right-click to mark a cell empty
        </span>
      </div>

      <p class="text-p-sm text-ink-gray-5">{{ solvedCount }}</p>
    </div>
  </Dialog>
</template>
