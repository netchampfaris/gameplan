import type { InteractionHandler } from './registry'

/**
 * The puzzle cabinet in the Common Room opens the daily puzzle (`hud/DailyPuzzle.vue`).
 * The HUD loads it and sends the result; the game only opens it.
 */
export const puzzle: InteractionHandler = {
  label: 'Play the daily puzzle',
  interact(_target, { bridge }) {
    bridge.state.puzzleOpen = true
  },
}
