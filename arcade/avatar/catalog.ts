/**
 * The Character Generator parts an Avatar is built from, and the files behind them.
 *
 * An Avatar is five layers drawn in this order: body, eyes, outfit, hairstyle and an
 * optional accessory. Every layer is a full LimeZu sheet on the same 48x96 frame grid.
 * The catalog is a curated subset of the pack: all bodies and eyes, and the outfits,
 * hairstyles and accessories that suit an office team, each with every colour variant.
 *
 * Parts are identified by the numbers in the pack's file names (`Outfit_05_48x48_02.png`
 * is outfit style 5, colour 2), so a saved appearance stays valid if the curated list
 * changes order. The swatch colours were sampled from each variant's front-facing frame.
 *
 * Kept free of Vite-only and Phaser imports: `config/packFiles.ts` builds its
 * `avatarParts` group from this file, and the Node publish script and bot import it.
 */

export interface ColoredPart {
  /** The style number from the pack file name. */
  style: number
  /** The colour variant number from the pack file name, starting at 1. */
  color: number
}

export interface AvatarAppearance {
  /** Body number, 1 to 9. The body sets the skin tone. */
  body: number
  /** Eyes number, 1 to 7. */
  eyes: number
  outfit: ColoredPart
  hairstyle: ColoredPart
  accessory?: ColoredPart
}

export interface StyleEntry {
  style: number
  /** Swatch per colour variant. Variant `n` is `colors[n - 1]`. */
  colors: string[]
}

export interface AccessoryEntry extends StyleEntry {
  /** The name part of the file, e.g. `Detective_Hat`. */
  file: string
}

const ROOT = '2_Characters/Character_Generator'

