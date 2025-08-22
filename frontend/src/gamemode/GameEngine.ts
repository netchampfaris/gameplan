import type { GameState, GameWorldConfig } from './types'
import { Time } from './Time'
import { World } from './World'
import { Character } from './Character'

export class GameEngine {
  // Canvas properties
  private canvas: HTMLCanvasElement | null
  private ctx: CanvasRenderingContext2D | null

  // Game loop properties
  private animationFrameId: number | null
  private lastTime: number = 0
  private deltaTime: number = 0

  // Game state properties
  public gameState: GameState = 'stopped'
  public fps: number = 0
  public frameCount: number = 0

  // Game entities
  public readonly players: Character[] = []
  public readonly gameObjects: any[] = []
  public readonly world: World

  // Input handling
  private readonly keys: { [key: string]: boolean } = {}
  private playerCharacter: Character | null = null
  private readonly keydownHandler: (event: KeyboardEvent) => void
  private readonly keyupHandler: (event: KeyboardEvent) => void

  // Configuration
  private readonly WORLD_CONFIG: GameWorldConfig = {
    width: 768,
    height: 576,
    tileSize: 48,
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.animationFrameId = null
    this.lastTime = 0
    this.deltaTime = 0

    // Bind event handlers
    this.keydownHandler = (event: KeyboardEvent) => {
      this.keys[event.key.toLowerCase()] = true
    }
    this.keyupHandler = (event: KeyboardEvent) => {
      this.keys[event.key.toLowerCase()] = false
    }

    // Initialize game world
    this.world = new World(this.WORLD_CONFIG)

    if (this.canvas) {
      this.canvas.width = this.world.width
      this.canvas.height = this.world.height
    }

    // Create a test character
    this.createTestCharacter()

    // Setup keyboard input
    this.setupKeyboardInput()
  }

  private createTestCharacter() {
    // Create a random character for variety
    const character = Character.createRandom(this.world, {
      tilesPerSecond: 2, // Walking pace: 2 tiles per second
    })

    // Center the character after creation
    character.setPosition(
      this.world.width / 2 - character.width / 2, // Center horizontally
      this.world.height / 2 - character.height / 2, // Center vertically
    )

    // Start with idle animation
    character.setAnimation('idle')
    this.players.push(character)
    this.playerCharacter = character
  }

  // Method to create a specific character by number
  public createCharacter(characterNumber: number): Character {
    const character = Character.createWithCharacterNumber(characterNumber, this.world, {
      tilesPerSecond: 2,
    })

    // Position at a random spawn point (for demonstration)
    const spawnX = Math.random() * (this.world.width - character.width)
    const spawnY = Math.random() * (this.world.height - character.height)
    character.setPosition(spawnX, spawnY)

    character.setAnimation('idle')
    this.players.push(character)

    return character
  }

  private setupKeyboardInput() {
    // Add event listeners for keyboard input
    window.addEventListener('keydown', this.keydownHandler)
    window.addEventListener('keyup', this.keyupHandler)
  }

  private update(dt: number) {
    // Update global time
    Time.setDeltaTime(dt)

    // Handle player input and movement
    this.handlePlayerMovement()

    // Update all characters
    for (const character of this.players) {
      character.update(dt)
    }

    // Placeholder: just update frame count for now
    this.frameCount++
  }

  private handlePlayerMovement() {
    if (!this.playerCharacter) return

    let isMoving = false

    // Check for movement keys (WASD) - priority: last pressed direction
    if (this.keys['w'] || this.keys['arrowup']) {
      this.playerCharacter.move('up')
      isMoving = true
    }
    if (this.keys['s'] || this.keys['arrowdown']) {
      this.playerCharacter.move('down')
      isMoving = true
    }
    if (this.keys['a'] || this.keys['arrowleft']) {
      this.playerCharacter.move('left')
      isMoving = true
    }
    if (this.keys['d'] || this.keys['arrowright']) {
      this.playerCharacter.move('right')
      isMoving = true
    }

    // If no movement keys are pressed, stop moving
    if (!isMoving) {
      this.playerCharacter.stopMoving()
    }
  }

  private render() {
    if (!this.ctx) return

    // Render world (background and grid)
    this.world.render(this.ctx)

    // Render all characters
    for (const character of this.players) {
      character.render(this.ctx)
    }

    // Render debug info
    this.renderDebugInfo()
  }

  private renderDebugInfo() {
    if (!this.ctx) return

    const DEBUG_CONFIG = {
      textColor: '#fff',
      font: '14px monospace',
      padding: 10,
      lineHeight: 20,
    }

    this.ctx.fillStyle = DEBUG_CONFIG.textColor
    this.ctx.font = DEBUG_CONFIG.font
    this.ctx.fillText(`FPS: ${this.fps}`, DEBUG_CONFIG.padding, DEBUG_CONFIG.lineHeight)
    this.ctx.fillText(
      `Players: ${this.players.length}`,
      DEBUG_CONFIG.padding,
      DEBUG_CONFIG.lineHeight * 2,
    )
  }

  private gameLoop = (currentTime: number) => {
    if (this.gameState !== 'running') {
      this.animationFrameId = requestAnimationFrame(this.gameLoop)
      return
    }

    // Calculate delta time
    this.deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // Calculate FPS
    this.fps = Math.round(1000 / this.deltaTime)

    // Update game logic
    this.update(this.deltaTime)

    // Render frame
    this.render()

    // Continue the loop
    this.animationFrameId = requestAnimationFrame(this.gameLoop)
  }

  public start() {
    if (this.gameState === 'running') return

    this.gameState = 'running'
    this.lastTime = performance.now()

    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this.gameLoop)
    }
  }

  public pause() {
    this.gameState = 'paused'
  }

  public stop() {
    this.gameState = 'stopped'
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  public destroy() {
    this.stop()
    // Remove keyboard event listeners
    window.removeEventListener('keydown', this.keydownHandler)
    window.removeEventListener('keyup', this.keyupHandler)
    this.canvas = null
    this.ctx = null
  }
}