/**
 * The dartboard: where each score is on it. The darts dialog (`hud/Darts.vue`) scores a
 * throw with it, and the game (`objects/Dartboard.ts`) uses it to draw the board and to
 * stick someone else's dart where their score is.
 *
 * Points are in board radii from the centre, x to the right and y down, so the outside of
 * the double ring is at distance 1. The numbers are a standard board's; the rings are
 * wider than a real board's, so a triple is hard but not out of reach.
 */

/** The numbers around the board, clockwise from the top. */
export const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const

/** Where each ring starts and ends, in board radii. */
export const RINGS = {
  bull: 0.07,
  outerBull: 0.15,
  tripleInner: 0.55,
  tripleOuter: 0.63,
  doubleInner: 0.91,
  doubleOuter: 1,
} as const

/** Each sector's width, in degrees. Sector 0 (the 20) is centred on the top. */
export const SECTOR_DEGREES = 360 / SECTORS.length

export type Ring = 'bull' | 'outer-bull' | 'single' | 'double' | 'triple' | 'miss'

export interface Hit {
  ring: Ring
  /** The sector's number, or null for the bulls and a miss. */
  number: number | null
  score: number
}

export interface Point {
  x: number
  y: number
}

const MULTIPLIER = { single: 1, double: 2, triple: 3 } as const

/** Degrees clockwise from the top, from 0 up to 360. */
function bearing({ x, y }: Point): number {
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
}

/** The index in `SECTORS` of the sector a point is in. */
export function sectorAt(point: Point): number {
  return Math.floor((bearing(point) + SECTOR_DEGREES / 2) / SECTOR_DEGREES) % SECTORS.length
}

/** What a dart scores where it lands. */
export function scoreAt(point: Point): Hit {
  const distance = Math.hypot(point.x, point.y)
  if (distance <= RINGS.bull) return { ring: 'bull', number: null, score: 50 }
  if (distance <= RINGS.outerBull) return { ring: 'outer-bull', number: null, score: 25 }
  if (distance > RINGS.doubleOuter) return { ring: 'miss', number: null, score: 0 }
  const number = SECTORS[sectorAt(point)] ?? 20
  const ring =
    distance > RINGS.doubleInner
      ? 'double'
      : distance > RINGS.tripleInner && distance <= RINGS.tripleOuter
        ? 'triple'
        : 'single'
  return { ring, number, score: number * MULTIPLIER[ring] }
}

/** How a hit reads: "Triple 20", "Double 7", "18", "Bull", "Outer bull" or "Miss". */
export function hitName(hit: Hit): string {
  switch (hit.ring) {
    case 'bull':
      return 'Bull'
    case 'outer-bull':
      return 'Outer bull'
    case 'miss':
      return 'Miss'
    case 'single':
      return String(hit.number)
    case 'double':
      return `Double ${hit.number}`
    case 'triple':
      return `Triple ${hit.number}`
  }
}

/** The point at a distance from the centre, `degrees` clockwise from the top. */
export function polar(distance: number, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180
  return { x: distance * Math.sin(radians), y: -distance * Math.cos(radians) }
}

/**
 * A spot on the board that scores `score`, for drawing a dart that someone else threw:
 * only its score travels. A score several spots make (18 is a single 18, a double 9 or a
 * triple 6) picks one of them.
 */
export function pointFor(score: number, random: () => number = Math.random): Point {
  const between = (low: number, high: number) => low + (high - low) * (0.2 + 0.6 * random())
  const anywhere = () => random() * 360
  if (score === 50) return polar(between(0, RINGS.bull), anywhere())
  if (score === 25) return polar(between(RINGS.bull, RINGS.outerBull), anywhere())

  const spots: { index: number; low: number; high: number }[] = []
  SECTORS.forEach((number, index) => {
    if (number === score) {
      spots.push({ index, low: RINGS.outerBull, high: RINGS.tripleInner })
      spots.push({ index, low: RINGS.tripleOuter, high: RINGS.doubleInner })
    }
    if (number * 2 === score) spots.push({ index, low: RINGS.doubleInner, high: RINGS.doubleOuter })
    if (number * 3 === score) spots.push({ index, low: RINGS.tripleInner, high: RINGS.tripleOuter })
  })
  const spot = spots[Math.floor(random() * spots.length)]
  // A miss, or a score no dart makes: just off the board.
  if (!spot) return polar(between(RINGS.doubleOuter, 1.15), anywhere())
  const degrees = spot.index * SECTOR_DEGREES + (random() - 0.5) * SECTOR_DEGREES * 0.6
  return polar(between(spot.low, spot.high), degrees)
}