const BODIES = ['#bf8b78', '#ffcbb0', '#ffb893', '#bb845c', '#cdb57a', '#d4cabb', '#f0ae80', '#e6b8d7', '#bab8d7']
const EYES = ['#674d49', '#568d61', '#959d58', '#6c6e85', '#956020', '#3b7aa2', '#5ed6f2']
const OUTFITS: StyleEntry[] = [
  { style: 1, colors: ['#805e8e', '#a6b6e9', '#bfa690', '#d93232', '#3e6d5e', '#d0614c', '#d061b1', '#95763e', '#afd3e1', '#903f60'] },
  { style: 2, colors: ['#a2394b', '#90444c', '#a99244', '#4497a9'] },
  { style: 3, colors: ['#565972', '#9c7a9d', '#397a9d', '#936456'] },
  { style: 4, colors: ['#9abd8f', '#b3754a', '#606c7a'] },
  { style: 5, colors: ['#6c6e85', '#4d6e85', '#4d695a', '#dc9b5a', '#efdfe3'] },
  { style: 6, colors: ['#6c6e85', '#6c6e6f', '#6c5a6f', '#4f7598'] },
  { style: 7, colors: ['#6c6e85', '#bb814b', '#18838a', '#bb718a'] },
  { style: 9, colors: ['#e63f38', '#e6ad38', '#5aada7'] },
  { style: 10, colors: ['#9094aa', '#6c95b7', '#a63249', '#897478', '#89b578'] },
  { style: 11, colors: ['#be9fcc', '#be9f7c', '#beb6cc', '#9a8c3a'] },
  { style: 12, colors: ['#6c6e85', '#a25a4a', '#69895f'] },
  { style: 13, colors: ['#50a7e8', '#b4a7e8', '#5aa77e', '#b1637e'] },
  { style: 14, colors: ['#647e99', '#94a7ba', '#827e99', '#986e59', '#98ab59'] },
  { style: 17, colors: ['#437e8f', '#8992d3', '#89ccd3'] },
  { style: 18, colors: ['#c37759', '#b18a74', '#c35059', '#437696'] },
  { style: 19, colors: ['#4280dd', '#787d93', '#8d94b2', '#cd94b2'] },
  { style: 20, colors: ['#4d5988', '#b7bccf', '#3eab7e'] },
  { style: 21, colors: ['#645d9a', '#6a7598', '#3a7c9a', '#d05c4b'] },
  { style: 24, colors: ['#0092e3', '#6dcfc6', '#009292', '#ad83c6'] },
  { style: 25, colors: ['#0092e3', '#9ba3a7', '#ad957c', '#9d4c6d', '#ffdfec'] },
]
const HAIRSTYLES: StyleEntry[] = [
  { style: 1, colors: ['#ab6736', '#8a6552', '#724a40', '#5b4643', '#898887', '#706663', '#535662'] },
  { style: 2, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
  { style: 3, colors: ['#cc9659', '#ba8d5e', '#866150', '#6f5449', '#a2a2a0', '#898171', '#647e99'] },
  { style: 4, colors: ['#ab6736', '#8a6552', '#724a40', '#5b4643', '#898887', '#706663', '#535662'] },
  { style: 5, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
  { style: 6, colors: ['#cc9659', '#ba8d5e', '#866150', '#6f5449', '#a2a2a0', '#898171', '#647e99'] },
  { style: 7, colors: ['#ab6736', '#8a6552', '#724a40', '#5b4643', '#898887', '#706663', '#535662'] },
  { style: 8, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
  { style: 9, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
  { style: 10, colors: ['#ab6736', '#8a6552', '#724a40', '#5b4643', '#898887', '#706663', '#535662'] },
  { style: 12, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
  { style: 13, colors: ['#ab6736', '#8a6552', '#724a40', '#5b4643', '#898887', '#706663', '#535662'] },
  { style: 14, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
  { style: 15, colors: ['#ab6736', '#8a6552', '#724a40', '#5b4643', '#898887', '#706663', '#535662'] },
  { style: 16, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
  { style: 17, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
  { style: 18, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
  { style: 19, colors: ['#ab6736', '#8a6552', '#724a40', '#5b4643', '#898887', '#706663', '#535662'] },
  { style: 21, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
  { style: 26, colors: ['#b37b3f', '#957350', '#805449', '#674d49', '#969695', '#79746f', '#566279'] },
]
const ACCESSORIES: AccessoryEntry[] = [
  { style: 3, file: 'Backpack', colors: ['#8a6d58', '#bda766', '#74b453', '#3cb074', '#e63f38', '#4995e3', '#e88dad', '#9da3b7', '#8555c5', '#50a7e8'] },
  { style: 4, file: 'Snapback', colors: ['#e63f38', '#4995e3', '#74b453', '#9da3b7', '#e88dad', '#bda766'] },
  { style: 8, file: 'Detective_Hat', colors: ['#c37759', '#c36459', '#b99b8f'] },
  { style: 11, file: 'Beanie', colors: ['#676e8d', '#a59992', '#a57992', '#57969d', '#a0574c'] },
  { style: 12, file: 'Mustache', colors: ['#8a6552', '#975426', '#ac7e1e', '#b3ab9c', '#7182a2'] },
  { style: 13, file: 'Beard', colors: ['#6f5449', '#8a4830', '#a16a3b', '#a69e97', '#666e8c'] },
  { style: 15, file: 'Glasses', colors: ['#58616f', '#c7405a', '#b81ea4', '#40a2c7', '#1eb82f', '#46465e'] },
  { style: 16, file: 'Monocle', colors: ['#795237', '#965752', '#526096'] },
  { style: 18, file: 'Chef', colors: ['#ebe4f2', '#d2c9c6', '#9a9492'] },
  { style: 19, file: 'Party_Cone', colors: ['#e63f38', '#cf3f75', '#4aaed9', '#c4e1ee'] },
]

export const AvatarCatalog = {
  /** Skin tone swatch per body. Body `n` is `bodies[n - 1]`. */
  bodies: BODIES,
  /** Eye colour swatch per eyes layer. */
  eyes: EYES,
  outfits: OUTFITS,
  hairstyles: HAIRSTYLES,
  accessories: ACCESSORIES,
}

export type ColoredPartKind = 'outfit' | 'hairstyle' | 'accessory'

const STYLES: Record<ColoredPartKind, StyleEntry[]> = {
  outfit: OUTFITS,
  hairstyle: HAIRSTYLES,
  accessory: ACCESSORIES,
}

export function stylesOf(kind: ColoredPartKind): StyleEntry[] {
  return STYLES[kind]
}

export function accessoryLabel(entry: AccessoryEntry): string {
  const words = entry.file.replaceAll('_', ' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const pad = (n: number) => n.toString().padStart(2, '0')

/** Pack-relative paths of an appearance's layers, in draw order. */
export function appearanceLayerFiles(appearance: AvatarAppearance): string[] {
  const files = [
    `${ROOT}/Bodies/48x48/Body_48x48_${pad(appearance.body)}.png`,
    `${ROOT}/Eyes/48x48/Eyes_48x48_${pad(appearance.eyes)}.png`,
    outfitFile(appearance.outfit),
    hairstyleFile(appearance.hairstyle),
  ]
  if (appearance.accessory) {
    const entry = ACCESSORIES.find((item) => item.style === appearance.accessory?.style)
    if (entry) files.push(accessoryFile(entry, appearance.accessory.color))
  }
  return files
}

function outfitFile({ style, color }: ColoredPart) {
  return `${ROOT}/Outfits/48x48/Outfit_${pad(style)}_48x48_${pad(color)}.png`
}

function hairstyleFile({ style, color }: ColoredPart) {
  return `${ROOT}/Hairstyles/48x48/Hairstyle_${pad(style)}_48x48_${pad(color)}.png`
}

function accessoryFile(entry: AccessoryEntry, color: number) {
  return `${ROOT}/Accessories/48x48/Accessory_${pad(entry.style)}_${entry.file}_48x48_${pad(color)}.png`
}

/** Every layer file in the catalog, keyed by a stable name, for `PackFiles.avatarParts`. */
export function avatarPartFiles(): Record<string, string> {
  const files: Record<string, string> = {}
  BODIES.forEach((_, i) => {
    files[`body_${pad(i + 1)}`] = `${ROOT}/Bodies/48x48/Body_48x48_${pad(i + 1)}.png`
  })
  EYES.forEach((_, i) => {
    files[`eyes_${pad(i + 1)}`] = `${ROOT}/Eyes/48x48/Eyes_48x48_${pad(i + 1)}.png`
  })
  for (const { style, colors } of OUTFITS) {
    colors.forEach((_, i) => {
      files[`outfit_${pad(style)}_${pad(i + 1)}`] = outfitFile({ style, color: i + 1 })
    })
  }
  for (const { style, colors } of HAIRSTYLES) {
    colors.forEach((_, i) => {
      files[`hairstyle_${pad(style)}_${pad(i + 1)}`] = hairstyleFile({ style, color: i + 1 })
    })
  }
  for (const entry of ACCESSORIES) {
    entry.colors.forEach((_, i) => {
      files[`accessory_${pad(entry.style)}_${pad(i + 1)}`] = accessoryFile(entry, i + 1)
    })
  }
  return files
}

/** A stable string for an appearance, used as its texture and cache key. */
export function appearanceKey(a: AvatarAppearance): string {
  const accessory = a.accessory ? `${a.accessory.style}.${a.accessory.color}` : '0'
  return `${a.body}-${a.eyes}-${a.outfit.style}.${a.outfit.color}-${a.hairstyle.style}.${a.hairstyle.color}-${accessory}`
}

function isColoredPart(value: unknown, kind: ColoredPartKind): value is ColoredPart {
  if (typeof value !== 'object' || value === null) return false
  const { style, color } = value as Record<string, unknown>
  const entry = STYLES[kind].find((item) => item.style === style)
  return Boolean(entry) && Number.isInteger(color) && (color as number) >= 1 && (color as number) <= entry!.colors.length
}

function inRange(value: unknown, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= max
}

/**
 * Whether a value is an appearance this catalog can draw. Saved and received
 * appearances go through this, since a part can leave the catalog later.
 */
export function isAvatarAppearance(value: unknown): value is AvatarAppearance {
  if (typeof value !== 'object' || value === null) return false
  const a = value as Record<string, unknown>
  return (
    inRange(a.body, BODIES.length) &&
    inRange(a.eyes, EYES.length) &&
    isColoredPart(a.outfit, 'outfit') &&
    isColoredPart(a.hairstyle, 'hairstyle') &&
    (a.accessory === undefined || a.accessory === null || isColoredPart(a.accessory, 'accessory'))
  )
}

/** Returns a drawable appearance: `value` if the catalog can draw it, else the fallback. */
export function toAppearance(value: unknown, fallback: AvatarAppearance): AvatarAppearance {
  if (!isAvatarAppearance(value)) return fallback
  // Normalise a null accessory from JSON to "none".
  const { accessory, ...rest } = value
  return accessory ? { ...rest, accessory } : rest
}

type Random = () => number

function pick<T>(items: T[], random: Random): T {
  return items[Math.floor(random() * items.length)]
}

function pickColored(entries: StyleEntry[], random: Random): ColoredPart {
  const entry = pick(entries, random)
  return { style: entry.style, color: 1 + Math.floor(random() * entry.colors.length) }
}

// About a third of new avatars wear an accessory.
const ACCESSORY_CHANCE = 0.35

export function randomAppearance(random: Random = Math.random): AvatarAppearance {
  const appearance: AvatarAppearance = {
    body: 1 + Math.floor(random() * BODIES.length),
    eyes: 1 + Math.floor(random() * EYES.length),
    outfit: pickColored(OUTFITS, random),
    hairstyle: pickColored(HAIRSTYLES, random),
  }
  if (random() < ACCESSORY_CHANCE) appearance.accessory = pickColored(ACCESSORIES, random)
  return appearance
}

/**
 * The look a user has before they save one: random, but the same every time for the
 * same user, so first-time visitors look different from each other and from visit to visit
 * stay recognisable.
 */
export function defaultAppearance(userId: string): AvatarAppearance {
  return randomAppearance(seededRandom(hashString(userId)))
}

// FNV-1a: a small, stable string hash.
function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

// mulberry32: a tiny seeded generator, good enough to spread looks across users.
function seededRandom(seed: number): Random {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
