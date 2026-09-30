/**
 * The rules of the daily puzzle, a nonogram: fill the cells the clues call for. The
 * answer is rows of `#` (filled) and `.` (empty); the player's grid is a flat list of
 * cells, row by row.
 */

/**
 * `marked` is a cell the player marked empty. `wrong` is one they tried to fill that is
 * empty in the answer: it counts as a mistake and stays marked.
 */
export type Cell = 'empty' | 'filled' | 'marked' | 'wrong'

export type Tool = 'fill' | 'mark'

/** The lengths of the runs of filled cells in a line, e.g. `##..#` is `[2, 1]`. */
export function clue(line: readonly boolean[]): number[] {
  const runs: number[] = []
  let run = 0
  for (const filled of [...line, false]) {
    if (filled) run++
    else if (run) {
      runs.push(run)
      run = 0
    }
  }
  return runs
}

export function rowsOf<T>(cells: readonly T[], size: number): T[][] {
  return Array.from({ length: size }, (_, y) => cells.slice(y * size, (y + 1) * size))
}

export function columnsOf<T>(cells: readonly T[], size: number): T[][] {
  return Array.from({ length: size }, (_, x) =>
    Array.from({ length: size }, (_, y) => cells[y * size + x] as T),
  )
}

/** The answer as one boolean per cell, row by row. */
export function answerCells(rows: readonly string[]): boolean[] {
  return rows.flatMap((row) => [...row].map((cell) => cell === '#'))
}

/** Every cell the answer fills is filled. A wrong cell can never be filled, so that is the answer. */
export function isSolved(answer: readonly boolean[], cells: readonly Cell[]): boolean {
  return answer.every((filled, index) => filled === (cells[index] === 'filled'))
}

/** The player's grid in the answer's form, which the server checks. */
export function gridOf(cells: readonly Cell[], size: number): string[] {
  return rowsOf(cells, size).map((row) => row.map((cell) => (cell === 'filled' ? '#' : '.')).join(''))
}
