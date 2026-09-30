import type Phaser from 'phaser'
import { packAssetUrl, tilesetTextureKey } from '../config/assets'
import { PackFiles } from '../config/packFiles'
import { gid, TILE_SIZE, tileSource } from '../maps/tiled'
import { floatUp, pixelIcon, WATER_COLOR } from './pixelIcons'
import { loopAnimation, Sheets } from './sheets'

/**
 * How the shared plant looks: a sprout at stage 1, then bigger potted plants from the
 * grocery sheet, and at the last stage the flowering plant of its species. A drooping
 * plant is tinted dry and leans over. The server decides the stage (`gp_arcade_plant.py`);
 * this only draws it.
 *
 * A Room loads only the sheets its map uses, so the plant loads the grocery sheet itself.
 */

export interface PlantLook {
  stage: number
  /** The last stage, when it blooms. */
  stages: number
  /** An id from `data/plants.json`. */
  species: string
  drooping: boolean
}

interface SheetPlant {
  /** The top tile on the grocery sheet. */
  tile: number
  /** Tiles tall. */
  height: number
}

// Stage 1 is the animated sprout.
const GROWING: Record<number, SheetPlant> = {
  2: { tile: 1088, height: 1 },
  3: { tile: 1100, height: 1 },
  4: { tile: 1041, height: 2 },
}
const BLOOMS: Record<string, SheetPlant> = {
  'lavender': { tile: 1074, height: 2 },
  'blue-daisy': { tile: 1042, height: 2 },
  'cosmos': { tile: 1073, height: 2 },
}
const SHEET = 'grocery'
const SPROUT_FPS = 3
const DRY_TINT = 0xc8b27e
const DROOP_ANGLE = -7
const DROPS = 5

/** The sheet plant for a stage past the sprout, or null for the sprout. */
function grownPlant({ stage, stages, species }: PlantLook): SheetPlant | null {
  if (stage <= 1) return null
  if (stage >= stages) return BLOOMS[species] ?? GROWING[4] ?? null
  return GROWING[stage] ?? GROWING[4] ?? null
}

export class SharedPlant {
  private readonly scene: Phaser.Scene
  private readonly sprite: Phaser.GameObjects.Sprite
  /** The last look asked for, drawn again once the sheet has loaded. */
  private look: PlantLook | null = null

  /** @param x, y The bottom middle of the pot, in map pixels. */
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    this.sprite = scene.add.sprite(x, y, Sheets.sprout.key, 0).setOrigin(0.5, 1).setDepth(y).setVisible(false)
    this.loadSheet()
  }

  show(look: PlantLook) {
    this.look = look
    const grown = grownPlant(look)
    const frame = grown && this.sheetFrame(grown)
    // Not a sprout for a moment: wait for the sheet.
    if (grown && !frame) return
    if (frame) {
      this.sprite.stop()
      this.sprite.setTexture(tilesetTextureKey(SHEET), frame)
    } else if (!this.sprite.anims.isPlaying) {
      this.sprite.play(loopAnimation(this.scene, Sheets.sprout, SPROUT_FPS))
    }
    if (look.drooping) this.sprite.setTint(DRY_TINT).setAngle(DROOP_ANGLE)
    else this.sprite.clearTint().setAngle(0)
    this.sprite.setVisible(true)
  }

  /** Drops of water fall onto the plant, and it gives a little shake. */
  water() {
    const top = this.sprite.y - this.sprite.displayHeight + 8
    const key = pixelIcon(this.scene, 'drop', WATER_COLOR)
    for (let index = 0; index < DROPS; index++) {
      floatUp(this.scene, key, this.sprite.x + (index - (DROPS - 1) / 2) * 7, top - 18, {
        rise: -24 - (index % 2) * 6,
        sway: 1,
        duration: 700,
        delay: index * 110,
      })
    }
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 1.06,
      duration: 110,
      delay: 450,
      yoyo: true,
      repeat: 1,
    })
  }

  destroy() {
    this.look = null
    this.sprite.destroy()
  }

  private loadSheet() {
    const key = tilesetTextureKey(SHEET)
    if (this.scene.textures.exists(key)) return
    this.scene.load.once(`filecomplete-image-${key}`, () => {
      if (this.look) this.show(this.look)
    })
    this.scene.load.image(key, packAssetUrl(PackFiles.tilesets[SHEET]))
    this.scene.load.start()
  }

  /** A frame on the grocery sheet's texture for `plant`, added on first use. */
  private sheetFrame(plant: SheetPlant): string | null {
    const key = tilesetTextureKey(SHEET)
    if (!this.scene.textures.exists(key)) return null
    const texture = this.scene.textures.get(key)
    const name = `plant:${plant.tile}`
    if (!texture.has(name)) {
      const source = tileSource(gid(SHEET, plant.tile))
      if (!source) return null
      texture.add(name, 0, source.x, source.y, TILE_SIZE, plant.height * TILE_SIZE)
    }
    return name
  }
}
