export type GameState = 'stopped' | 'running' | 'paused'

export interface GameWorldConfig {
  width: number
  height: number
  tileSize: number
}

export interface CharacterConfig {
  tilesPerSecond?: number
}

export interface TileData {
  type: 'floor' | 'wall' | 'furniture' | 'decoration'
  spriteX: number
  spriteY: number
  spriteSheet: string
  solid?: boolean
}

export interface WorldTile {
  x: number
  y: number
  floor?: TileData
  wall?: TileData
  decoration?: TileData
}