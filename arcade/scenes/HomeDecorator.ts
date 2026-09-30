import Phaser from 'phaser'
import type { DecorateState } from '../bridge'
import { tilesetTextureKey } from '../config/assets'
import { Depth } from '../config/depths'
import { PackFiles } from '../config/packFiles'
import { HOME_HEIGHT, HOME_WIDTH, homeProblem, homeProblemText, type Home, type HomeItem, type HomeProblem } from '../maps/home'
import { prefabs, prefabSize, type Prefab, type PrefabId } from '../maps/prefabs'
import { WALL_HEIGHT } from '../maps/rooms'
import { tileSource, TILE_SIZE, type TileMatrix } from '../maps/tiled'
import { propTextureKey } from '../world/props'

/**
 * Decorate mode inside a Home: a ghost of the held item follows the pointer, snapped to
 * the grid, green where it fits and red where it does not. Clicking places it; clicking
 * a placed item picks it up. Whether something fits is `homeProblem`, the same check the
 * Home is loaded with, so the owner can never save a Home that will not load.
 *
 * The decorator only edits a draft. The scene rebuilds the map from it on every change
 * and decides what Save and Cancel do.
 */

interface Held {
  prefab: PrefabId
  /** Where a picked-up item stood, so Escape can put it back. Null for a new item. */
  origin: HomeItem | null
  /** The pointer's tile relative to the item's top-left, so it does not jump when grabbed. */
  grab: { x: number; y: number }
}

const FITS = 0x4ade80
const BLOCKED = 0xf87171
const HOVER = 0xffffff

export class HomeDecorator {
  private readonly scene: Phaser.Scene
  private readonly onChange: (draft: Home) => void
  private readonly publish: (state: DecorateState) => void
  private readonly saved: Home
  private draft: Home
  private held: Held | null = null
  private pointerTile: { x: number; y: number } | null = null
  private problem: HomeProblem | null = null
  private readonly grid: Phaser.GameObjects.Graphics
  private readonly outline: Phaser.GameObjects.Graphics
  private readonly label: Phaser.GameObjects.Text
  private ghost: Phaser.GameObjects.Container | null = null

