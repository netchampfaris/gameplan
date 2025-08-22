export type GameState = 'stopped' | 'running' | 'paused'

export interface GameWorldConfig {
  width: number
  height: number
  tileSize: number
}

export interface CharacterConfig {
  tilesPerSecond?: number
}