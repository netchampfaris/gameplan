import type { Facing } from '../world/interactables'

/**
 * Where an Avatar's animations sit on a Character Generator sheet, and where they
 * land on the smaller sheet the compositor builds.
 *
 * A pack sheet is 2688x1968 with 48x96 frames, one animation per row (see the pack's
 * `Spritesheet_animations_GUIDE.png`). The game uses three of those rows, so the
 * compositor copies only them: 1152x288 instead of 2688x1968, which is 1.3 MB of
 * pixels per Avatar instead of 21 MB.
 */

export const FRAME_WIDTH = 48
export const FRAME_HEIGHT = 96
export const FRAMES_PER_DIRECTION = 6

export type AvatarState = 'idle' | 'walk' | 'sit'

/** The facings the pack draws a sitting pose for. */
export type SitFacing = 'left' | 'right'

interface SheetRow {
  state: AvatarState
  /** Row on the pack sheet. */
  sourceRow: number
  /** Facings in the order the pack lays them out along the row, 6 frames each. */
  facings: readonly Facing[]
  frameRate: number
}

// Row 0 is a preview strip, row 3 is sleeping, row 5 is a second sitting pose and row 6
// is the phone. Add a row here to use another animation; the composite grows with it.
export const SHEET_ROWS: readonly SheetRow[] = [
  { state: 'idle', sourceRow: 1, facings: ['right', 'up', 'left', 'down'], frameRate: 4 },
  { state: 'walk', sourceRow: 2, facings: ['right', 'up', 'left', 'down'], frameRate: 8 },
  { state: 'sit', sourceRow: 4, facings: ['right', 'left'], frameRate: 4 },
]

export const COMPOSITE_WIDTH = Math.max(...SHEET_ROWS.map((row) => row.facings.length)) * FRAMES_PER_DIRECTION * FRAME_WIDTH
export const COMPOSITE_HEIGHT = SHEET_ROWS.length * FRAME_HEIGHT

export interface FrameRect {
  name: string
  x: number
  y: number
}

/** Frame name on a composite texture, e.g. `walk_left_3`. */
export function frameName(state: AvatarState, facing: Facing, index: number): string {
  return `${state}_${facing}_${index}`
}

/** Every frame on a composite sheet, with its position there. */
export function compositeFrames(): FrameRect[] {
  return SHEET_ROWS.flatMap((row, rowIndex) =>
    row.facings.flatMap((facing, facingIndex) =>
      Array.from({ length: FRAMES_PER_DIRECTION }, (_, index) => ({
        name: frameName(row.state, facing, index),
        x: (facingIndex * FRAMES_PER_DIRECTION + index) * FRAME_WIDTH,
        y: rowIndex * FRAME_HEIGHT,
      })),
    ),
  )
}

/**
 * The animation to play for a state and facing. The pack only draws sitting from the
 * side, so a seat facing up or down shows the standing idle frames of that facing: the
 * furniture around the seat hides the legs.
 */
export function resolvePose(state: AvatarState, facing: Facing): { state: AvatarState; facing: Facing } {
  if (state === 'sit' && (facing === 'up' || facing === 'down')) return { state: 'idle', facing }
  return { state, facing }
}

export function frameRateOf(state: AvatarState): number {
  return SHEET_ROWS.find((row) => row.state === state)?.frameRate ?? 4
}

export function facingsOf(state: AvatarState): readonly Facing[] {
  return SHEET_ROWS.find((row) => row.state === state)?.facings ?? []
}
