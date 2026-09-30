import type Phaser from 'phaser'
import { Depth } from '../config/depths'
import { TILE_SIZE } from '../maps/tiled'
import { pointFor, sectorAt, type Point } from '../world/dartboard'
import { crispText } from './crispText'

/**
 * The dartboard on the wall ahead of a darts line, and the tape of the line on the
 * floor. The pack has no dartboard, so both are drawn here in pixel art, one texture
 * pixel to two screen pixels like the pack's 48px tiles.
 *
 * A thrown dart flies from the thrower to the board and sticks where its score is; the
 * last few stay in the board. The score rises over the thrower's head.
 */

/** The board texture's size in texture pixels, and its scoring radius. */
const SIZE = 21
const EDGE = SIZE / 2
const RADIUS = 8
const SCALE = 2
/** How far above the foot of the wall the board's centre hangs, in pixels. */
const HANG_HEIGHT = 70
/** How many darts stay in the board. */
const DARTS_KEPT = 3
const FLIGHT_MS = 260

const COLORS = {
  surround: '#2c2437',
  rim: '#4a3f55',
  dark: '#3a3340',
  light: '#efe2c4',
  red: '#d9534f',
  green: '#4fa36a',
  tape: 0xefe2c4,
} as const

// A dart seen head on: yellow flights, a gray barrel and a dark point at the bottom.
const DART_ROWS = ['y.y', 'yyy', '.s.', '.s.', '.p.']
const DART_COLORS: Record<string, string> = { y: '#ffd166', s: '#b8b8c8', p: '#2c2437' }

export class Dartboard {
  private readonly scene: Phaser.Scene
  private readonly board: Phaser.GameObjects.Image
  private readonly tape: Phaser.GameObjects.Rectangle
  private readonly darts: Phaser.GameObjects.Image[] = []
  private readonly flying = new Set<Phaser.GameObjects.GameObject>()

  /** @param line The darts line's footprint; the board hangs on the wall straight ahead. */
  constructor(scene: Phaser.Scene, map: Phaser.Tilemaps.Tilemap, line: { x: number; y: number; width: number }) {
    this.scene = scene
    const x = line.x + line.width / 2
    const y = wallFoot(map, x, line.y) - HANG_HEIGHT
    this.board = scene.add
      .image(Math.round(x), Math.round(y), boardTexture(scene))
      .setScale(SCALE)
      .setDepth(Depth.OBJECTS_BACK)
    this.tape = scene.add
      .rectangle(line.x + 4, line.y + 2, line.width - 8, 4, COLORS.tape)
      .setOrigin(0, 0)
      .setDepth(Depth.DECOR)
  }

  /** A dart thrown by the Avatar with its feet at `from`, landing where `score` is. */
  throw(from: Point, score: number) {
    const landing = this.boardPoint(pointFor(score))
    const dart = this.scene.add
      .image(from.x, from.y - 50, dartTexture(this.scene))
      .setOrigin(0.5, 1)
      .setScale(SCALE * 1.5)
      .setDepth(Depth.OVERLAY)
    this.flying.add(dart)
    this.scene.tweens.add({
      targets: dart,
      x: landing.x,
      y: landing.y,
      scale: SCALE,
      duration: FLIGHT_MS,
      ease: 'Quad.Out',
      onComplete: () => {
        this.flying.delete(dart)
        dart.setDepth(Depth.OBJECTS_BACK + 1)
        this.darts.push(dart)
        while (this.darts.length > DARTS_KEPT) this.darts.shift()?.destroy()
        this.floatScore(from, score)
      },
    })
  }

  destroy() {
    this.board.destroy()
    this.tape.destroy()
    for (const dart of this.darts.splice(0)) dart.destroy()
    for (const dart of this.flying) dart.destroy()
    this.flying.clear()
  }

  /** A point in board radii, in map pixels. */
  private boardPoint(point: Point): Point {
    const scale = RADIUS * SCALE
    return { x: Math.round(this.board.x + point.x * scale), y: Math.round(this.board.y + point.y * scale) }
  }

  private floatScore(from: Point, score: number) {
    const text = crispText(this.scene, score ? String(score) : 'Miss', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: COLORS.surround,
      strokeThickness: 3,
    })
      .setOrigin(0.5, 1)
      .setPosition(from.x, from.y - 76)
      .setDepth(Depth.OVERLAY)
    this.scene.tweens.add({
      targets: text,
      y: from.y - 100,
      alpha: { from: 1, to: 0 },
      duration: 1600,
      ease: 'Sine.In',
      onComplete: () => text.destroy(),
    })
  }
}

/** The y of the foot of the first wall straight above `y`, in the Collision layer. */
function wallFoot(map: Phaser.Tilemaps.Tilemap, x: number, y: number): number {
  const column = Math.floor(x / TILE_SIZE)
  for (let row = Math.floor(y / TILE_SIZE) - 1; row >= 0; row--) {
    if (map.getLayer('Collision') && map.getTileAt(column, row, false, 'Collision')) {
      return (row + 1) * TILE_SIZE
    }
  }
  return y - 2 * TILE_SIZE
}

function boardTexture(scene: Phaser.Scene): string {
  const key = 'darts:board'
  if (scene.textures.exists(key)) return key
  const canvas = scene.textures.createCanvas(key, SIZE, SIZE)
  if (!canvas) return key
  const context = canvas.getContext()
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const x = px + 0.5 - EDGE
      const y = py + 0.5 - EDGE
      const color = boardColor(Math.hypot(x, y), sectorAt({ x, y }) % 2 === 0)
      if (!color) continue
      context.fillStyle = color
      context.fillRect(px, py, 1, 1)
    }
  }
  canvas.refresh()
  return key
}

/**
 * The colour of a board pixel at `distance` texture pixels from the centre. The rings are
 * drawn at whole-pixel widths so each one shows at this size; the scoring uses the true
 * rings in `world/dartboard.ts`.
 */
function boardColor(distance: number, even: boolean): string | null {
  if (distance > EDGE) return null
  if (distance > EDGE - 1) return COLORS.rim
  if (distance > RADIUS) return COLORS.surround
  if (distance <= 1.1) return COLORS.red
  if (distance <= 2.1) return COLORS.green
  const ring = distance > RADIUS - 1 || (distance > 4.2 && distance <= 5.2)
  if (ring) return even ? COLORS.red : COLORS.green
  return even ? COLORS.dark : COLORS.light
}

function dartTexture(scene: Phaser.Scene): string {
  const key = 'darts:dart'
  if (scene.textures.exists(key)) return key
  const canvas = scene.textures.createCanvas(key, DART_ROWS[0]?.length ?? 3, DART_ROWS.length)
  if (!canvas) return key
  const context = canvas.getContext()
  DART_ROWS.forEach((row, y) => {
    ;[...row].forEach((cell, x) => {
      const color = DART_COLORS[cell]
      if (!color) return
      context.fillStyle = color
      context.fillRect(x, y, 1, 1)
    })
  })
  canvas.refresh()
  return key
}
