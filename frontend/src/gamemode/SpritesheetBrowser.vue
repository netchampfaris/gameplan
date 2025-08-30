<script setup lang="ts">
import { ref, onMounted, computed, watch, useTemplateRef, nextTick } from 'vue'
import { Select, TextInput } from 'frappe-ui'
import { AssetManager } from '@/gamemode'
import { createResource } from 'frappe-ui'

interface AssetInfo {
  key: string
  name: string
  path: string
  description: string
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')
const selectedAsset = ref<string>('')
const hoveredCell = ref<{ row: number; col: number } | null>(null)
const selectedCell = ref<{ row: number; col: number } | null>(null)
const selectedArea = ref<{
  startRow: number
  startCol: number
  endRow: number
  endCol: number
} | null>(null)
const isDragging = ref<boolean>(false)
const dragStart = ref<{ row: number; col: number } | null>(null)
const isLoading = ref<boolean>(false)
const showGrid = ref<boolean>(false)
const loadedImage = ref<HTMLImageElement | null>(null)
const spritesheetData = ref<Map<string, any>>(new Map())
const currentLabel = ref<string>('')
const showLabelInput = ref<boolean>(false)

const TILE_SIZE = 48

// API resources for syncing with JSON file
const loadLabelsResource = createResource({
  url: 'gameplan.api.load_sprite_labels',
  auto: false,
})

const saveLabelsResource = createResource({
  url: 'gameplan.api.save_sprite_labels',
  auto: false,
})

const availableAssets: AssetInfo[] = [
  {
    key: 'room_builder',
    name: 'Room Builder',
    path: AssetManager.getRoomBuilderSpritePath(),
    description: 'Floors, walls, baseboards, and room construction elements',
  },
  {
    key: 'living_room',
    name: 'Living Room',
    path: AssetManager.getLivingRoomSpritePath(),
    description: 'Couches, tables, plants, and living room furniture',
  },
  {
    key: 'generic',
    name: 'Generic',
    path: AssetManager.getGenericSpritePath(),
    description: 'General furniture and decorative items',
  },
]

// Map asset keys to their full sprite paths
const getAssetSpritePath = (assetKey: string): string => {
  const asset = availableAssets.find((a) => a.key === assetKey)
  return asset?.path || ''
}

const currentImage = computed(() => {
  return loadedImage.value
})

const gridDimensions = computed(() => {
  if (!currentImage.value) return { rows: 0, cols: 0 }

  const cols = Math.floor(currentImage.value.width / TILE_SIZE)
  const rows = Math.floor(currentImage.value.height / TILE_SIZE)

  return { rows, cols }
})

const cellInfo = computed(() => {
  if (selectedArea.value) {
    const { startRow, startCol, endRow, endCol } = selectedArea.value
    const width = Math.abs(endCol - startCol) + 1
    const height = Math.abs(endRow - startRow) + 1
    const col = Math.min(startCol, endCol)
    const row = Math.min(startRow, endRow)

    return {
      row,
      col,
      width,
      height,
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

// Get existing label for current selection
const currentTileLabel = computed(() => {
  if (!cellInfo.value || !selectedAsset.value) return null
  const spritesheet = spritesheetData.value.get(selectedAsset.value)
  if (!spritesheet) return null

  return (
    spritesheet.tiles.find(
      (tile: any) =>
        tile.row === cellInfo.value!.row &&
        tile.col === cellInfo.value!.col &&
        tile.width === cellInfo.value!.width &&
        tile.height === cellInfo.value!.height,
    ) || null
  )
})

// Get all labeled tiles for the current asset
const currentAssetLabels = computed(() => {
  if (!selectedAsset.value) return []
  const spritesheet = spritesheetData.value.get(selectedAsset.value)
  return spritesheet?.tiles || []
})

async function loadAsset(assetKey: string) {
  // Check if already loaded
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
    const image = loadedAssetImage

    if (canvas && ctx && image) {
      canvas.width = image.width
      canvas.height = image.height
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)

      isLoading.value = false

      // Enable grid after a delay to let user see the image first
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

  // Set canvas size to match image
  canvas.width = image.width
  canvas.height = image.height

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Always draw the spritesheet first
  ctx.drawImage(image, 0, 0)

  requestAnimationFrame(() => {
    // Always show labeled tiles
    currentAssetLabels.value.forEach((label) => {
      highlightLabeledTile(ctx, label)
    })

    // Only draw grid if enabled
    if (showGrid.value) {
      // Draw grid overlay in next frame for better performance
      drawGridOverlay(ctx, image.width, image.height)
    }

    // Highlight selected area if any
    if (selectedArea.value) {
      highlightArea(ctx, selectedArea.value, 'rgba(255, 0, 0, 0.3)')
    }

    // Highlight selected cell if any
    if (selectedCell.value && !selectedArea.value) {
      highlightCell(ctx, selectedCell.value.col, selectedCell.value.row, 'rgba(255, 0, 0, 0.3)')
    }

    // Highlight hovered cell if any (only when not dragging)
    if (
      hoveredCell.value &&
      !isDragging.value &&
      !selectedArea.value &&
      hoveredCell.value !== selectedCell.value
    ) {
      highlightCell(ctx, hoveredCell.value.col, hoveredCell.value.row, 'rgba(0, 255, 0, 0.2)')
    }
  })
}

function drawGridOverlay(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const cols = Math.floor(width / TILE_SIZE)
  const rows = Math.floor(height / TILE_SIZE)
  const totalCells = cols * rows

  // Skip grid if too many lines (performance protection)
  if (totalCells > 10000) {
    return
  }

  // Optimize: Use single path for all lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 0.5
  ctx.beginPath()

  // Draw all vertical lines in one path
  for (let col = 0; col <= cols; col++) {
    const x = col * TILE_SIZE
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }

  // Draw all horizontal lines in the same path
  for (let row = 0; row <= rows; row++) {
    const y = row * TILE_SIZE
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }

  // Single stroke call for all lines
  ctx.stroke()

  // Much more aggressive text reduction
  const step = cols > 100 ? 10 : cols > 50 ? 5 : cols > 20 ? 3 : 2

  if (step <= 5) {
    // Only show numbers if not too dense
    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'

    // Column numbers (very reduced)
    for (let col = 0; col < cols; col += step) {
      const x = col * TILE_SIZE
      ctx.fillText(col.toString(), x + 2, 11)
    }

    // Row numbers (very reduced)
    for (let row = 0; row < rows; row += step) {
      const y = row * TILE_SIZE
      ctx.fillText(row.toString(), 2, y + 12)
    }
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

function highlightArea(
  ctx: CanvasRenderingContext2D,
  area: { startRow: number; startCol: number; endRow: number; endCol: number },
  color: string,
) {
  const startCol = Math.min(area.startCol, area.endCol)
  const endCol = Math.max(area.startCol, area.endCol)
  const startRow = Math.min(area.startRow, area.endRow)
  const endRow = Math.max(area.startRow, area.endRow)

  const width = (endCol - startCol + 1) * TILE_SIZE
  const height = (endRow - startRow + 1) * TILE_SIZE

  ctx.fillStyle = color
  ctx.fillRect(startCol * TILE_SIZE, startRow * TILE_SIZE, width, height)
}

function highlightLabeledTile(ctx: CanvasRenderingContext2D, label: any) {
  const width = label.width * TILE_SIZE
  const height = label.height * TILE_SIZE

  ctx.fillStyle = 'rgba(147, 51, 234, 0.3)' // Purple overlay
  ctx.fillRect(label.col * TILE_SIZE, label.row * TILE_SIZE, width, height)

  // Add border
  ctx.strokeStyle = 'rgba(147, 51, 234, 0.8)'
  ctx.lineWidth = 2
  ctx.strokeRect(label.col * TILE_SIZE, label.row * TILE_SIZE, width, height)
}

// Check if a point is inside a labeled tile
function findLabeledTileAt(row: number, col: number) {
  return currentAssetLabels.value.find((label) => {
    const endRow = label.row + label.height - 1
    const endCol = label.col + label.width - 1
    return row >= label.row && row <= endRow && col >= label.col && col <= endCol
  })
}

function handleCanvasMouseDown(event: MouseEvent) {
  if (!currentImage.value) return

  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Account for canvas scaling
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  const actualX = x * scaleX
  const actualY = y * scaleY

  const col = Math.floor(actualX / TILE_SIZE)
  const row = Math.floor(actualY / TILE_SIZE)

  if (col >= 0 && col < gridDimensions.value.cols && row >= 0 && row < gridDimensions.value.rows) {
    // Check if clicking on a labeled tile
    const labeledTile = findLabeledTileAt(row, col)

    if (labeledTile) {
      // Select the labeled tile
      selectedCell.value = null
      selectedArea.value = {
        startRow: labeledTile.row,
        startCol: labeledTile.col,
        endRow: labeledTile.row + labeledTile.height - 1,
        endCol: labeledTile.col + labeledTile.width - 1,
      }
      isDragging.value = false
      dragStart.value = null
      renderCanvas()
    } else {
      // Normal drag start
      isDragging.value = true
      dragStart.value = { row, col }
      selectedCell.value = null
      selectedArea.value = null
      renderCanvas()
    }
  }
}

function handleCanvasMouseUp(event: MouseEvent) {
  if (!isDragging.value || !dragStart.value) return

  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Account for canvas scaling
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  const actualX = x * scaleX
  const actualY = y * scaleY

  const col = Math.floor(actualX / TILE_SIZE)
  const row = Math.floor(actualY / TILE_SIZE)

  if (col >= 0 && col < gridDimensions.value.cols && row >= 0 && row < gridDimensions.value.rows) {
    // Check if it's just a single click (no drag)
    if (dragStart.value.row === row && dragStart.value.col === col) {
      selectedCell.value = { row, col }
      selectedArea.value = null
    } else {
      // Multi-tile selection
      selectedArea.value = {
        startRow: dragStart.value.row,
        startCol: dragStart.value.col,
        endRow: row,
        endCol: col,
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

  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  const actualX = x * scaleX
  const actualY = y * scaleY

  const col = Math.floor(actualX / TILE_SIZE)
  const row = Math.floor(actualY / TILE_SIZE)

  if (col >= 0 && col < gridDimensions.value.cols && row >= 0 && row < gridDimensions.value.rows) {
    if (isDragging.value && dragStart.value) {
      // Update drag selection area
      selectedArea.value = {
        startRow: dragStart.value.row,
        startCol: dragStart.value.col,
        endRow: row,
        endCol: col,
      }
      renderCanvas()
    } else {
      // Normal hover behavior
      const newHovered = { row, col }
      if (
        !hoveredCell.value ||
        hoveredCell.value.row !== newHovered.row ||
        hoveredCell.value.col !== newHovered.col
      ) {
        hoveredCell.value = newHovered
        renderCanvas()
      }
    }
  }
}

function copyCoordinates() {
  if (cellInfo.value) {
    const coordinates = `row: ${cellInfo.value.row}, col: ${cellInfo.value.col}, width: ${cellInfo.value.width}, height: ${cellInfo.value.height}`
    navigator.clipboard.writeText(coordinates)
  }
}

function showLabelDialog() {
  if (cellInfo.value) {
    currentLabel.value = currentTileLabel.value?.label || ''
    showLabelInput.value = true
    nextTick(() => {
      // Focus the input field
      const input = document.querySelector('.label-input') as HTMLInputElement
      if (input) input.focus()
    })
  }
}

async function saveLabel() {
  if (!cellInfo.value || !selectedAsset.value || !currentLabel.value.trim()) return

  // Get or create spritesheet data
  let spritesheet = spritesheetData.value.get(selectedAsset.value)
  if (!spritesheet) {
    spritesheet = {
      name: selectedAsset.value,
      spritesheet: getAssetSpritePath(selectedAsset.value),
      tiles: [],
    }
    spritesheetData.value.set(selectedAsset.value, spritesheet)
  }

  const tileData = {
    label: currentLabel.value.trim(),
    row: cellInfo.value.row,
    col: cellInfo.value.col,
    width: cellInfo.value.width,
    height: cellInfo.value.height,
  }

  // Check if tile already exists and update it, otherwise add new tile
  const existingIndex = spritesheet.tiles.findIndex(
    (tile: any) =>
      tile.row === cellInfo.value!.row &&
      tile.col === cellInfo.value!.col &&
      tile.width === cellInfo.value!.width &&
      tile.height === cellInfo.value!.height,
  )

  if (existingIndex >= 0) {
    spritesheet.tiles[existingIndex] = tileData
  } else {
    spritesheet.tiles.push(tileData)
  }

  showLabelInput.value = false

  // Sync with JSON file
  await syncLabelsToFile()
}

async function removeLabel() {
  if (!cellInfo.value || !selectedAsset.value) return

  const spritesheet = spritesheetData.value.get(selectedAsset.value)
  if (!spritesheet) return

  // Remove the tile
  const tileIndex = spritesheet.tiles.findIndex(
    (tile: any) =>
      tile.row === cellInfo.value!.row &&
      tile.col === cellInfo.value!.col &&
      tile.width === cellInfo.value!.width &&
      tile.height === cellInfo.value!.height,
  )

  if (tileIndex >= 0) {
    spritesheet.tiles.splice(tileIndex, 1)
  }

  // Remove spritesheet if no tiles left
  if (spritesheet.tiles.length === 0) {
    spritesheetData.value.delete(selectedAsset.value)
  }

  showLabelInput.value = false

  // Sync with JSON file
  await syncLabelsToFile()
}

function cancelLabel() {
  showLabelInput.value = false
  currentLabel.value = ''
}

async function syncLabelsToFile() {
  const spritesheetArray = Array.from(spritesheetData.value.values())
  try {
    await saveLabelsResource.submit({ spritesheets: spritesheetArray })
  } catch (error) {
    console.error('Failed to sync labels to file:', error)
  }
}

async function loadLabelsFromFile() {
  try {
    const result = await loadLabelsResource.submit()
    if (result && result.spritesheets) {
      spritesheetData.value.clear()
      result.spritesheets.forEach((spritesheet: any) => {
        spritesheetData.value.set(spritesheet.name, spritesheet)
      })
    }
  } catch (error) {
    console.error('Failed to load labels from file:', error)
  }
}

watch(selectedAsset, (newAsset, oldAsset) => {
  if (newAsset && newAsset !== oldAsset) {
    selectedCell.value = null
    selectedArea.value = null
    hoveredCell.value = null
    loadAsset(newAsset)
  }
})

onMounted(async () => {
  // Load existing labels from JSON file
  await loadLabelsFromFile()

  // Preload common assets in background for better performance
  AssetManager.preloadCommonAssets().catch((error) => {
    console.warn('Failed to preload assets:', error)
  })

  // Load the first asset by default
  if (availableAssets.length > 0) {
    selectedAsset.value = availableAssets[0].key
  }
})
</script>

<template>
  <div class="bg-surface-white h-screen flex flex-col overflow-hidden">
    <div class="flex-none p-6 pb-4">
      <div class="mb-4">
        <h1 class="text-lg font-bold text-ink-gray-9">LimeZu Asset Browser</h1>
      </div>

      <div class="flex mb-6 gap-4">
        <!-- Asset Selection -->
        <div class="w-1/3">
          <Select
            v-model="selectedAsset"
            :options="
              availableAssets.map((asset: AssetInfo) => ({ value: asset.key, label: asset.name }))
            "
          >
          </Select>
          <div v-if="selectedAsset" class="mt-2 text-p-sm text-ink-gray-6">
            {{ availableAssets.find((a: AssetInfo) => a.key === selectedAsset)?.description }}
          </div>
        </div>

        <!-- Grid Toggle -->
        <div v-if="currentImage" class="flex-none">
          <button
            @click="toggleGrid"
            :class="[
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              showGrid
                ? 'bg-surface-gray-3 text-ink-black'
                : 'bg-surface-gray-1 text-ink-gray-6 hover:bg-surface-gray-2',
            ]"
          >
            {{ showGrid ? 'Hide Grid' : 'Show Grid' }}
          </button>
        </div>
        <!-- Selected Cell Info -->
        <div v-if="cellInfo" class="flex gap-3 p-3 bg-surface-gray-1 rounded-lg">
          <div class="grid grid-cols-4 gap-2 text-xs">
            <div class="text-center">
              <div class="text-ink-gray-6">Row</div>
              <div class="font-mono text-ink-black font-medium">{{ cellInfo.row }}</div>
            </div>
            <div class="text-center">
              <div class="text-ink-gray-6">Col</div>
              <div class="font-mono text-ink-black font-medium">{{ cellInfo.col }}</div>
            </div>
            <div class="text-center">
              <div class="text-ink-gray-6">Width</div>
              <div class="font-mono text-ink-black font-medium">{{ cellInfo.width }}</div>
            </div>
            <div class="text-center">
              <div class="text-ink-gray-6">Height</div>
              <div class="font-mono text-ink-black font-medium">{{ cellInfo.height }}</div>
            </div>
          </div>

          <!-- Current Label Display -->
          <div v-if="currentTileLabel && !showLabelInput" class="flex items-center gap-2">
            <div class="px-2 py-1 bg-surface-gray-3 rounded text-xs text-ink-black font-medium">
              {{ currentTileLabel.label }}
            </div>
            <button @click="showLabelDialog" class="text-xs text-ink-gray-6 hover:text-ink-black">
              Edit
            </button>
          </div>

          <!-- Label Input -->
          <div v-if="showLabelInput" class="flex items-center gap-2">
            <TextInput
              v-model="currentLabel"
              placeholder="Label this tile..."
              class="label-input text-xs"
              @keyup.enter="saveLabel"
              @keyup.escape="cancelLabel"
            />
            <button
              @click="saveLabel"
              class="px-2 py-1 bg-surface-gray-3 hover:bg-surface-gray-4 rounded text-xs text-ink-black transition-colors"
            >
              Save
            </button>
            <button
              v-if="currentTileLabel"
              @click="removeLabel"
              class="px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-xs text-red-700 transition-colors"
            >
              Remove
            </button>
            <button @click="cancelLabel" class="text-xs text-ink-gray-6 hover:text-ink-black">
              Cancel
            </button>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2">
            <button
              v-if="!showLabelInput && !currentTileLabel"
              @click="showLabelDialog"
              class="px-2 py-1 bg-surface-gray-3 hover:bg-surface-gray-4 rounded text-xs text-ink-black transition-colors"
            >
              Label
            </button>
            <button
              v-if="currentTileLabel && !showLabelInput"
              @click="removeLabel"
              class="px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-xs text-red-700 transition-colors"
            >
              Remove Label
            </button>
            <button
              @click="copyCoordinates"
              class="px-2 py-1 bg-surface-gray-3 hover:bg-surface-gray-4 rounded text-xs text-ink-black transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Canvas Container - Takes remaining height -->
    <div class="flex-1 px-6 pb-6 min-h-0">
      <div
        v-if="currentImage"
        class="h-full flex flex-col border border-outline-gray-3 rounded-lg bg-surface-gray-1"
      >
        <div class="mb-4">
          <h3 class="font-medium text-ink-black">
            {{ availableAssets.find((a: AssetInfo) => a.key === selectedAsset)?.name }}
            <span class="text-ink-gray-6 font-normal">
              ({{ gridDimensions.cols }} � {{ gridDimensions.rows }} tiles)
            </span>
          </h3>
        </div>

        <div class="flex-1 overflow-auto p-4">
          <canvas
            ref="canvasRef"
            @mousedown="handleCanvasMouseDown"
            @mouseup="handleCanvasMouseUp"
            @mousemove="handleCanvasMouseMove"
            class="cursor-crosshair border border-outline-gray-2 block"
            style="user-select: none"
          />
        </div>
      </div>

      <div
        v-else-if="selectedAsset || isLoading"
        class="h-full flex items-center justify-center text-ink-gray-6"
      >
        <div class="flex items-center gap-3">
          <div
            class="animate-spin rounded-full h-6 w-6 border-2 border-ink-gray-3 border-t-ink-gray-6"
          ></div>
          <div>Loading asset...</div>
        </div>
      </div>

      <div v-else class="h-full flex items-center justify-center text-ink-gray-6">
        <div>Select an asset to begin browsing</div>
      </div>
    </div>
  </div>
</template>
