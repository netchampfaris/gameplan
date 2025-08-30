import type { GameWorldConfig, WorldTile, TileData } from './types'
import { AssetManager } from './AssetManager'

interface TiledLayer {
  id: number
  name: string
  width: number
  height: number
  data: number[]
  visible?: boolean
  opacity?: number
  properties?: Array<{name: string, value: any, type?: string}>
}

interface TiledTileset {
  firstgid: number
  source?: string
  name?: string
  tilewidth: number
  tileheight: number
  tilecount: number
  columns: number
  image?: string
}

interface TiledMap {
  width: number
  height: number
  tilewidth: number
  tileheight: number
  layers: TiledLayer[]
  tilesets: TiledTileset[]
}

export class World {
  public readonly width: number
  public readonly height: number
  public readonly tileSize: number
  public readonly backgroundColor = '#2a2a2a'
  public readonly gridColor = '#444'
  public readonly gridLineWidth = 1

  private tiles: WorldTile[][] = []
  private tilesX: number
  private tilesY: number
  private assetsLoaded = false

  // Tiled map data
  private tiledMap: TiledMap | null = null
  private collisionLayer: TiledLayer | null = null

  constructor(config: GameWorldConfig) {
    this.width = config.width
    this.height = config.height
    this.tileSize = config.tileSize

    this.tilesX = Math.floor(this.width / this.tileSize)
    this.tilesY = Math.floor(this.height / this.tileSize)

    this.initializeTiles()
    this.loadAssets()
  }

  private async loadAssets() {
    try {
      await AssetManager.loadRoomBuilderSprites()
      await AssetManager.loadLivingRoomSprites()
      this.assetsLoaded = true
    } catch (error) {
      console.error('Failed to load world assets:', error)
    }
  }

  private initializeTiles() {
    // Create a basic common area layout
    this.tiles = Array(this.tilesY).fill(null).map((_, y) =>
      Array(this.tilesX).fill(null).map((_, x) => ({
        x,
        y,
        floor: this.getDefaultFloor(),
        wall: this.getDefaultWall(x, y)
      }))
    )
  }

  private getDefaultFloor(): TileData {
    // Use the labeled floor-1 tile from sprite_labels.json
    // floor-1: row 3, col 15 = spriteX: 720, spriteY: 144 (15 * 48, 3 * 48)
    return {
      type: 'floor',
      spriteX: 720,  // col 15 * 48px = 720px
      spriteY: 144,  // row 3 * 48px = 144px
      spriteSheet: 'room_builder'
    }
  }

  private getDefaultWall(x: number, y: number): TileData | undefined {
    // Add walls around the perimeter
    const isEdge = x === 0 || x === this.tilesX - 1 || y === 0 || y === this.tilesY - 1

    if (isEdge) {
      return {
        type: 'wall',
        spriteX: 0,   // Wall tile from spritesheet
        spriteY: 48,  // Wall row
        spriteSheet: 'room_builder',
        solid: true
      }
    }

    return undefined
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Clear canvas with background color
    ctx.fillStyle = this.backgroundColor
    ctx.fillRect(0, 0, this.width, this.height)

    if (this.assetsLoaded) {
      if (this.tiledMap) {
        this.renderTiledLayers(ctx)
      } else {
        this.renderTiles(ctx)
      }
    } else {
      // Render grid while assets are loading
      this.renderGrid(ctx)
    }
  }

  private renderTiles(ctx: CanvasRenderingContext2D) {
    for (let y = 0; y < this.tilesY; y++) {
      for (let x = 0; x < this.tilesX; x++) {
        const tile = this.tiles[y][x]
        const pixelX = x * this.tileSize
        const pixelY = y * this.tileSize

        // Render floor first
        if (tile.floor) {
          this.renderTileSprite(ctx, tile.floor, pixelX, pixelY)
        }

        // Then render walls on top
        if (tile.wall) {
          this.renderTileSprite(ctx, tile.wall, pixelX, pixelY)
        }
      }
    }
  }

