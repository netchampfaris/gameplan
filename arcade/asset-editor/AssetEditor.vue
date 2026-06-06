<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { Select, TextInput } from 'frappe-ui'
import { useAssetEditor } from './useAssetEditor'
import type { AssetInfo } from './types'

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')

const {
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
  getAnimationPreviewStyle,
  getAtlasFramePreviewStyle,
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
} = useAssetEditor(canvasRef)
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface-gray-1">
    <main class="min-w-0 flex-1 p-4">
      <div class="flex h-full flex-col overflow-hidden rounded-lg border border-outline-gray-3 bg-surface-white">
        <div class="border-b border-outline-gray-2 px-4 py-3">
          <h3 class="font-medium text-ink-black">
            {{ availableAssets.find((a: AssetInfo) => a.key === selectedAsset)?.name }}
            <span v-if="currentImage" class="font-normal text-ink-gray-6">
              ({{ gridDimensions.cols }} x {{ gridDimensions.rows }} tiles)
            </span>
          </h3>
        </div>

        <div v-if="currentImage" class="min-h-0 flex-1 overflow-auto p-4">
          <canvas
            ref="canvasRef"
            @mousedown="handleCanvasMouseDown"
            @mouseup="handleCanvasMouseUp"
            @mousemove="handleCanvasMouseMove"
            class="block cursor-crosshair border border-outline-gray-2"
            style="user-select: none"
          />
        </div>

        <div
          v-else-if="selectedAsset || isLoading"
          class="flex flex-1 items-center justify-center text-ink-gray-6"
        >
          <div class="flex items-center gap-3">
            <div
              class="h-6 w-6 animate-spin rounded-full border-2 border-ink-gray-3 border-t-ink-gray-6"
            ></div>
            <div>Loading asset...</div>
          </div>
        </div>

        <div v-else class="flex flex-1 items-center justify-center text-ink-gray-6">
          Select an asset to begin browsing
        </div>
      </div>
    </main>

    <aside class="flex w-[440px] shrink-0 flex-col border-l border-outline-gray-2 bg-surface-white">
      <div class="space-y-4 border-b border-outline-gray-2 p-4">
        <div>
          <Select
            v-model="selectedAsset"
            :options="
              availableAssets.map((asset: AssetInfo) => ({ value: asset.key, label: asset.name }))
            "
          />
          <div v-if="selectedAsset" class="mt-2 text-p-sm text-ink-gray-6">
            {{ availableAssets.find((a: AssetInfo) => a.key === selectedAsset)?.description }}
          </div>
        </div>

        <button
          v-if="currentImage"
          @click="toggleGrid"
          :class="[
            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            showGrid
              ? 'bg-surface-gray-3 text-ink-black'
              : 'bg-surface-gray-1 text-ink-gray-6 hover:bg-surface-gray-2',
          ]"
        >
          {{ showGrid ? 'Hide Grid' : 'Show Grid' }}
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-auto p-4">
        <section class="space-y-3">
          <div>
            <h3 class="text-sm font-medium text-ink-black">Selection Preview</h3>
            <p class="text-xs text-ink-gray-6">Drag on the sheet, then save it as an atlas frame.</p>
          </div>

          <div class="grid grid-cols-5 gap-2 rounded-lg bg-surface-gray-1 p-3 text-xs">
            <div class="text-center">
              <div class="text-ink-gray-6">Row</div>
              <div class="font-mono font-medium text-ink-black">{{ cellInfo?.row ?? '-' }}</div>
            </div>
            <div class="text-center">
              <div class="text-ink-gray-6">Col</div>
              <div class="font-mono font-medium text-ink-black">{{ cellInfo?.col ?? '-' }}</div>
            </div>
            <div class="text-center">
              <div class="text-ink-gray-6">Width</div>
              <div class="font-mono font-medium text-ink-black">{{ cellInfo?.width ?? '-' }}</div>
            </div>
            <div class="text-center">
              <div class="text-ink-gray-6">Height</div>
              <div class="font-mono font-medium text-ink-black">{{ cellInfo?.height ?? '-' }}</div>
            </div>
            <div class="text-center">
              <div class="text-ink-gray-6">Start</div>
              <div class="font-mono font-medium text-ink-black">{{ selectedFrameIndex ?? '-' }}</div>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden rounded border border-outline-gray-3 bg-surface-black"
            >
              <div v-if="selectedSourceRect" :style="selectedFramePreviewStyle"></div>
              <div v-else class="text-center text-xs text-ink-gray-5">Select one or more cells</div>
            </div>
            <div class="space-y-2 text-xs">
              <div class="text-ink-gray-6">Source rect</div>
              <div class="font-mono text-ink-gray-7">
                <template v-if="selectedSourceRect">
                  x: {{ selectedSourceRect.x }}, y: {{ selectedSourceRect.y }}<br />
                  w: {{ selectedSourceRect.width }}, h: {{ selectedSourceRect.height }}
                </template>
                <template v-else>Drag 1x2 for avatar</template>
              </div>
              <button
                class="rounded bg-surface-gray-3 px-2 py-1 font-mono text-ink-black hover:bg-surface-gray-4 disabled:text-ink-gray-5"
                :disabled="!selectedSourceRect"
                @click="copyFrameSnippet"
              >
                Copy rect
              </button>
            </div>
          </div>

          <div v-if="currentTileLabel && !showLabelInput" class="flex items-center gap-2">
            <div class="rounded bg-surface-gray-3 px-2 py-1 text-xs font-medium text-ink-black">
              {{ currentTileLabel.label }}
            </div>
            <button @click="showLabelDialog" class="text-xs text-ink-gray-6 hover:text-ink-black">
              Edit
            </button>
          </div>

          <div v-if="showLabelInput" class="flex items-center gap-2">
            <TextInput
              v-model="currentLabel"
              placeholder="Frame name, e.g. avatar_01_idle_down"
              class="label-input text-xs"
              @keyup.enter="saveLabel"
              @keyup.escape="cancelLabel"
            />
            <button
              @click="saveLabel"
              class="rounded bg-surface-gray-3 px-2 py-1 text-xs text-ink-black transition-colors hover:bg-surface-gray-4"
            >
              Save
            </button>
            <button
              v-if="currentTileLabel"
              @click="removeLabel"
              class="rounded bg-surface-gray-3 px-2 py-1 text-xs text-ink-black transition-colors hover:bg-surface-gray-4"
            >
              Remove
            </button>
            <button @click="cancelLabel" class="text-xs text-ink-gray-6 hover:text-ink-black">
              Cancel
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="cellInfo && !showLabelInput && !currentTileLabel"
              @click="showLabelDialog"
              class="rounded bg-surface-gray-3 px-2 py-1 text-xs text-ink-black transition-colors hover:bg-surface-gray-4"
            >
              Label
            </button>
            <button
              v-if="currentTileLabel && !showLabelInput"
              @click="removeLabel"
              class="rounded bg-surface-gray-3 px-2 py-1 text-xs text-ink-black transition-colors hover:bg-surface-gray-4"
            >
              Remove Label
            </button>
            <button
              :disabled="!cellInfo"
              @click="copyCoordinates"
              class="rounded bg-surface-gray-3 px-2 py-1 text-xs text-ink-black transition-colors hover:bg-surface-gray-4 disabled:text-ink-gray-5"
            >
              Copy
            </button>
          </div>
        </section>

        <section class="mt-6 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-medium text-ink-black">Animation Preview</h3>
              <p class="text-xs text-ink-gray-6">
                Drag across the sheet to preview an unmapped animation, or use mapped sequences.
              </p>
            </div>
            <button
              v-if="previewAnimationFrames.length"
              class="rounded bg-surface-gray-3 px-2 py-1 text-xs text-ink-black hover:bg-surface-gray-4"
              @click="toggleAnimationPlayback"
            >
              {{ isAnimationPlaying ? 'Pause' : 'Play' }}
            </button>
          </div>

          <div v-if="previewAnimationFrames.length" class="space-y-3">
            <div
              class="flex h-48 items-center justify-center overflow-hidden rounded-lg border border-outline-gray-2 bg-surface-black"
            >
              <div :style="getAnimationPreviewStyle(activeAnimationFrame)"></div>
            </div>

            <div class="flex items-center justify-between gap-3 text-xs text-ink-gray-6">
              <div>
                <span class="font-medium text-ink-black">{{ previewAnimationName }}</span>
                <span class="font-mono">
                  {{ animationFrameIndex + 1 }}/{{ previewAnimationFrames.length }}
                </span>
              </div>
            </div>

            <div
              v-if="selectionAnimationFrameSize"
              class="rounded bg-surface-gray-1 p-2 text-xs text-ink-gray-6"
            >
              Inferred each frame as
              <span class="font-mono text-ink-black">
                {{ selectionAnimationFrameSize.width }}x{{ selectionAnimationFrameSize.height }} cells
              </span>
              and looped
              <span class="font-mono text-ink-black">{{ selectionAnimationFrameSize.count }}</span>
              frames left-to-right.
            </div>

            <div v-if="animationGroups.length" class="flex flex-wrap gap-2">
              <button
                v-for="group in animationGroups"
                :key="group.name"
                :class="[
                  'rounded border px-2 py-1 text-xs transition-colors',
                  !isPreviewingSelectionAnimation && activeAnimationName === group.name
                    ? 'border-outline-gray-5 bg-surface-gray-3 text-ink-black'
                    : 'border-outline-gray-2 bg-surface-white text-ink-gray-7 hover:bg-surface-gray-1',
                ]"
                @click="selectAnimation(group.name)"
              >
                {{ group.name }} · {{ group.frames.length }}
              </button>
            </div>
          </div>

          <div v-else class="rounded border border-dashed border-outline-gray-3 p-4 text-sm text-ink-gray-6">
            Drag a multi-column rectangle on the sheet to preview an unmapped animation.
          </div>
        </section>

        <section class="mt-6 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-medium text-ink-black">Atlas Frames</h3>
              <p class="text-xs text-ink-gray-6">Click a mapped frame to verify or correct it.</p>
            </div>
            <button
              class="rounded bg-surface-gray-3 px-2 py-1 text-xs text-ink-black hover:bg-surface-gray-4"
              @click="copyAtlasJson"
            >
              Copy JSON
            </button>
          </div>

          <div v-if="currentAtlasFrames.length" class="space-y-2">
            <button
              v-for="atlasFrame in currentAtlasFrames"
              :key="atlasFrame.name"
              class="flex w-full items-center gap-3 rounded border border-outline-gray-2 bg-surface-white p-2 text-left hover:bg-surface-gray-1"
              @click="selectAtlasFrame(atlasFrame.tile)"
            >
              <span
                class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-black"
              >
                <span :style="getAtlasFramePreviewStyle(atlasFrame.tile)"></span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-ink-black">
                  {{ atlasFrame.name }}
                </span>
                <span class="block font-mono text-xs text-ink-gray-6">
                  x: {{ atlasFrame.rect.x }}, y: {{ atlasFrame.rect.y }}, w:
                  {{ atlasFrame.rect.width }}, h: {{ atlasFrame.rect.height }}
                </span>
              </span>
            </button>
          </div>
          <div v-else class="rounded border border-dashed border-outline-gray-3 p-4 text-sm text-ink-gray-6">
            Select a rectangle, name it, and save it to add atlas frames.
          </div>
        </section>

        <section class="mt-6">
          <div class="mb-2 text-sm font-medium text-ink-black">Generated Phaser Atlas JSON</div>
          <pre
            class="max-h-[360px] overflow-auto rounded border border-outline-gray-2 bg-surface-gray-1 p-3 text-xs text-ink-gray-8"
          >{{ currentAtlasJsonText }}</pre>
        </section>
      </div>
    </aside>
  </div>
</template>
