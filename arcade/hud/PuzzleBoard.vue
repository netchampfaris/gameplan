<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { answerCells, clue, columnsOf, rowsOf, type Cell, type Tool } from './puzzleGrid'

/**
 * The daily puzzle's grid with its clues. A click uses the chosen tool, a right click
 * always marks; dragging from a cell does the same to every cell dragged over. A fill the
 * answer does not have becomes a wrong cell at once, and the drag stops there.
 */

const props = defineProps<{
  /** The answer, rows of `#` and `.`. */
  rows: string[]
  tool: Tool
  disabled?: boolean
}>()
const cells = defineModel<Cell[]>('cells', { required: true })
const emit = defineEmits<{ mistake: [] }>()

const size = computed(() => props.rows.length)
const answer = computed(() => answerCells(props.rows))
const rowClues = computed(() => rowsOf(answer.value, size.value).map(clue))
const columnClues = computed(() => columnsOf(answer.value, size.value).map(clue))
/** A line is done when all of its filled cells are found; its clue fades. */
const rowsDone = computed(() =>
  lineDone(rowsOf(answer.value, size.value), rowsOf(cells.value, size.value)),
)
const columnsDone = computed(() =>
  lineDone(columnsOf(answer.value, size.value), columnsOf(cells.value, size.value)),
)

function lineDone(answers: boolean[][], lines: Cell[][]): boolean[] {
  return answers.map((line, index) =>
    line.every((filled, at) => !filled || lines[index]?.[at] === 'filled'),
  )
}

/** What a press or drag does, decided by the cell it started on. */
type Action = 'fill' | 'mark' | 'clear'
let dragging: Action | null = null

function actionFor(cell: Cell, tool: Tool): Action | null {
  if (tool === 'fill') return cell === 'empty' ? 'fill' : null
  if (cell === 'empty') return 'mark'
  return cell === 'marked' ? 'clear' : null
}

/** Applies `action` to a cell it fits. False when it was a wrong fill. */
function apply(index: number, action: Action): boolean {
  const cell = cells.value[index]
  if (cell === undefined) return true
  let next: Cell
  if (action === 'fill' && cell === 'empty') next = answer.value[index] ? 'filled' : 'wrong'
  else if (action === 'mark' && cell === 'empty') next = 'marked'
  else if (action === 'clear' && cell === 'marked') next = 'empty'
  else return true
  const updated = [...cells.value]
  updated[index] = next
  cells.value = updated
  if (next !== 'wrong') return true
  emit('mistake')
  return false
}

function cellAt(x: number, y: number): number | null {
  const target = document.elementFromPoint(x, y)
  const index =
    target instanceof HTMLElement
      ? target.closest<HTMLElement>('[data-cell]')?.dataset.cell
      : undefined
  return index === undefined ? null : Number(index)
}

function onPointerDown(event: PointerEvent, index: number) {
  if (props.disabled || (event.button !== 0 && event.button !== 2)) return
  event.preventDefault()
  const cell = cells.value[index]
  const action = cell ? actionFor(cell, event.button === 2 ? 'mark' : props.tool) : null
  if (!action) return
  dragging = apply(index, action) ? action : null
}

function onPointerMove(event: PointerEvent) {
  if (!dragging || props.disabled) return
  const index = cellAt(event.clientX, event.clientY)
  if (index !== null && !apply(index, dragging)) dragging = null
}

function stopDragging() {
  dragging = null
}

/** Enter or space uses the chosen tool on the focused cell. */
function onKey(index: number) {
  const cell = cells.value[index]
  const action = cell && !props.disabled ? actionFor(cell, props.tool) : null
  if (action) apply(index, action)
}

window.addEventListener('pointerup', stopDragging)
window.addEventListener('pointercancel', stopDragging)
onBeforeUnmount(() => {
  window.removeEventListener('pointerup', stopDragging)
  window.removeEventListener('pointercancel', stopDragging)
})