  constructor(
    scene: Phaser.Scene,
    home: Home,
    callbacks: { onChange: (draft: Home) => void; publish: (state: DecorateState) => void },
  ) {
    this.scene = scene
    this.saved = cloneHome(home)
    this.draft = cloneHome(home)
    this.onChange = callbacks.onChange
    this.publish = callbacks.publish

    this.grid = scene.add.graphics().setDepth(Depth.OBJECTS_BACK - 1)
    this.drawGrid()
    this.outline = scene.add.graphics().setDepth(Depth.OVERLAY)
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'InterVar, Inter, system-ui, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: 'rgba(17, 17, 17, 0.85)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setResolution(window.devicePixelRatio)
      .setDepth(Depth.OVERLAY + 1)
      .setVisible(false)

    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this)
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.onPointerOut, this)
    this.sync()
  }

  /** The draft as it stands, without the item in hand: what the room shows. */
  get home(): Home {
    return cloneHome(this.draft)
  }

  /** What Save stores: the draft, with an item picked up from the room back in its place. */
  private get committed(): Home {
    const origin = this.held?.origin
    return origin ? { ...cloneHome(this.draft), items: [...this.draft.items, origin] } : cloneHome(this.draft)
  }

  /** Picks an item from the catalog. It follows the pointer until placed. */
  hold(prefab: PrefabId) {
    this.putBack()
    const size = prefabSize(prefabs[prefab])
    this.held = { prefab, origin: null, grab: anchor(prefabs[prefab], size) }
    this.buildGhost()
    this.sync()
  }

  /** Escape: a picked-up item goes back where it was; a new one goes back to the catalog. */
  drop() {
    this.putBack()
    this.sync()
  }

  /** Throws the held item away. The guestbook stays: every Home has one. */
  remove() {
    if (!this.held) return
    if (this.held.prefab === 'guestbook') {
      this.putBack()
      this.sync()
      return
    }
    this.held = null
    this.clearGhost()
    this.sync()
  }

  setSurface(surface: { wallpaper: Home['wallpaper'] } | { floor: Home['floor'] }) {
    this.draft = { ...this.draft, ...surface }
    this.onChange(this.home)
    this.sync()
  }

  destroy() {
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.onPointerOut, this)
    this.scene.input.setDefaultCursor('default')
    this.clearGhost()
    this.grid.destroy()
    this.outline.destroy()
    this.label.destroy()
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    this.pointerTile = { x: Math.floor(pointer.worldX / TILE_SIZE), y: Math.floor(pointer.worldY / TILE_SIZE) }
    this.sync()
  }

  private onPointerOut() {
    this.pointerTile = null
    this.sync()
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!pointer.leftButtonDown()) return
    this.onPointerMove(pointer)
    const candidate = this.candidate()
    if (this.held && candidate) {
      if (this.problem) {
        this.shake()
        return
      }
      this.draft = { ...this.draft, items: [...this.draft.items, candidate] }
      this.held = null
      this.clearGhost()
      this.onChange(this.home)
      this.sync()
      return
    }
    const item = this.itemUnderPointer()
    if (!item || !this.pointerTile) return
    this.draft = { ...this.draft, items: this.draft.items.filter((other) => other !== item) }
    this.held = {
      prefab: item.prefab,
      origin: item,
      grab: { x: this.pointerTile.x - item.x, y: this.pointerTile.y - item.y },
    }
    this.buildGhost()
    this.onChange(this.home)
    this.sync()
  }

  /** Where the held item would go if placed now. */
  private candidate(): HomeItem | null {
    if (!this.held || !this.pointerTile) return null
    return {
      prefab: this.held.prefab,
      x: this.pointerTile.x - this.held.grab.x,
      y: this.pointerTile.y - this.held.grab.y,
    }
  }

  /** The item drawn on top at the pointer: things on tables, then furniture and wall decor, then rugs. */
  private itemUnderPointer(): HomeItem | null {
    const tile = this.pointerTile
    if (!tile) return null
    const layer = (item: HomeItem) => ({ tabletop: 2, furniture: 1, wall: 1, rug: 0 })[prefabs[item.prefab].kind]
    let best: HomeItem | null = null
    for (const item of this.draft.items) {
      if (!covers(item, tile)) continue
      if (!best || layer(item) >= layer(best)) best = item
    }
    return best
  }

  private putBack() {
    const origin = this.held?.origin
    if (origin) {
      this.draft = { ...this.draft, items: [...this.draft.items, origin] }
      this.onChange(this.home)
    }
    this.held = null
    this.clearGhost()
  }

  /** Moves the ghost and outline to the pointer, and tells the HUD what changed. */
  private sync() {
    const candidate = this.candidate()
    this.outline.clear()
    this.label.setVisible(false)
    this.problem = candidate ? homeProblem({ ...this.draft, items: [...this.draft.items, candidate] }) : null

    if (candidate) {
      const { width, height } = prefabSize(prefabs[candidate.prefab])
      const color = this.problem ? BLOCKED : FITS
      const rect = { x: candidate.x * TILE_SIZE, y: candidate.y * TILE_SIZE, w: width * TILE_SIZE, h: height * TILE_SIZE }
      this.outline.fillStyle(color, 0.22).fillRect(rect.x, rect.y, rect.w, rect.h)
      this.outline.lineStyle(2, color, 0.95).strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2)
      this.ghost?.setPosition(rect.x, rect.y).setVisible(true)
      if (this.problem) {
        this.label
          .setText(homeProblemText[this.problem])
          .setPosition(rect.x + rect.w / 2, rect.y - 4)
          // The same size on screen at any zoom.
          .setScale(1 / this.scene.cameras.main.zoom)
          .setVisible(true)
      }
    } else {
      this.ghost?.setVisible(false)
      const hovered = this.held ? null : this.itemUnderPointer()
      if (hovered) {
        const { width, height } = prefabSize(prefabs[hovered.prefab])
        this.outline
          .lineStyle(2, HOVER, 0.9)
          .strokeRect(hovered.x * TILE_SIZE + 1, hovered.y * TILE_SIZE + 1, width * TILE_SIZE - 2, height * TILE_SIZE - 2)
      }
    }
    this.scene.input.setDefaultCursor(this.held ? 'grabbing' : this.itemUnderPointer() ? 'grab' : 'default')

    const committed = this.committed
    this.publish({
      home: committed,
      holding: this.held?.prefab ?? null,
      picked: this.held?.origin != null,
      problem: this.problem,
      dirty: !sameHome(committed, this.saved),
    })
  }

  private buildGhost() {
    this.clearGhost()
    if (!this.held) return
    const prefab: Prefab = prefabs[this.held.prefab]
    const ghost = this.scene.add.container(0, 0).setDepth(Depth.OVERLAY - 1).setAlpha(0.85).setVisible(false)
    for (const tiles of [prefab.tiles, prefab.overlay]) if (tiles) this.addTiles(ghost, tiles)
    if (prefab.sprite) {
      const key = propTextureKey(PackFiles.props[prefab.sprite.sheet])
      if (this.scene.textures.exists(key)) ghost.add(this.scene.add.image(0, 0, key, 0).setOrigin(0))
    }
    this.ghost = ghost
  }

  private addTiles(ghost: Phaser.GameObjects.Container, tiles: TileMatrix) {
    tiles.forEach((row, y) =>
      row.forEach((tile, x) => {
        const source = tile ? tileSource(tile) : null
        if (!source) return
        const texture = this.scene.textures.get(tilesetTextureKey(source.sheet))
        const frame = `tile:${tile}`
        if (!texture.has(frame)) texture.add(frame, 0, source.x, source.y, TILE_SIZE, TILE_SIZE)
        ghost.add(this.scene.add.image(x * TILE_SIZE, y * TILE_SIZE, texture.key, frame).setOrigin(0))
      }),
    )
  }

  private clearGhost() {
    this.ghost?.destroy()
    this.ghost = null
  }

  private shake() {
    if (!this.ghost) return
    this.scene.tweens.add({
      targets: this.ghost,
      x: this.ghost.x + 4,
      duration: 40,
      yoyo: true,
      repeat: 2,
    })
  }

  /** Faint tile lines over the floor and the wall face, only while decorating. */
  private drawGrid() {
    this.grid.lineStyle(1, 0xffffff, 0.12)
    const left = TILE_SIZE
    const right = (HOME_WIDTH - 1) * TILE_SIZE
    const bottom = (HOME_HEIGHT - 1) * TILE_SIZE
    for (let x = 1; x < HOME_WIDTH; x++) this.grid.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, bottom)
    for (let y = 1; y < HOME_HEIGHT; y++) this.grid.lineBetween(left, y * TILE_SIZE, right, y * TILE_SIZE)
    // The line where wall meets floor, a little stronger.
    this.grid.lineStyle(1, 0xffffff, 0.25).lineBetween(left, WALL_HEIGHT * TILE_SIZE, right, WALL_HEIGHT * TILE_SIZE)
  }
}

/** Where the pointer holds a new item: the middle of its footprint, or of the item. */
function anchor(prefab: Prefab, size: { width: number; height: number }): { x: number; y: number } {
  const footprint = prefab.kind === 'furniture' ? (prefab.footprint ?? size.height) : size.height
  return { x: Math.floor((size.width - 1) / 2), y: size.height - footprint + Math.floor((footprint - 1) / 2) }
}

function covers(item: HomeItem, tile: { x: number; y: number }): boolean {
  const { width, height } = prefabSize(prefabs[item.prefab])
  return tile.x >= item.x && tile.x < item.x + width && tile.y >= item.y && tile.y < item.y + height
}

function cloneHome(home: Home): Home {
  return { wallpaper: home.wallpaper, floor: home.floor, items: home.items.map((item) => ({ ...item })) }
}

/** Same surfaces and the same items, in any order: moving a thing back is no change. */
function sameHome(a: Home, b: Home): boolean {
  const key = (home: Home) =>
    [home.wallpaper, home.floor, ...home.items.map((item) => `${item.prefab}@${item.x},${item.y}`).sort()].join('|')
  return key(a) === key(b)
}