  private renderTileSprite(ctx: CanvasRenderingContext2D, tileData: TileData, x: number, y: number) {
    const spriteSheet = AssetManager.getSpriteSheet(tileData.spriteSheet)
    if (spriteSheet) {
      AssetManager.extractSprite(
        ctx,
        spriteSheet,
        tileData.spriteX, tileData.spriteY,
        x, y,
        this.tileSize
      )
    }
  }

  private renderGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = this.gridColor
    ctx.lineWidth = this.gridLineWidth

    // Vertical lines
    for (let x = 0; x < this.width; x += this.tileSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.height)
      ctx.stroke()
    }

    // Horizontal lines
    for (let y = 0; y < this.height; y += this.tileSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(this.width, y)
      ctx.stroke()
    }
  }

  public getBounds() {
    return {
      width: this.width,
      height: this.height,
    }
  }

  // Load Tiled JSON map
  public async loadTiledMap(mapUrl: string) {
    try {
      const response = await fetch(mapUrl)
      const tiledData = await response.json() as TiledMap

      this.tiledMap = tiledData
      this.collisionLayer = tiledData.layers.find(layer =>
        layer.name.toLowerCase() === 'collision' ||
        layer.properties?.some(prop => prop.name === 'collision' && prop.value === true)
      ) || null

      // Update world dimensions to match map
      this.tilesX = tiledData.width
      this.tilesY = tiledData.height

      console.log(`Loaded Tiled map: ${tiledData.width}x${tiledData.height}`)
      return true
    } catch (error) {
      console.error('Failed to load Tiled map:', error)
      return false
    }
  }

  // Check if a tile position has collision
  public isCollision(x: number, y: number): boolean {
    if (!this.collisionLayer || x < 0 || y < 0 || x >= this.tilesX || y >= this.tilesY) {
      return false
    }

    const tileIndex = y * this.tilesX + x
    return this.collisionLayer.data[tileIndex] !== 0
  }

  // Render Tiled layers
  private renderTiledLayers(ctx: CanvasRenderingContext2D) {
    if (!this.tiledMap) {
      this.renderTiles(ctx) // Fallback to original rendering
      return
    }

    // Render each visible layer in order
    for (const layer of this.tiledMap.layers) {
      if (layer.visible !== false && layer.name.toLowerCase() !== 'collision') {
        this.renderTiledLayer(ctx, layer)
      }
    }
  }

  private renderTiledLayer(ctx: CanvasRenderingContext2D, layer: TiledLayer) {
    ctx.save()
    if (layer.opacity !== undefined) {
      ctx.globalAlpha = layer.opacity
    }

    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const tileIndex = y * layer.width + x
        const gid = layer.data[tileIndex]

        if (gid === 0) continue // Empty tile

        const tileset = this.getTilesetForGid(gid)
        if (!tileset) continue

        const localTileId = gid - tileset.firstgid
        this.renderTiledTile(ctx, tileset, localTileId, x * this.tileSize, y * this.tileSize)
      }
    }

    ctx.restore()
  }

  private getTilesetForGid(gid: number): TiledTileset | null {
    if (!this.tiledMap) return null

    // Find the tileset that contains this GID
    for (let i = this.tiledMap.tilesets.length - 1; i >= 0; i--) {
      const tileset = this.tiledMap.tilesets[i]
      if (gid >= tileset.firstgid) {
        return tileset
      }
    }

    return this.tiledMap.tilesets[0] || null
  }

  private renderTiledTile(ctx: CanvasRenderingContext2D, tileset: TiledTileset, tileId: number, x: number, y: number) {
    // Calculate sprite sheet coordinates
    const col = tileId % tileset.columns
    const row = Math.floor(tileId / tileset.columns)
    const spriteX = col * this.tileSize
    const spriteY = row * this.tileSize

    // Determine which sprite sheet to use based on tileset
    let spriteSheetKey = 'room_builder' // Default
    if (tileset.firstgid > 1800) {
      spriteSheetKey = 'living_room'
    }

    const spriteSheet = AssetManager.getSpriteSheet(spriteSheetKey)
    if (spriteSheet) {
      AssetManager.extractSprite(
        ctx,
        spriteSheet,
        spriteX, spriteY,
        x, y,
        this.tileSize
      )
    }
  }
}