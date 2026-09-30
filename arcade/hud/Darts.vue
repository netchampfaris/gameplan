<script setup lang="ts">
import { Button, Dialog, toast } from 'frappe-ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { DartThrow } from '../bridge'
import { hitName, scoreAt, type Hit, type Point } from '../world/dartboard'
import AvatarFace from './AvatarFace.vue'
import DartBoard from './DartBoard.vue'
import { sweepAt, wobble } from './dartAim'
import { useDarts, type DartsPlayer } from './useDarts'

/**
 * Darts, opened at the darts line. Each dart takes three presses of Space, or taps on
 * the board: one starts a marker sweeping across, the next locks it and starts one
 * sweeping up and down, the last locks that and throws. The dart lands where the two
 * cross, give or take a small wobble (`dartAim.ts`).
 *
 * The dialog scores the dart and sends it; the server keeps to 3 darts a day. Beside the
 * board: this week's leaderboard and last week's winners.
 *
 * The dialog sits at the top of the screen, so the board stays put while the leaderboard
 * beside or below it grows. The parent mounts it when it opens, so it loads fresh each time.
 */

const props = defineProps<{
  user: string
  /** The last dart someone else in the Room threw; the leaderboard reloads for each. */
  lastDart: DartThrow | null
}>()
const emit = defineEmits<{ close: []; thrown: [score: number] }>()

const open = ref(true)
watch(open, (isOpen) => {
  if (!isOpen) emit('close')
})

const darts = useDarts()
const data = computed(() => darts.data.value)

type Aim =
  | { phase: 'ready' }
  | { phase: 'across'; start: number }
  | { phase: 'height'; x: number; start: number }
  | { phase: 'landed'; hit: Hit }

const aim = ref<Aim>({ phase: 'ready' })
/** Where this visit's darts landed, oldest first. The server keeps only their scores. */
const landed = ref<Point[]>([])
const now = ref(performance.now())

const dartsLeft = computed(() =>
  data.value ? Math.max(data.value.throwsPerDay - data.value.today.length, 0) : 0,
)
const canThrow = computed(() => dartsLeft.value > 0 && !darts.isThrowing.value)
const aiming = computed(() => aim.value.phase === 'across' || aim.value.phase === 'height')

const aimX = computed(() => {
  const current = aim.value
  if (current.phase === 'across') return sweepAt(now.value - current.start)
  if (current.phase === 'height') return current.x
  return null
})
const aimY = computed(() => {
  const current = aim.value
  return current.phase === 'height' ? sweepAt(now.value - current.start) : null
})

// Move the markers every frame while aiming.
let frame = 0
function tick(time: number) {
  now.value = time
  frame = aiming.value ? requestAnimationFrame(tick) : 0
}
watch(aiming, (isAiming) => {
  if (isAiming && !frame) frame = requestAnimationFrame(tick)
})

/**
 * One press of Space, a tap on the board or the button. `time` is the event's own time
 * stamp, so a busy frame does not move where the marker stops.
 */
function press(time: number) {
  const current = aim.value
  if (current.phase === 'across') {
    aim.value = { phase: 'height', x: sweepAt(time - current.start), start: time }
  } else if (current.phase === 'height') {
    const point = wobble({ x: current.x, y: sweepAt(time - current.start) })
    const hit = scoreAt(point)
    landed.value = [...landed.value, point]
    aim.value = { phase: 'landed', hit }
    void send(hit.score)
  } else if (canThrow.value) {
    now.value = time
    aim.value = { phase: 'across', start: time }
  }
}

async function send(score: number) {
  try {
    await darts.throwDart(score)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not record your dart')
    landed.value = landed.value.slice(0, -1)
    aim.value = { phase: 'ready' }
    void darts.reload()
    return
  }
  emit('thrown', score)
}

function onKey(event: KeyboardEvent) {
  if (event.key !== ' ') return
  // Space throws, and must not also press a focused button.
  event.preventDefault()
  event.stopPropagation()
  if (event.type === 'keydown' && !event.repeat) press(event.timeStamp)
}
window.addEventListener('keydown', onKey, true)
window.addEventListener('keyup', onKey, true)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  window.removeEventListener('keyup', onKey, true)
  cancelAnimationFrame(frame)
})

watch(
  () => props.lastDart,
  () => {
    if (!darts.isThrowing.value) void darts.reload()
  },
)

const buttonLabel = computed(() => {
  if (aim.value.phase === 'across') return 'Stop'
  if (aim.value.phase === 'height') return 'Throw'
  return aim.value.phase === 'landed' ? 'Next dart' : 'Aim'
})

const status = computed(() => {
  const current = aim.value
  if (current.phase === 'across') return 'Stop the marker over your target'
  if (current.phase === 'height') return 'Now stop it at the right height'
  if (!dartsLeft.value) return 'That is all your darts for today. Come back tomorrow.'
  return 'Press Space or tap the board to aim'
})

const todayTotal = computed(() => data.value?.today.reduce((sum, score) => sum + score, 0) ?? 0)
const slots = computed(() =>
  Array.from(
    { length: data.value?.throwsPerDay ?? 3 },
    (_, index) => data.value?.today[index] ?? null,
  ),
)

const weekDarts = computed(() => (data.value?.throwsPerDay ?? 3) * 7)

/** "Triple 20: 60", "Bull: 50", or for a single just its score, "6". */
function resultText(hit: Hit): string {
  return hit.ring === 'single' || hit.ring === 'miss'
    ? hitName(hit)
    : `${hitName(hit)}: ${hit.score}`
}

