import type { ProfileCardSize } from './types'

export interface ProfileBentoLayoutItem {
  id: string
  size: ProfileCardSize
}

export interface ProfileBentoLayoutRect {
  id: string
  left: number
  top: number
  width: number
  height: number
}

export interface ProfileBentoLayout {
  height: number
  rects: Map<string, ProfileBentoLayoutRect>
}

interface ProfileBentoUnits {
  columns: number
  rows: number
}

const desktopColumns = 4

export function createProfileBentoLayout(
  items: ProfileBentoLayoutItem[],
  containerWidth: number,
  gap: number,
): ProfileBentoLayout {
  let cellSize = Math.max(1, (containerWidth - gap * (desktopColumns - 1)) / desktopColumns)
  let occupied: boolean[][] = []
  let rects = new Map<string, ProfileBentoLayoutRect>()
  let rows = 0

  for (let item of items) {
    let units = cardUnits(item.size)
    let position = findOpenPosition(occupied, units)
    occupyCells(occupied, position, units)
    rows = Math.max(rows, position.row + units.rows)
    rects.set(item.id, rectForItem(item.id, position, units, cellSize, gap))
  }

  return {
    height: rows ? rows * cellSize + (rows - 1) * gap : 0,
    rects,
  }
}

function findOpenPosition(occupied: boolean[][], units: ProfileBentoUnits) {
  for (let row = 0; ; row++) {
    for (let column = 0; column <= desktopColumns - units.columns; column++) {
      if (hasOpenCells(occupied, row, column, units)) {
        return { row, column }
      }
    }
  }
}

function hasOpenCells(
  occupied: boolean[][],
  row: number,
  column: number,
  units: ProfileBentoUnits,
) {
  for (let rowOffset = 0; rowOffset < units.rows; rowOffset++) {
    for (let columnOffset = 0; columnOffset < units.columns; columnOffset++) {
      if (occupied[row + rowOffset]?.[column + columnOffset]) {
        return false
      }
    }
  }
  return true
}

function occupyCells(
  occupied: boolean[][],
  position: { row: number; column: number },
  units: ProfileBentoUnits,
) {
  for (let rowOffset = 0; rowOffset < units.rows; rowOffset++) {
    let row = (occupied[position.row + rowOffset] ||= [])
    for (let columnOffset = 0; columnOffset < units.columns; columnOffset++) {
      row[position.column + columnOffset] = true
    }
  }
}

function rectForItem(
  id: string,
  position: { row: number; column: number },
  units: ProfileBentoUnits,
  cellSize: number,
  gap: number,
): ProfileBentoLayoutRect {
  return {
    id,
    left: position.column * (cellSize + gap),
    top: position.row * (cellSize + gap),
    width: units.columns * cellSize + (units.columns - 1) * gap,
    height: units.rows * cellSize + (units.rows - 1) * gap,
  }
}

function cardUnits(size: ProfileCardSize): ProfileBentoUnits {
  return {
    '1x1': { columns: 1, rows: 1 },
    '2x1': { columns: 2, rows: 1 },
    '2x2': { columns: 2, rows: 2 },
    '4x1': { columns: 4, rows: 1 },
    '4x2': { columns: 4, rows: 2 },
  }[size]
}
