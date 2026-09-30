import type { Cell } from './puzzleGrid'

/**
 * An unfinished daily puzzle, kept in localStorage so closing the dialog or reloading
 * the page does not lose it. The browser keeps one: opening a puzzle drops the entries of
 * other days and other players. Storage can be missing or full (a private window), so
 * every call is guarded and the puzzle still plays without it.
 */

export interface PuzzleProgress {
  cells: Cell[]
  mistakes: number
  seconds: number
}

const PREFIX = 'arcade:puzzle:'
const CODES: Record<Cell, string> = { empty: '.', filled: '#', marked: 'x', wrong: '!' }
const CELLS = Object.fromEntries(Object.entries(CODES).map(([cell, code]) => [code, cell])) as Record<
  string,
  Cell
>

export function progressKey(user: string, day: string): string {
  return `${PREFIX}${user}:${day}`
}

export function readProgress(key: string, cellCount: number): PuzzleProgress | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const saved: unknown = JSON.parse(raw)
    if (typeof saved !== 'object' || saved === null) return null
    const { cells, mistakes, seconds } = saved as Record<string, unknown>
    if (typeof cells !== 'string' || cells.length !== cellCount) return null
    if (typeof mistakes !== 'number' || typeof seconds !== 'number') return null
    const decoded = [...cells].map((code) => CELLS[code])
    if (decoded.some((cell) => cell === undefined)) return null
    return { cells: decoded as Cell[], mistakes, seconds }
  } catch {
    return null
  }
}

export function writeProgress(key: string, progress: PuzzleProgress) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        cells: progress.cells.map((cell) => CODES[cell]).join(''),
        mistakes: progress.mistakes,
        seconds: progress.seconds,
      }),
    )
  } catch {
    // No storage: the progress lasts until the dialog closes.
  }
}

/** Drops every saved puzzle but `key`, and `key` too unless `keep`. */
export function clearProgress(key: string, keep: boolean) {
  try {
    const stale = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(
      (other): other is string => other !== null && other.startsWith(PREFIX) && (other !== key || !keep),
    )
    for (const other of stale) localStorage.removeItem(other)
  } catch {
    // No storage, nothing to clear.
  }
}
