export interface AssetInfo {
  key: string
  name: string
  path: string
  description: string
}

export interface TileSelection {
  row: number
  col: number
  width: number
  height: number
}

export interface SelectedArea {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

export interface SourceRect {
  x: number
  y: number
  width: number
  height: number
}

export interface AtlasFramePreview {
  name: string
  tile: any
  rect: SourceRect
}

export interface AnimationGroup {
  name: string
  frames: AtlasFramePreview[]
}