/** `2026-W40` as "Week 40". */
function weekName(week: string): string {
  return `Week ${Number(week.split('-W')[1])}`
}

function winsText(wins: number): string {
  return `${wins} ${wins === 1 ? 'win' : 'wins'}`
}

function nameOf(player: DartsPlayer): string {
  return player.user === props.user ? 'You' : player.fullName
}

const lastWeekText = computed(() => {
  const week = data.value?.lastWeek
  if (!week) return 'Nobody played last week.'
  if (!week.winners.length) return 'Nobody scored last week.'
  const tied = week.winners.length > 1
  if (!week.settled) return `${tied ? 'Tied' : 'Leading'} on ${week.topScore}, not final yet.`
  return tied
    ? `Tied on ${week.topScore}. Each winner gets the trophy.`
    : `Won with ${week.topScore}.`
})
</script>

<template>
  <Dialog v-model:open="open" size="3xl" position="top" title="Darts">
    <p v-if="!data" class="py-10 text-center text-p-base text-ink-gray-5">
      {{ darts.error.value ?? 'Fetching the leaderboard' }}
    </p>

    <div v-else class="grid gap-6 sm:grid-cols-[minmax(0,1fr)_15rem]">
      <section aria-label="Throw" class="flex flex-col items-center gap-3">
        <div
          class="w-full max-w-80 touch-manipulation rounded-full"
          :class="canThrow || aiming ? 'cursor-crosshair' : ''"
          @pointerdown.prevent="press($event.timeStamp)"
        >
          <DartBoard
            :aim-x="aimX"
            :aim-y="aimY"
            :x-locked="aim.phase === 'height'"
            :darts="landed"
          />
        </div>

        <div class="flex h-7 items-center text-center" aria-live="polite">
          <span v-if="aim.phase === 'landed'" class="text-2xl-semibold text-ink-gray-9">
            {{ resultText(aim.hit) }}
          </span>
          <span v-else class="text-p-base text-ink-gray-7">{{ status }}</span>
        </div>

        <div class="flex w-full max-w-80 items-center justify-between gap-3">
          <div class="flex items-center gap-1.5" aria-label="Your darts today">
            <span
              v-for="(score, index) in slots"
              :key="index"
              class="flex h-7 min-w-9 items-center justify-center rounded-4 px-1.5 text-sm-medium tabular-nums"
              :class="
                score === null
                  ? 'bg-surface-gray-1 text-ink-gray-4'
                  : 'bg-surface-gray-3 text-ink-gray-8'
              "
            >
              {{ score ?? index + 1 }}
            </span>
            <span class="ml-1.5 text-sm tabular-nums text-ink-gray-5">Today {{ todayTotal }}</span>
          </div>
          <Button
            v-if="aiming || dartsLeft"
            variant="solid"
            :label="buttonLabel"
            :disabled="!aiming && !canThrow"
            :loading="darts.isThrowing.value"
            @click="press($event.timeStamp)"
          />
        </div>
      </section>

      <div class="flex min-w-0 flex-col gap-5">
        <section aria-label="This week">
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-sm text-ink-gray-5">This week</span>
            <span class="text-sm text-ink-gray-4">{{ weekName(data.week) }}</span>
          </div>
          <p v-if="!data.standings.length" class="mt-2 text-p-sm text-ink-gray-5">
            Nobody has thrown this week yet.
          </p>
          <ol v-else class="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto">
            <li
              v-for="(row, index) in data.standings"
              :key="row.user"
              class="flex items-center gap-2 rounded-4 px-1 py-1"
            >
              <span class="w-4 shrink-0 text-right text-sm tabular-nums text-ink-gray-4">
                {{ index + 1 }}
              </span>
              <AvatarFace :appearance="row.appearance" :size="24" class="shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm-medium text-ink-gray-8">{{ nameOf(row) }}</div>
                <div v-if="row.wins" class="text-xs text-ink-gray-5">{{ winsText(row.wins) }}</div>
              </div>
              <div class="shrink-0 text-right">
                <div class="text-sm-medium tabular-nums text-ink-gray-8">{{ row.total }}</div>
                <div class="text-xs tabular-nums text-ink-gray-5" title="Darts thrown this week">
                  {{ row.throws }}/{{ weekDarts }}
                </div>
              </div>
            </li>
          </ol>
        </section>

        <section aria-label="Last week">
          <div class="text-sm text-ink-gray-5">Last week</div>
          <ul v-if="data.lastWeek?.winners.length" class="mt-2 flex flex-col gap-1">
            <li
              v-for="winner in data.lastWeek.winners"
              :key="winner.user"
              class="flex items-center gap-2 px-1 py-1"
            >
              <span class="lucide-trophy size-4 shrink-0 text-ink-gray-5" aria-hidden="true" />
              <AvatarFace :appearance="winner.appearance" :size="24" class="shrink-0" />
              <span class="min-w-0 flex-1 truncate text-sm-medium text-ink-gray-8">
                {{ nameOf(winner) }}
              </span>
              <span v-if="winner.wins" class="shrink-0 text-xs text-ink-gray-5">
                {{ winsText(winner.wins) }}
              </span>
            </li>
          </ul>
          <p class="mt-1.5 text-p-sm text-ink-gray-5">{{ lastWeekText }}</p>
        </section>
      </div>
    </div>
  </Dialog>
</template>
