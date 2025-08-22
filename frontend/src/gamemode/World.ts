import type { GameWorldConfig } from './types'

export class World {
  public readonly width: number
  public readonly height: number
  public readonly tileSize: number
  public readonly backgroundColor = '#2a2a2a'
  public readonly gridColor = '#444'
  public readonly gridLineWidth = 1

  constructor(config: GameWorldConfig) {
    this.width = config.width
    this.height = config.height
    this.tileSize = config.tileSize
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Clear canvas with background color
    ctx.fillStyle = this.backgroundColor
    ctx.fillRect(0, 0, this.width, this.height)

    // Render grid
    this.renderGrid(ctx)
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
}