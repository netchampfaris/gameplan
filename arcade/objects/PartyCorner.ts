import type Phaser from 'phaser'
import { packAssetUrl, tilesetTextureKey } from '../config/assets'
import { Depth } from '../config/depths'
import { PackFiles } from '../config/packFiles'
import { gid, tileSource } from '../maps/tiled'
import type { Interactable } from '../world/interactables'
import { crispText } from './crispText'
import { loopAnimation } from './sheets'

/**
 * How the party corner looks: on a day with a celebration, a cake on the party table,
 * a balloon tied to each back corner, a line above them for each celebrant, and the
 * candles people added on the cake. On other days it draws nothing.
 *
 * The cake is the red one from the birthday sheet, copied without its own candle so
 * every candle on it is one somebody added. The candles are drawn here in the pack's
 * style: one art pixel wide, three screen pixels to an art pixel.
 *
 * A Room loads only the sheets its map uses, so the corner loads the birthday sheet and
 * the balloons itself, the first time there is a party.
 */

export interface PartyLook {
  /** One line per celebration, e.g. "Happy birthday, Arcade Two!". Empty for no party. */
  titles: string[]
  /** Candles on the cake, from every celebration. */
  candles: number
}

const SHEET = 'birthday'
/** The red cake: tiles 4 and 5 of the birthday sheet's first row. */
const CAKE_TILE = 4
/** The cake inside its two tiles, in pixels, and the candle it comes with. */
const CAKE = { x: 18, width: 58, height: 48 }
const OWN_CANDLE = { x: 45, width: 3, height: 15 }
const CAKE_KEY = 'party:cake'

// A balloon on a string, bobbing: 5 frames of 48x96, the knot at the bottom.
const BALLOONS = [
  { key: 'party:balloon-red', file: PackFiles.sprites.balloon_red, frameWidth: 48, frameHeight: 96, frames: 5 },
  { key: 'party:balloon-blue', file: PackFiles.sprites.balloon_blue, frameWidth: 48, frameHeight: 96, frames: 5 },
] as const
const BALLOON_FPS = 4
/** Where a balloon's string is tied, in from the table's side and down from its top. */
const BALLOON_TIE = { inset: 10, drop: 22 }

/** Where the cake's plate sits, down from the table's top edge. */
const CAKE_DROP = 50
/** Candles shown on the cake; past this, the count says how many. */
const MAX_CANDLES = 12
const ART_PIXEL = 3
const CANDLE_COLORS = [0x7ad3ff, 0xffffff, 0x9be89b, 0xff8fb1] as const
const FLAME = { tip: 0xfff1a8, base: 0xff9f43 }
/** The ring the candles stand on, on the cake's top: its centre above the plate, and its radii. */
const CANDLE_RING = { above: 31, rx: 13, ry: 5 }

const TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '11px',
  fontStyle: 'bold',
  color: '#ffffff',
  backgroundColor: 'rgba(23, 23, 23, 0.6)',
  padding: { x: 5, y: 2 },
  align: 'center',
  lineSpacing: 2,
}
const COUNT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '10px',
  color: '#ffffff',
  backgroundColor: 'rgba(23, 23, 23, 0.6)',
  padding: { x: 4, y: 1 },
}

export class PartyCorner {
  private readonly scene: Phaser.Scene
  private readonly table: Interactable
  private readonly depth: number
  private readonly title: Phaser.GameObjects.Text
  private readonly count: Phaser.GameObjects.Text
  private cake: Phaser.GameObjects.Image | null = null
  private balloons: Phaser.GameObjects.Sprite[] = []
  private candles: Phaser.GameObjects.Container[] = []
  /** The last look asked for, drawn again once the sheets have loaded. */
  private look: PartyLook | null = null
  private destroyed = false

  constructor(scene: Phaser.Scene, table: Interactable) {
    this.scene = scene
    this.table = table
    // Over the table, and sorted with Avatars by the table's front edge.
    this.depth = table.y + table.height
    this.title = crispText(scene, '', TITLE_STYLE).setOrigin(0.5, 1).setDepth(Depth.OVERLAY).setVisible(false)
    this.count = crispText(scene, '', COUNT_STYLE).setOrigin(0.5, 0).setDepth(Depth.OVERLAY).setVisible(false)
  }

  show(look: PartyLook) {
    const previous = this.look
    this.look = look
    const party = look.titles.length > 0
    if (party && !this.loadSheets()) return

    // The cake's two tiles span the table, so it keeps its place on the pack's pixel grid.
    const middle = this.table.x + this.table.width / 2
    const plate = this.table.y + CAKE_DROP
    this.drawCake(party, plate)
    this.drawBalloons(party)

    const balloonTop = this.table.y + BALLOON_TIE.drop - BALLOONS[0].frameHeight
    this.title
      .setText(look.titles.join('\n'))
      .setPosition(Math.round(middle), balloonTop - 2)
      .setVisible(party)
    this.count
      .setText(look.candles === 1 ? '1 candle' : `${look.candles} candles`)
      .setPosition(Math.round(middle), plate + 6)
      .setVisible(party && look.candles > 0)

    const before = previous?.titles.length ? previous.candles : look.candles
    this.drawCandles(party ? look.candles : 0, this.table.x + OWN_CANDLE.x, plate, look.candles - before)
  }

  destroy() {
    this.destroyed = true
    this.look = null
    this.title.destroy()
    this.count.destroy()
    this.cake?.destroy()
    for (const balloon of this.balloons) balloon.destroy()
    for (const candle of this.candles) candle.destroy()
  }