const LABELS: Record<Cell, string> = {
  empty: 'empty',
  filled: 'filled',
  marked: 'marked empty',
  wrong: 'wrong, empty',
}

/** The cells row by row, each with its index in `cells`. */
const grid = computed(() =>
  rowsOf(
    cells.value.map((cell, index) => ({ cell, index })),
    size.value,
  ),
)

function cellClass(cell: Cell, index: number): string[] {
  const x = index % size.value
  const y = Math.floor(index / size.value)
  const last = size.value - 1
  return [
    // The grid's edge, and a heavier line every five cells, as on paper nonograms.
    x % 5 === 4 || x === last ? 'border-r-outline-gray-5' : 'border-r-outline-gray-2',
    y % 5 === 4 || y === last ? 'border-b-outline-gray-5' : 'border-b-outline-gray-2',
    x === 0 ? 'border-l border-l-outline-gray-5' : '',
    y === 0 ? 'border-t border-t-outline-gray-5' : '',
    cell === 'filled'
      ? 'bg-surface-gray-9'
      : cell === 'wrong'
        ? 'wrong bg-surface-gray-3 text-ink-gray-8'
        : cell === 'marked'
          ? 'bg-surface-base text-ink-gray-4'
          : props.disabled
            ? 'bg-surface-base'
            : 'bg-surface-base hover:bg-surface-gray-2',
  ]
}
</script>

<template>
  <div class="board select-none" @contextmenu.prevent>
    <div />
    <!-- Column clues, read top to bottom. -->
    <div
      v-for="(runs, x) in columnClues"
      :key="`c${x}`"
      class="flex flex-col items-center justify-end gap-0.5 pb-1 text-sm-medium tabular-nums"
      :class="columnsDone[x] ? 'text-ink-gray-4' : 'text-ink-gray-8'"
      :aria-label="`Column ${x + 1}: ${runs.join(' ') || '0'}`"
    >
      <span v-for="(run, at) in runs.length ? runs : [0]" :key="at">{{ run }}</span>
    </div>

    <template v-for="(row, y) in grid" :key="`r${y}`">
      <!-- Row clues, read left to right. -->
      <div
        class="flex items-center justify-end gap-1.5 pr-1.5 text-sm-medium tabular-nums"
        :class="rowsDone[y] ? 'text-ink-gray-4' : 'text-ink-gray-8'"
        :aria-label="`Row ${y + 1}: ${rowClues[y]?.join(' ') || '0'}`"
      >
        <span v-for="(run, at) in rowClues[y]?.length ? rowClues[y] : [0]" :key="at">{{
          run
        }}</span>
      </div>
      <button
        v-for="{ cell, index } in row"
        :key="index"
        type="button"
        :data-cell="index"
        class="cell flex items-center justify-center border-b border-r"
        :class="cellClass(cell, index)"
        :aria-label="`Row ${y + 1}, column ${(index % size) + 1}, ${LABELS[cell]}`"
        :disabled="disabled"
        @pointerdown="onPointerDown($event, index)"
        @pointermove="onPointerMove"
        @keydown.enter.prevent="onKey(index)"
        @keydown.space.prevent="onKey(index)"
      >
        <span
          v-if="cell === 'marked' || cell === 'wrong'"
          class="lucide-x size-[60%]"
          aria-hidden="true"
        />
      </button>
    </template>
  </div>
</template>

<style scoped>
.board {
  /* Ten cells and the row clues fit a 375px phone; the cells stop growing at 32px. */
  --cell: min(32px, calc((100vw - 150px) / 10));
  display: grid;
  grid-template-columns: auto repeat(v-bind(size), var(--cell));
  grid-auto-rows: auto;
  justify-content: center;
  touch-action: none;
}
.cell {
  width: var(--cell);
  height: var(--cell);
}
.cell:disabled {
  cursor: default;
}
.wrong {
  animation: shake 240ms ease-in-out;
}
@keyframes shake {
  25% {
    transform: translateX(-2px);
  }
  75% {
    transform: translateX(2px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .wrong {
    animation: none;
  }
}
</style>
