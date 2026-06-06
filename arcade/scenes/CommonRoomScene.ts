import Phaser from 'phaser'
import { GameAssetKeys, GameAssetPaths, TILE_SIZE } from '../config/assets'
import { registerSpriteAtlasFrames } from '../config/spriteAtlas'
import { KeyboardMovementController } from '../input/KeyboardMovementController'
import { PlayerAvatar } from '../objects/PlayerAvatar'

const COMMON_ROOM_SCENE_KEY = 'scene:common-room'
const PLAYER_ATLAS_NAME = 'character_01'

export class CommonRoomScene extends Phaser.Scene {
  private player: PlayerAvatar | null = null
  private movement: KeyboardMovementController | null = null
  private background: Phaser.GameObjects.Rectangle | null = null
  private grid: Phaser.GameObjects.Graphics | null = null

  constructor() {
    super(COMMON_ROOM_SCENE_KEY)
  }

  preload() {
    this.load.image(GameAssetKeys.characters.player, GameAssetPaths.characters.player)
    this.load.json(GameAssetKeys.spriteAtlases, GameAssetPaths.spriteAtlases)
  }

  create() {
    registerSpriteAtlasFrames(this, PLAYER_ATLAS_NAME, GameAssetKeys.characters.player)
    this.createRoom(this.scale.width, this.scale.height)
    this.createPlayer()
    this.setupCamera(this.scale.width, this.scale.height)
    this.addDebugLabel()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeRoom, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeRoom, this)
    })
  }

  update() {
    if (!this.player || !this.movement) return

    const input = this.movement.read()
    this.player.move(input.velocity, input.direction, input.isSitting)
  }

  private createRoom(width: number, height: number) {
    this.background?.destroy()
    this.grid?.destroy()

    this.background = this.add.rectangle(0, 0, width, height, 0x1f1f1f).setOrigin(0).setDepth(-20)
    this.grid = this.add.graphics().setDepth(-10)
    this.grid.lineStyle(1, 0x3a3a3a, 0.55)

    for (let x = 0; x <= width; x += TILE_SIZE) {
      this.grid.lineBetween(x, 0, x, height)
    }

    for (let y = 0; y <= height; y += TILE_SIZE) {
      this.grid.lineBetween(0, y, width, y)
    }
  }

  private createPlayer() {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is not available')
    }

    this.player = new PlayerAvatar(
      this,
      GameAssetKeys.characters.player,
      this.scale.width / 2,
      this.scale.height / 2,
    )
    this.player.setCollideWorldBounds(true)
    this.movement = new KeyboardMovementController(this.input.keyboard)
  }

  private setupCamera(width: number, height: number) {
    this.physics.world.setBounds(0, 0, width, height)
    this.cameras.main.setBounds(0, 0, width, height)
    this.cameras.main.setZoom(1)

    if (this.player) {
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    }
  }

  private resizeRoom(gameSize: Phaser.Structs.Size) {
    this.createRoom(gameSize.width, gameSize.height)
    this.setupCamera(gameSize.width, gameSize.height)
  }

  private addDebugLabel() {
    if (!import.meta.env.DEV) return

    this.add
      .text(12, 12, 'Arcade: Common Room', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(10_000)
  }
}
