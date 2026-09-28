import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { AssetManager } from '@arcade'
import { PACK_BASE_URL } from '../config/assets'
import { ANIMATION_FRAME_MS, TILE_SIZE } from './constants'
import { availableAssets, getAssetSpritePath } from './assets'
import type { AnimationGroup, AtlasFramePreview, SelectedArea, SourceRect, TileSelection } from './types'

// Served by the Arcade Vite plugin (arcade/vite/arcadePlugin.ts); dev only.
const SPRITE_ATLASES_ENDPOINT = '/arcade-api/sprite-atlases'

/** Atlases record their sheet by pack path, so the data file does not depend on where the pack is served. */
function packRelativePath(url: string): string {
  return url.slice(PACK_BASE_URL.length + 1)
}

export function useAssetEditor(canvasRef: Ref<HTMLCanvasElement | null>) {
  const selectedAsset = ref<string>('')
  const hoveredCell = ref<{ row: number; col: number } | null>(null)
  const selectedCell = ref<{ row: number; col: number } | null>(null)
  const selectedArea = ref<SelectedArea | null>(null)
  const isDragging = ref<boolean>(false)
  const dragStart = ref<{ row: number; col: number } | null>(null)
  const isLoading = ref<boolean>(false)
  const showGrid = ref<boolean>(false)
  const loadedImage = ref<HTMLImageElement | null>(null)
  const atlasData = ref<Map<string, any>>(new Map())
  const currentLabel = ref<string>('')
  const showLabelInput = ref<boolean>(false)
  const activeAnimationName = ref<string>('')
  const animationFrameIndex = ref<number>(0)
  const isAnimationPlaying = ref<boolean>(true)
  const explorerFrameWidth = ref(1)
  const explorerFrameHeight = ref(2)
  const explorerStartRow = ref(0)
  const explorerEndRow = ref(12)
  const explorerStartCol = ref(0)
  const explorerEndCol = ref(24)
  let animationTimer: ReturnType<typeof setInterval> | null = null

  const currentImage = computed(() => loadedImage.value)
  const selectedAssetPath = computed(() => getAssetSpritePath(selectedAsset.value))

  const gridDimensions = computed(() => {
    if (!currentImage.value) return { rows: 0, cols: 0 }

    return {
      cols: Math.floor(currentImage.value.width / TILE_SIZE),
      rows: Math.floor(currentImage.value.height / TILE_SIZE),
    }
  })

  const cellInfo = computed<TileSelection | null>(() => {
    if (selectedArea.value) {
      const { startRow, startCol, endRow, endCol } = selectedArea.value
      return {
        row: Math.min(startRow, endRow),
        col: Math.min(startCol, endCol),
        width: Math.abs(endCol - startCol) + 1,
        height: Math.abs(endRow - startRow) + 1,
      }
    }

    if (selectedCell.value) {
      return {
        row: selectedCell.value.row,
        col: selectedCell.value.col,
        width: 1,
        height: 1,
      }
    }

    return null
  })

  const selectedFrameIndex = computed(() => {
    if (!cellInfo.value || !currentImage.value) return null
    return cellInfo.value.row * gridDimensions.value.cols + cellInfo.value.col
  })

  const selectedSourceRect = computed<SourceRect | null>(() => {
    if (!cellInfo.value || !currentImage.value) return null

    return {
      x: cellInfo.value.col * TILE_SIZE,
      y: cellInfo.value.row * TILE_SIZE,
      width: cellInfo.value.width * TILE_SIZE,
      height: cellInfo.value.height * TILE_SIZE,
    }
  })

  const selectedFramePreviewStyle = computed(() => {
    if (!selectedSourceRect.value || !currentImage.value) return {}
    return getSourceRectPreviewStyle(selectedSourceRect.value, TILE_SIZE * 4, 4)
  })

  const frameCandidates = computed(() => {
    if (!currentImage.value) return []

    const width = clampCellSpan(explorerFrameWidth.value)
    const height = clampCellSpan(explorerFrameHeight.value)
    const startRow = clamp(explorerStartRow.value, 0, gridDimensions.value.rows - height)
    const endRow = clamp(explorerEndRow.value, startRow, gridDimensions.value.rows - height)
    const startCol = clamp(explorerStartCol.value, 0, gridDimensions.value.cols - width)
    const endCol = clamp(explorerEndCol.value, startCol, gridDimensions.value.cols - width)
    const candidates = []

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        candidates.push({ row, col, width, height })
      }
    }

    return candidates
  })

  const currentTileLabel = computed(() => {
    if (!cellInfo.value || !selectedAsset.value) return null
    const atlas = atlasData.value.get(selectedAsset.value)
    if (!atlas) return null

    return currentAssetLabels.value.find((tile: any) => isSameTile(tile, cellInfo.value)) || null
  })

  const currentAssetLabels = computed(() => {
    if (!selectedAsset.value) return []
    const atlas = atlasData.value.get(selectedAsset.value)
    if (!atlas?.frames) return []

    return Object.entries(atlas.frames).map(([label, frameData]: [string, any]) => {
      const frame = frameData.frame
      return {
        label,
        row: frame.y / TILE_SIZE,
        col: frame.x / TILE_SIZE,
        width: frame.w / TILE_SIZE,
        height: frame.h / TILE_SIZE,
        atlasFrame: frameData,
      }
    })
  })

  const currentAtlasFrames = computed<AtlasFramePreview[]>(() => {
    return currentAssetLabels.value.map((tile: any) => ({
      name: tile.label,
      tile,
      rect: tileToSourceRect(tile),
    }))
  })

  const animationGroups = computed<AnimationGroup[]>(() => {
    const groups = new Map<string, AtlasFramePreview[]>()

    currentAtlasFrames.value.forEach((frame) => {
      const groupName = getAnimationGroupName(frame.name)
      if (!groupName) return

      const frames = groups.get(groupName) || []
      frames.push(frame)
      groups.set(groupName, frames)
    })

    return Array.from(groups.entries())
      .map(([name, frames]) => ({
        name,
        frames: frames.sort((a, b) => getAnimationFrameNumber(a.name) - getAnimationFrameNumber(b.name)),
      }))
      .filter((group) => group.frames.length > 1)
  })

  const activeAnimationGroup = computed(() => {
    return animationGroups.value.find((group) => group.name === activeAnimationName.value) || null
  })

  const selectionAnimationFrames = computed<AtlasFramePreview[]>(() => {
    if (!cellInfo.value || !currentImage.value || cellInfo.value.width <= 1) return []

    return Array.from({ length: cellInfo.value.width }, (_, index) => {
      const tile = {
        row: cellInfo.value!.row,
        col: cellInfo.value!.col + index,
        width: 1,
        height: cellInfo.value!.height,
      }

      return {
        name: `selection_${index + 1}`,
        tile,
        rect: tileToSourceRect(tile),
      }
    })
  })

  const selectionAnimationFrameSize = computed(() => {
    if (!cellInfo.value || selectionAnimationFrames.value.length === 0) return null

    return {
      width: 1,
      height: cellInfo.value.height,
      count: selectionAnimationFrames.value.length,
    }
  })

  const previewAnimationFrames = computed(() => {
    if (selectionAnimationFrames.value.length) return selectionAnimationFrames.value
    return activeAnimationGroup.value?.frames || []
  })

  const activeAnimationFrame = computed(() => {
    if (!previewAnimationFrames.value.length) return null
    return previewAnimationFrames.value[animationFrameIndex.value % previewAnimationFrames.value.length]
  })

  const previewAnimationName = computed(() => {
    if (selectionAnimationFrameSize.value) {
      return `Selection loop (${selectionAnimationFrameSize.value.count} frames)`
    }

    return activeAnimationGroup.value?.name || ''
  })

  const isPreviewingSelectionAnimation = computed(() => selectionAnimationFrames.value.length > 0)

  const currentAtlasJson = computed(() => {
    const atlas = atlasData.value.get(selectedAsset.value)

    return {
      frames: atlas?.frames || {},
      meta: {
        image: getAssetFileName(selectedAssetPath.value),
        scale: '1',
      },
    }
  })

  const currentAtlasJsonText = computed(() => JSON.stringify(currentAtlasJson.value, null, 2))

  function getAssetFileName(path: string) {
    return path.split('/').pop() || path
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value || 0, min), Math.max(min, max))
  }

  function clampCellSpan(value: number) {
    return Math.max(1, Math.floor(value || 1))
  }

  function getAnimationGroupName(frameName: string) {
    return frameName.match(/_\d+$/) ? frameName.replace(/_\d+$/, '') : null
  }

  function getAnimationFrameNumber(frameName: string) {
    const match = frameName.match(/_(\d+)$/)
    return match ? Number(match[1]) : 0
  }

  function tileToSourceRect(tile: any): SourceRect {
    if (tile.atlasFrame?.frame) {
      const frame = tile.atlasFrame.frame
      return {
        x: frame.x,
        y: frame.y,
        width: frame.w,
        height: frame.h,
      }
    }

    return {
      x: tile.col * TILE_SIZE,
      y: tile.row * TILE_SIZE,
      width: tile.width * TILE_SIZE,
      height: tile.height * TILE_SIZE,
    }
  }

  function sourceRectToAtlasFrame(rect: SourceRect) {
    return {
      frame: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: rect.width, h: rect.height },
      sourceSize: { w: rect.width, h: rect.height },
    }
  }

  function isSameTile(tile: any, target: TileSelection | null) {
    return Boolean(
      target &&
        tile.row === target.row &&
        tile.col === target.col &&
        tile.width === target.width &&
        tile.height === target.height,
    )
  }

  function getSourceRectPreviewStyle(rect: SourceRect, maxPreviewSize: number, maxScale: number) {
    if (!currentImage.value) return {}

    const scale = Math.min(maxScale, maxPreviewSize / rect.width, maxPreviewSize / rect.height)
    return {
      width: `${rect.width * scale}px`,
      height: `${rect.height * scale}px`,
      backgroundImage: `url(${selectedAssetPath.value})`,
      backgroundSize: `${currentImage.value.width * scale}px ${currentImage.value.height * scale}px`,
      backgroundPosition: `-${rect.x * scale}px -${rect.y * scale}px`,
      backgroundRepeat: 'no-repeat',
      imageRendering: 'pixelated',
    }
  }

  function getAtlasFramePreviewStyle(tile: any) {
    return getSourceRectPreviewStyle(tileToSourceRect(tile), 64, 2)
  }

  function getAnimationPreviewStyle(frame: AtlasFramePreview | null) {
    if (!frame) return {}
    return getSourceRectPreviewStyle(frame.rect, 168, 4)
  }

  function getCandidatePreviewStyle(candidate: TileSelection) {
    return getSourceRectPreviewStyle(tileToSourceRect(candidate), 72, 2)
  }

  function selectAnimation(name: string) {
    activeAnimationName.value = name
    animationFrameIndex.value = 0
  }

  function toggleAnimationPlayback() {
    isAnimationPlaying.value = !isAnimationPlaying.value
  }

  function selectCandidate(candidate: TileSelection) {
    selectedCell.value = null
    selectedArea.value = {
      startRow: candidate.row,
      startCol: candidate.col,
      endRow: candidate.row + candidate.height - 1,
      endCol: candidate.col + candidate.width - 1,
    }
    showLabelInput.value = false
    renderCanvas()
  }

  async function loadAsset(assetKey: string) {
    const existingImage = AssetManager.getSpriteSheet(assetKey)

    if (existingImage) {
      loadedImage.value = existingImage
      await nextTick()
      renderCanvas()
      return
    }

    const assetInfo = availableAssets.find((a) => a.key === assetKey)
    if (!assetInfo) return

    isLoading.value = true
    showGrid.value = false
    loadedImage.value = null

    try {
      const loadedAssetImage = await AssetManager.loadSpriteSheet(assetKey, assetInfo.path)
      loadedImage.value = loadedAssetImage
      await nextTick()

      const canvas = canvasRef.value
      const ctx = canvas?.getContext('2d')

      if (canvas && ctx) {
        canvas.width = loadedAssetImage.width
        canvas.height = loadedAssetImage.height
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(loadedAssetImage, 0, 0)
        isLoading.value = false

        setTimeout(() => {
          showGrid.value = true
          renderCanvas()
        }, 100)
      } else {
        console.error('Failed to render canvas - missing canvas, context, or image')
        isLoading.value = false
      }
    } catch (error) {
      console.error(`Failed to load asset ${assetKey}:`, error)
      isLoading.value = false
    }
  }

  function renderCanvas() {
    const canvas = canvasRef.value
    const ctx = canvas?.getContext('2d')
    const image = currentImage.value

    if (!canvas || !ctx || !image) return

    canvas.width = image.width
    canvas.height = image.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0)

    requestAnimationFrame(() => {
      currentAssetLabels.value.forEach((label) => {
        highlightLabeledTile(ctx, label)
      })

      if (showGrid.value) {
        drawGridOverlay(ctx, image.width, image.height)
      }

      if (selectedArea.value) {
        highlightArea(ctx, selectedArea.value, 'rgba(255, 0, 0, 0.3)')
      }

      if (selectedCell.value && !selectedArea.value) {
        highlightCell(ctx, selectedCell.value.col, selectedCell.value.row, 'rgba(255, 0, 0, 0.3)')
      }

      if (hoveredCell.value && !isDragging.value && !selectedArea.value && hoveredCell.value !== selectedCell.value) {
        highlightCell(ctx, hoveredCell.value.col, hoveredCell.value.row, 'rgba(0, 255, 0, 0.2)')
      }
    })
  }

  function drawGridOverlay(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cols = Math.floor(width / TILE_SIZE)
    const rows = Math.floor(height / TILE_SIZE)
    const totalCells = cols * rows

    if (totalCells > 10000) return

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 0.5
    ctx.beginPath()

    for (let col = 0; col <= cols; col++) {
      const x = col * TILE_SIZE
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }

    for (let row = 0; row <= rows; row++) {
      const y = row * TILE_SIZE
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }

    ctx.stroke()

    const step = cols > 100 ? 10 : cols > 50 ? 5 : cols > 20 ? 3 : 2
    if (step > 5) return

    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'

    for (let col = 0; col < cols; col += step) {
      ctx.fillText(col.toString(), col * TILE_SIZE + 2, 11)
    }

    for (let row = 0; row < rows; row += step) {
      ctx.fillText(row.toString(), 2, row * TILE_SIZE + 12)
    }
  }

  function toggleGrid() {
    showGrid.value = !showGrid.value
    renderCanvas()
  }

  function highlightCell(ctx: CanvasRenderingContext2D, col: number, row: number, color: string) {
    ctx.fillStyle = color
    ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
  }

  function highlightArea(ctx: CanvasRenderingContext2D, area: SelectedArea, color: string) {
    const startCol = Math.min(area.startCol, area.endCol)
    const endCol = Math.max(area.startCol, area.endCol)
    const startRow = Math.min(area.startRow, area.endRow)
    const endRow = Math.max(area.startRow, area.endRow)

    ctx.fillStyle = color
    ctx.fillRect(
      startCol * TILE_SIZE,
      startRow * TILE_SIZE,
      (endCol - startCol + 1) * TILE_SIZE,
      (endRow - startRow + 1) * TILE_SIZE,
    )
  }

  function highlightLabeledTile(ctx: CanvasRenderingContext2D, label: any) {
    const width = label.width * TILE_SIZE
    const height = label.height * TILE_SIZE

    ctx.fillStyle = 'rgba(147, 51, 234, 0.3)'
    ctx.fillRect(label.col * TILE_SIZE, label.row * TILE_SIZE, width, height)
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.8)'
    ctx.lineWidth = 2
    ctx.strokeRect(label.col * TILE_SIZE, label.row * TILE_SIZE, width, height)
  }

  function findLabeledTileAt(row: number, col: number) {
    return currentAssetLabels.value.find((label) => {
      const endRow = label.row + label.height - 1
      const endCol = label.col + label.width - 1
      return row >= label.row && row <= endRow && col >= label.col && col <= endCol
    })
  }

  function getEventCell(event: MouseEvent) {
    const canvas = canvasRef.value
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const actualX = (event.clientX - rect.left) * (canvas.width / rect.width)
    const actualY = (event.clientY - rect.top) * (canvas.height / rect.height)
    const col = Math.floor(actualX / TILE_SIZE)
    const row = Math.floor(actualY / TILE_SIZE)

    if (col < 0 || col >= gridDimensions.value.cols || row < 0 || row >= gridDimensions.value.rows) {
      return null
    }

    return { row, col }
  }

  function handleCanvasMouseDown(event: MouseEvent) {
    if (!currentImage.value) return
    const cell = getEventCell(event)
    if (!cell) return

    const labeledTile = findLabeledTileAt(cell.row, cell.col)
    if (labeledTile) {
      selectAtlasFrame(labeledTile)
      isDragging.value = false
      dragStart.value = null
    } else {
      isDragging.value = true
      dragStart.value = cell
      selectedCell.value = null
      selectedArea.value = null
      renderCanvas()
    }
  }

  function handleCanvasMouseUp(event: MouseEvent) {
    if (!isDragging.value || !dragStart.value) return
    const cell = getEventCell(event)

    if (cell) {
      if (dragStart.value.row === cell.row && dragStart.value.col === cell.col) {
        selectedCell.value = cell
        selectedArea.value = null
      } else {
        selectedArea.value = {
          startRow: dragStart.value.row,
          startCol: dragStart.value.col,
          endRow: cell.row,
          endCol: cell.col,
        }
        selectedCell.value = null
      }
    }

    isDragging.value = false
    dragStart.value = null
    renderCanvas()
  }

  function handleCanvasMouseMove(event: MouseEvent) {
    if (!currentImage.value) return
    const cell = getEventCell(event)
    if (!cell) return

    if (isDragging.value && dragStart.value) {
      selectedArea.value = {
        startRow: dragStart.value.row,
        startCol: dragStart.value.col,
        endRow: cell.row,
        endCol: cell.col,
      }
      renderCanvas()
      return
    }

    if (!hoveredCell.value || hoveredCell.value.row !== cell.row || hoveredCell.value.col !== cell.col) {
      hoveredCell.value = cell
      renderCanvas()
    }
  }

  function copyCoordinates() {
    if (!cellInfo.value) return

    const frame = selectedFrameIndex.value === null ? '' : `, frame: ${selectedFrameIndex.value}`
    const coordinates = `row: ${cellInfo.value.row}, col: ${cellInfo.value.col}, width: ${cellInfo.value.width}, height: ${cellInfo.value.height}${frame}`
    navigator.clipboard.writeText(coordinates)
  }

  function copyFrameSnippet() {
    if (!selectedSourceRect.value) return
    navigator.clipboard.writeText(JSON.stringify(selectedSourceRect.value))
  }

  function copyAtlasJson() {
    navigator.clipboard.writeText(currentAtlasJsonText.value)
  }

  function selectAtlasFrame(tile: any) {
    selectedCell.value = null
    selectedArea.value = {
      startRow: tile.row,
      startCol: tile.col,
      endRow: tile.row + tile.height - 1,
      endCol: tile.col + tile.width - 1,
    }
    currentLabel.value = tile.label
    showLabelInput.value = false
    renderCanvas()
  }

  function showLabelDialog() {
    if (!cellInfo.value) return

    currentLabel.value = currentTileLabel.value?.label || ''
    showLabelInput.value = true
    nextTick(() => {
      const input = document.querySelector('.label-input') as HTMLInputElement
      if (input) input.focus()
    })
  }

  async function saveLabel() {
    if (!selectedSourceRect.value || !selectedAsset.value || !currentLabel.value.trim()) return

    let atlas = atlasData.value.get(selectedAsset.value)
    if (!atlas) {
      atlas = {
        name: selectedAsset.value,
        image: packRelativePath(selectedAssetPath.value),
        frames: {},
        meta: {
          image: getAssetFileName(selectedAssetPath.value),
          scale: '1',
        },
      }
      atlasData.value.set(selectedAsset.value, atlas)
    }

    atlas.image = packRelativePath(selectedAssetPath.value)
    atlas.meta = {
      image: getAssetFileName(selectedAssetPath.value),
      scale: '1',
    }
    atlas.frames[currentLabel.value.trim()] = sourceRectToAtlasFrame(selectedSourceRect.value)

    showLabelInput.value = false
    await syncAtlasesToFile()
  }

  async function removeLabel() {
    if (!cellInfo.value || !selectedAsset.value) return

    const atlas = atlasData.value.get(selectedAsset.value)
    const atlasFrame = currentTileLabel.value
    if (!atlas || !atlasFrame) return

    delete atlas.frames[atlasFrame.label]

    if (Object.keys(atlas.frames).length === 0) {
      atlasData.value.delete(selectedAsset.value)
    }

    showLabelInput.value = false
    await syncAtlasesToFile()
  }

  function cancelLabel() {
    showLabelInput.value = false
    currentLabel.value = ''
  }

  async function syncAtlasesToFile() {
    const atlases = Array.from(atlasData.value.values())
    try {
      const response = await fetch(SPRITE_ATLASES_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atlases }),
      })
      if (!response.ok) throw new Error(await response.text())
    } catch (error) {
      console.error('Failed to sync atlases to file:', error)
    }
  }

  async function loadAtlasesFromFile() {
    try {
      const response = await fetch(SPRITE_ATLASES_ENDPOINT)
      if (!response.ok) throw new Error(await response.text())
      const result = await response.json()
      if (result && result.atlases) {
        atlasData.value.clear()
        result.atlases.forEach((atlas: any) => {
          atlasData.value.set(atlas.name, atlas)
        })
      }
    } catch (error) {
      console.error('Failed to load atlases from file:', error)
    }
  }

  watch(selectedAsset, (newAsset, oldAsset) => {
    if (newAsset && newAsset !== oldAsset) {
      selectedCell.value = null
      selectedArea.value = null
      hoveredCell.value = null
      animationFrameIndex.value = 0
      loadAsset(newAsset)
    }
  })

  watch(
    animationGroups,
    (groups) => {
      if (!groups.length) {
        activeAnimationName.value = ''
        animationFrameIndex.value = 0
        return
      }

      if (!groups.some((group) => group.name === activeAnimationName.value)) {
        activeAnimationName.value = groups[0].name
        animationFrameIndex.value = 0
      }
    },
    { immediate: true },
  )

  watch(activeAnimationName, () => {
    if (!isPreviewingSelectionAnimation.value) {
      animationFrameIndex.value = 0
    }
  })

  watch(selectionAnimationFrames, () => {
    if (isPreviewingSelectionAnimation.value) {
      animationFrameIndex.value = 0
    }
  })

  onMounted(async () => {
    animationTimer = setInterval(() => {
      if (!isAnimationPlaying.value || !previewAnimationFrames.value.length) return
      animationFrameIndex.value = (animationFrameIndex.value + 1) % previewAnimationFrames.value.length
    }, ANIMATION_FRAME_MS)

    await loadAtlasesFromFile()

    AssetManager.preloadCommonAssets().catch((error) => {
      console.warn('Failed to preload assets:', error)
    })

    if (availableAssets.length > 0) {
      selectedAsset.value = availableAssets[0].key
    }
  })

  onUnmounted(() => {
    if (animationTimer) {
      clearInterval(animationTimer)
      animationTimer = null
    }
  })

  return {
    activeAnimationFrame,
    activeAnimationName,
    animationFrameIndex,
    animationGroups,
    availableAssets,
    cancelLabel,
    cellInfo,
    copyAtlasJson,
    copyCoordinates,
    copyFrameSnippet,
    currentAtlasFrames,
    currentAtlasJsonText,
    currentImage,
    currentLabel,
    currentTileLabel,
    frameCandidates,
    getAnimationPreviewStyle,
    getAtlasFramePreviewStyle,
    getCandidatePreviewStyle,
    gridDimensions,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    isAnimationPlaying,
    isPreviewingSelectionAnimation,
    isLoading,
    previewAnimationFrames,
    previewAnimationName,
    removeLabel,
    saveLabel,
    selectAnimation,
    selectAtlasFrame,
    selectCandidate,
    selectedAsset,
    selectedFrameIndex,
    selectedFramePreviewStyle,
    selectionAnimationFrameSize,
    selectedSourceRect,
    showGrid,
    showLabelDialog,
    showLabelInput,
    toggleAnimationPlayback,
    toggleGrid,
  }
}
