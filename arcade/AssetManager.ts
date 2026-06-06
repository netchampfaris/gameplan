interface SpriteSheet {
  image: HTMLImageElement
  loaded: boolean
}

export class AssetManager {
  private static readonly BASE_ASSET_PATH = '/assets/gameplan/limezu-modern-interiors'
  private static readonly CHARACTER_PATH =
    '/2_Characters/Character_Generator/0_Premade_Characters/48x48'
  private static readonly INTERIORS_PATH = '/1_Interiors/48x48'

  private static spriteSheets: Map<string, SpriteSheet> = new Map()

  static getCharacterSpritePath(characterNumber: number): string {
    const paddedNumber = characterNumber.toString().padStart(2, '0')
    return `${this.BASE_ASSET_PATH}${this.CHARACTER_PATH}/Premade_Character_48x48_${paddedNumber}.png`
  }

  static getRandomCharacterSpritePath(): string {
    // Characters are numbered 01-20 based on the file listing
    const randomNumber = Math.floor(Math.random() * 20) + 1
    return this.getCharacterSpritePath(randomNumber)
  }

  static getAllCharacterNumbers(): number[] {
    return Array.from({ length: 20 }, (_, i) => i + 1)
  }

  static getRoomBuilderSpritePath(): string {
    return `${this.BASE_ASSET_PATH}${this.INTERIORS_PATH}/Room_Builder_48x48.png`
  }

  static getLivingRoomSpritePath(): string {
    return `${this.BASE_ASSET_PATH}${this.INTERIORS_PATH}/Theme_Sorter_48x48/2_LivingRoom_48x48.png`
  }

  static getGenericSpritePath(): string {
    return `${this.BASE_ASSET_PATH}${this.INTERIORS_PATH}/Theme_Sorter_48x48/1_Generic_48x48.png`
  }

  static async loadSpriteSheet(key: string, path: string): Promise<HTMLImageElement> {
    // Return immediately if already loaded
    const existing = this.spriteSheets.get(key)
    if (existing?.loaded) {
      return existing.image
    }

    // If currently loading, wait for it
    if (existing && !existing.loaded) {
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          const current = this.spriteSheets.get(key)
          if (current?.loaded) {
            resolve(current.image)
          } else {
            // Check again in a short interval
            setTimeout(checkLoaded, 10)
          }
        }
        checkLoaded()
      })
    }

    // Start new loading
    return new Promise((resolve, reject) => {
      const image = new Image()
      const spriteSheet: SpriteSheet = { image, loaded: false }
      this.spriteSheets.set(key, spriteSheet)

      image.onload = () => {
        spriteSheet.loaded = true
        resolve(image)
      }

      image.onerror = () => {
        // Remove failed attempt from cache
        this.spriteSheets.delete(key)
        reject(new Error(`Failed to load sprite sheet: ${path}`))
      }

      // Enable browser caching with crossOrigin
      image.crossOrigin = 'anonymous'
      image.src = path
    })
  }

  static async loadRoomBuilderSprites(): Promise<HTMLImageElement> {
    return this.loadSpriteSheet('room_builder', this.getRoomBuilderSpritePath())
  }

  static async loadLivingRoomSprites(): Promise<HTMLImageElement> {
    return this.loadSpriteSheet('living_room', this.getLivingRoomSpritePath())
  }

  static getSpriteSheet(key: string): HTMLImageElement | null {
    const spriteSheet = this.spriteSheets.get(key)
    return spriteSheet?.loaded ? spriteSheet.image : null
  }

  static async preloadCommonAssets(): Promise<void> {
    const commonAssets = [
      { key: 'room_builder', path: this.getRoomBuilderSpritePath() },
      { key: 'living_room', path: this.getLivingRoomSpritePath() },
      { key: 'generic', path: this.getGenericSpritePath() },
    ]

    const preloadPromises = commonAssets.map(asset =>
      this.loadSpriteSheet(asset.key, asset.path).catch(error => {
        console.warn(`Failed to preload ${asset.key}:`, error)
      })
    )

    await Promise.allSettled(preloadPromises)
  }

  static extractSprite(
    ctx: CanvasRenderingContext2D,
    spriteSheet: HTMLImageElement,
    sourceX: number,
    sourceY: number,
    destX: number,
    destY: number,
    size: number = 48
  ) {
    ctx.drawImage(
      spriteSheet,
      sourceX, sourceY, size, size,
      destX, destY, size, size
    )
  }
}
