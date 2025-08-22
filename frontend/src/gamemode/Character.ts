import type { CharacterConfig } from './types'
import { Time } from './Time'
import { World } from './World'
import { AssetManager } from './AssetManager'

export class Character {
  private sprite: HTMLImageElement | null = null
  private spriteLoaded = false

  // Character properties
  public readonly width = 48
  public readonly height = 96

  // Movement properties (tile-based)
  private readonly tilesPerSecond: number
  public readonly speed: number

  public x: number = 0
  public y: number = 0
  public direction: 'down' | 'left' | 'right' | 'up' = 'down'
  public animation: 'idle' | 'walk' = 'idle'
  public frameIndex = 0
  public animationTimer = 0

  // Animation configuration based on LimeZu sprite sheet layout
  private animations = {
    idle: { row: 1, frames: 6, speed: 0.1 },
    walk: { row: 2, frames: 6, speed: 0.2 },
  }

  private directions = {
    right: 0, // frames 0-5
    up: 6, // frames 6-11
    left: 12, // frames 12-17
    down: 18, // frames 18-23
  }

  constructor(spritePath: string, private world: World, config: CharacterConfig = {}) {
    // Initialize movement properties
    this.tilesPerSecond = config.tilesPerSecond ?? 2
    this.speed = this.world.tileSize * this.tilesPerSecond

    this.loadSprite(spritePath)
  }

  private async loadSprite(spritePath: string) {
    this.sprite = new Image()
    this.sprite.onload = () => {
      this.spriteLoaded = true
    }
    this.sprite.src = spritePath
  }

  public update(deltaTime: number) {
    if (!this.spriteLoaded) return

    // Update animation frame
    this.animationTimer += deltaTime / 1000
    const currentAnimation = this.animations[this.animation]

    if (this.animationTimer >= currentAnimation.speed) {
      this.frameIndex = (this.frameIndex + 1) % currentAnimation.frames
      this.animationTimer = 0
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!this.sprite || !this.spriteLoaded) return

    const currentAnimation = this.animations[this.animation]
    const directionOffset = this.directions[this.direction]

    // Calculate source position on sprite sheet
    // Each row has 24 frames (6 per direction * 4 directions)
    const absoluteFrameIndex = directionOffset + this.frameIndex
    const sourceX = absoluteFrameIndex * this.width
    const sourceY = currentAnimation.row * this.height

    // Draw the character
    ctx.drawImage(
      this.sprite,
      sourceX,
      sourceY,
      this.width,
      this.height, // source rect
      this.x,
      this.y,
      this.width,
      this.height, // dest rect
    )
  }

  public setPosition(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public setAnimation(animation: 'idle' | 'walk') {
    if (this.animation !== animation) {
      this.animation = animation
      this.frameIndex = 0
      this.animationTimer = 0
    }
  }

  public setDirection(direction: 'down' | 'left' | 'right' | 'up') {
    this.direction = direction
  }

  public move(direction: 'down' | 'left' | 'right' | 'up') {
    const moveDistance = this.speed * (Time.getDeltaTime() / 1000)

    switch (direction) {
      case 'up':
        this.y -= moveDistance
        break
      case 'down':
        this.y += moveDistance
        break
      case 'left':
        this.x -= moveDistance
        break
      case 'right':
        this.x += moveDistance
        break
    }

    // Keep character within world bounds
    const worldBounds = this.world.getBounds()
    this.x = Math.max(0, Math.min(this.x, worldBounds.width - this.width))
    this.y = Math.max(0, Math.min(this.y, worldBounds.height - this.height))

    // Update direction and animation
    this.setDirection(direction)
    this.setAnimation('walk')
  }

  public stopMoving() {
    this.setAnimation('idle')
  }

  // Factory methods for easier character creation
  static createWithCharacterNumber(characterNumber: number, world: World, config: CharacterConfig = {}): Character {
    const spritePath = AssetManager.getCharacterSpritePath(characterNumber)
    return new Character(spritePath, world, config)
  }

  static createRandom(world: World, config: CharacterConfig = {}): Character {
    const spritePath = AssetManager.getRandomCharacterSpritePath()
    return new Character(spritePath, world, config)
  }
}