import { polar, RINGS, SECTOR_DEGREES, sectorAt, type Point } from '../world/dartboard'

/**
 * Aiming a dart by timing. A marker sweeps across the board and back until the player
 * locks it, then another sweeps up and down. The dart lands where the two cross, give or
 * take a small wobble. Both sweeps start at the same edge at the same speed every time,
 * so practice pays: a player learns the rhythm to the triple 20.
 */

/** How far each sweep goes either side of the centre, in board radii. */
export const SWEEP_SPAN = 1.2
/** How long one pass across the board takes. */
const PASS_MS = 1100
/** The wobble's spread (one standard deviation), in board radii. */
const WOBBLE = 0.03

/** Where a sweep that started `elapsed` ms ago is: from `-SWEEP_SPAN` to `SWEEP_SPAN` and back. */
export function sweepAt(elapsed: number): number {
  const phase = (Math.max(elapsed, 0) % (2 * PASS_MS)) / PASS_MS
  const along = phase < 1 ? phase : 2 - phase
  return -SWEEP_SPAN + 2 * SWEEP_SPAN * along
}

/** Where the dart lands when aimed at `aim`: a little off, never by much. */
export function wobble(aim: Point, random: () => number = Math.random): Point {
  // Box-Muller: two independent normal samples.
  const length = Math.sqrt(-2 * Math.log(1 - random())) * WOBBLE
  const angle = 2 * Math.PI * random()
  return { x: aim.x + length * Math.cos(angle), y: aim.y + length * Math.sin(angle) }
}

/** An SVG path for the ring between two distances, from one bearing to another. */
export function wedgePath(inner: number, outer: number, from: number, to: number): string {
  const a = polar(outer, from)
  const b = polar(outer, to)
  const c = polar(inner, to)
  const d = polar(inner, from)
  const large = to - from > 180 ? 1 : 0
  const f = (n: number) => n.toFixed(4)
  return [
    `M ${f(a.x)} ${f(a.y)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${f(b.x)} ${f(b.y)}`,
    `L ${f(c.x)} ${f(c.y)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${f(d.x)} ${f(d.y)}`,
    'Z',
  ].join(' ')
}

/** An SVG path for a circle round the centre. */
function circlePath(radius: number): string {
  return `M 0 ${-radius} A ${radius} ${radius} 0 1 1 0 ${radius} A ${radius} ${radius} 0 1 1 0 ${-radius} Z`
}

/**
 * The SVG path of the scoring area a point is in, or null for a miss. Fill it with
 * `fill-rule="evenodd"`: the outer bull is a ring round the bull.
 */
export function areaPath(point: Point): string | null {
  const distance = Math.hypot(point.x, point.y)
  if (distance > RINGS.doubleOuter) return null
  if (distance <= RINGS.bull) return circlePath(RINGS.bull)
  if (distance <= RINGS.outerBull) return `${circlePath(RINGS.outerBull)} ${circlePath(RINGS.bull)}`
  const edges = [RINGS.outerBull, RINGS.tripleInner, RINGS.tripleOuter, RINGS.doubleInner, RINGS.doubleOuter]
  const index = edges.findIndex((edge, i) => i > 0 && distance <= edge)
  const centre = sectorAt(point) * SECTOR_DEGREES
  return wedgePath(edges[index - 1] ?? 0, edges[index] ?? 1, centre - SECTOR_DEGREES / 2, centre + SECTOR_DEGREES / 2)
}