  /** True once the cake and the balloons can be drawn; otherwise starts loading them. */
  private loadSheets(): boolean {
    const { textures, load } = this.scene
    const sheet = tilesetTextureKey(SHEET)
    const missing = !textures.exists(sheet) || BALLOONS.some((balloon) => !textures.exists(balloon.key))
    if (!missing) return true
    if (!textures.exists(sheet)) load.image(sheet, packAssetUrl(PackFiles.tilesets[SHEET]))
    for (const balloon of BALLOONS) {
      if (!textures.exists(balloon.key)) {
        load.spritesheet(balloon.key, packAssetUrl(balloon.file), {
          frameWidth: balloon.frameWidth,
          frameHeight: balloon.frameHeight,
        })
      }
    }
    load.once('complete', () => {
      if (!this.destroyed && this.look) this.show(this.look)
    })
    load.start()
    return false
  }

  private drawCake(party: boolean, plate: number) {
    if (!party) {
      this.cake?.setVisible(false)
      return
    }
    this.cake ??= this.scene.add.image(0, 0, cakeTexture(this.scene)).setOrigin(0, 1).setDepth(this.depth)
    this.cake.setPosition(this.table.x + CAKE.x, plate).setVisible(true)
  }

  private drawBalloons(party: boolean) {
    if (!this.balloons.length && party) {
      this.balloons = BALLOONS.map((balloon, index) => {
        const x = index === 0 ? this.table.x + BALLOON_TIE.inset : this.table.x + this.table.width - BALLOON_TIE.inset
        return this.scene.add
          .sprite(x, this.table.y + BALLOON_TIE.drop, balloon.key, 0)
          .setOrigin(0.5, 1)
          .setDepth(this.depth)
          .play({ key: loopAnimation(this.scene, balloon, BALLOON_FPS), startFrame: index * 2 })
      })
    }
    for (const balloon of this.balloons) balloon.setVisible(party)
  }

  /**
   * Draws `count` candles around the column `middle` (a left edge on the pixel grid),
   * the last `added` of them popping up as new.
   */
  private drawCandles(count: number, middle: number, plate: number, added: number) {
    for (const candle of this.candles.splice(0)) candle.destroy()
    const shown = Math.min(count, MAX_CANDLES)
    // One candle stands in the middle; more stand evenly round a ring, turned so no two
    // share a column, and the ones at the back are drawn first.
    for (let index = 0; index < shown; index++) {
      const angle = Math.PI / 2 + Math.PI / shown + (2 * Math.PI * index) / shown
      const ring = shown === 1 ? 0 : 1
      // On the art-pixel grid, like the cake under them.
      const x = Math.round((middle + ring * CANDLE_RING.rx * Math.cos(angle)) / ART_PIXEL) * ART_PIXEL
      const y = Math.round(plate - CANDLE_RING.above + ring * CANDLE_RING.ry * Math.sin(angle))
      this.candles.push(this.candle(x, y, index))
    }
    // Pop in the new ones: candles are not placed in the order they were added, so
    // this pops the last placed, which reads the same.
    const fresh = this.candles.slice(Math.max(0, this.candles.length - Math.min(added, MAX_CANDLES)))
    for (const candle of fresh) {
      candle.setScale(1, 0)
      this.scene.tweens.add({ targets: candle, scaleY: 1, duration: 260, ease: 'Back.Out' })
    }
  }

  /** One candle, its left edge at x and standing on base, in a colour picked by its place. */
  private candle(x: number, base: number, index: number): Phaser.GameObjects.Container {
    const color = CANDLE_COLORS[index % CANDLE_COLORS.length] ?? CANDLE_COLORS[0]
    const pixel = (row: number, fill: number) =>
      this.scene.add.rectangle(0, -row * ART_PIXEL, ART_PIXEL, ART_PIXEL, fill).setOrigin(0, 1)
    const flame = pixel(4, FLAME.tip)
    this.scene.tweens.add({ targets: flame, alpha: 0.55, duration: 180 + (index % 3) * 60, yoyo: true, repeat: -1 })
    return this.scene.add
      .container(x, base, [pixel(0, color), pixel(1, color), pixel(2, color), pixel(3, FLAME.base), flame])
      .setDepth(this.depth + 0.5 + base / 10_000)
  }
}

/** The red cake without its candle, made once from the loaded birthday sheet. */
function cakeTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(CAKE_KEY)) return CAKE_KEY
  const source = tileSource(gid(SHEET, CAKE_TILE))
  const canvas = scene.textures.createCanvas(CAKE_KEY, CAKE.width, CAKE.height)
  if (!source || !canvas) return CAKE_KEY
  const image = scene.textures.get(tilesetTextureKey(SHEET)).getSourceImage() as CanvasImageSource
  const context = canvas.getContext()
  context.drawImage(image, source.x + CAKE.x, source.y, CAKE.width, CAKE.height, 0, 0, CAKE.width, CAKE.height)
  // Paint over the candle with the cake beside it.
  const candle = OWN_CANDLE.x - CAKE.x
  context.drawImage(
    canvas.getSourceImage() as CanvasImageSource,
    candle - OWN_CANDLE.width,
    0,
    OWN_CANDLE.width,
    OWN_CANDLE.height,
    candle,
    0,
    OWN_CANDLE.width,
    OWN_CANDLE.height,
  )
  canvas.refresh()
  return CAKE_KEY
}
