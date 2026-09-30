import type Phaser from 'phaser'
import { Depth } from '../config/depths'

/**
 * Tiny pixel-art icons drawn in code: hearts for petting the cat, the z's of its nap,
 * notes for the jukebox, and drops of water for the shared plant. Each is a shape in `#` (fill) and `+` (highlight); the dark outline around it
 * is added here, so the shapes stay readable.
 */

const SHAPES = {
  heart: ['.##.##.', '#+#####', '#######', '.#####.', '..###..', '...#...'],
  note: ['...#...', '...##..', '...#.#.', '...#..#', '...#...', '.###...', '####...', '.##....'],
  notes: ['..######', '..#....#', '..#....#', '..#....#', '.##...##', '###..###', '##...##.'],
  z: ['####', '..#.', '.#..', '####'],
  drop: ['..#..', '.###.', '#+###', '#+###', '.###.'],
} as const

export type PixelIcon = keyof typeof SHAPES

const OUTLINE = '#2c2437'
const HIGHLIGHT = '#ffffff'

export const HEART_COLOR = '#f2557a'
export const SLEEP_COLOR = '#e4e0ff'
export const WATER_COLOR = '#6ec3ff'
export const NOTE_COLORS = ['#ffd166', '#7ad3ff', '#ff8fb1', '#9be89b'] as const

/** The texture key for an icon in a colour, drawn on first use. */
export function pixelIcon(scene: Phaser.Scene, icon: PixelIcon, color: string): string {
  const key = `pixel:${icon}:${color}`
  if (scene.textures.exists(key)) return key

  const rows = SHAPES[icon]
  const width = Math.max(...rows.map((row) => row.length)) + 2
  const height = rows.length + 2
  const filled = (x: number, y: number) => {
    const cell = rows[y - 1]?.[x - 1]
    return cell === '#' || cell === '+'
  }

  const canvas = scene.textures.createCanvas(key, width, height)
  if (!canvas) return key
  const context = canvas.getContext()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = rows[y - 1]?.[x - 1]
      if (cell === '#' || cell === '+') {
        context.fillStyle = cell === '+' ? HIGHLIGHT : color
      } else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        context.fillStyle = OUTLINE
      } else {
        continue
      }
      context.fillRect(x, y, 1, 1)
    }
  }
  canvas.refresh()
  return key
}

export interface FloatOptions {
  /** How far it rises, in pixels. A negative rise makes it fall. */
  rise: number
  /** How far it sways sideways, each way. */
  sway: number
  duration: number
  delay?: number
  /** Icons are drawn one texture pixel per art pixel; 2 matches the 48px tiles. */
  scale?: number
}

/** Sends an icon up from a point, swaying and fading, then removes it. */
export function floatUp(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  options: FloatOptions,
) {
  const image = scene.add
    .image(Math.round(x), Math.round(y), key)
    .setOrigin(0.5, 1)
    .setScale(options.scale ?? 2)
    .setDepth(Depth.OVERLAY)
    .setAlpha(0)
  const delay = options.delay ?? 0
  scene.tweens.add({ targets: image, alpha: 1, duration: 150, delay })
  scene.tweens.add({
    targets: image,
    y: y - options.rise,
    duration: options.duration,
    delay,
    ease: 'Sine.Out',
  })
  scene.tweens.add({
    targets: image,
    x: { from: x - options.sway, to: x + options.sway },
    duration: options.duration / 4,
    delay,
    yoyo: true,
    repeat: 1,
    ease: 'Sine.InOut',
  })
  scene.tweens.add({
    targets: image,
    alpha: 0,
    delay: delay + options.duration * 0.6,
    duration: options.duration * 0.4,
    onComplete: () => image.destroy(),
  })
}
