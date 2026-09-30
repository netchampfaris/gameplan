import type { EmoteId } from '../net/protocol.ts'

/**
 * Where each emote sits on `UI_thinking_emotes_animation_48x48.png`: a 10x10 grid of
 * 48x48 cells, numbered row by row from 0.
 *
 * An emote is two cells stacked: a bubble on top and a trail of dots under it, the way
 * the sheet's own sample animation draws it (rows 2 and 3). The bubble grows from a dot
 * through `INTRO` and then flips between the emote's two `icon` frames.
 */

export const EMOTE_CELL = 48
export const EMOTE_SHEET_COLUMNS = 10

/** Bubble frames before the icon appears. */
export const EMOTE_INTRO = [20, 21, 22, 23] as const
/** Dot trail under the bubble; it stops on the last frame. */
export const EMOTE_TRAIL = [30, 31, 32, 33, 34, 35] as const

export interface EmoteDefinition {
  label: string
  /** The two frames the icon alternates between. */
  icon: readonly [number, number]
}

export const EMOTE_DEFINITIONS: Record<EmoteId, EmoteDefinition> = {
  heart: { label: 'Love', icon: [24, 25] },
  exclaim: { label: 'Wow', icon: [40, 41] },
  question: { label: 'Huh?', icon: [52, 53] },
  music: { label: 'Music', icon: [66, 67] },
  sleep: { label: 'Sleepy', icon: [56, 57] },
  star: { label: 'Shiny', icon: [64, 65] },
  angry: { label: 'Grr', icon: [90, 91] },
  dots: { label: 'Thinking', icon: [92, 93] },
}
