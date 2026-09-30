<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import type { AvatarAppearance } from '../avatar/catalog'
import {
  compositeFrames,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  FRAMES_PER_DIRECTION,
  frameName,
} from '../avatar/sheet'
import type { Facing } from '../world/interactables'
import { useAvatarSheet } from './useAvatarSheet'

/**
 * The Avatar walking on the spot, turning to show each side. Draws from the same
 * composite sheet the game uses, so the preview matches the world exactly.
 */

const props = defineProps<{ appearance: AvatarAppearance }>()

// The frame's top rows are empty headroom above the hair; skip them.
const CROP_TOP = 20
const SCALE = 3
const WALK_FPS = 8
const FRAMES_PER_FACING = FRAMES_PER_DIRECTION * 2
const TURN_ORDER: Facing[] = ['down', 'left', 'up', 'right']

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const sheet = useAvatarSheet(() => props.appearance)
const frames = new Map(compositeFrames().map((frame) => [frame.name, frame]))

let tick = 0
let timer: ReturnType<typeof setInterval> | undefined

function draw() {
  const context = canvas.value?.getContext('2d')
  if (!context || !sheet.value) return
  const facing = TURN_ORDER[Math.floor(tick / FRAMES_PER_FACING) % TURN_ORDER.length] ?? 'down'
  const frame = frames.get(frameName('walk', facing, tick % FRAMES_PER_DIRECTION))
  if (!frame) return
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT - CROP_TOP)
  context.drawImage(
    sheet.value,
    frame.x,
    frame.y + CROP_TOP,
    FRAME_WIDTH,
    FRAME_HEIGHT - CROP_TOP,
    0,
    0,
    FRAME_WIDTH,
    FRAME_HEIGHT - CROP_TOP,
  )
}

// Each new look starts from the front, so a change shows first on the face. The turn
// waits for the sheet: composing the first one can take longer than a whole facing.
watch(sheet, () => {
  tick = 0
  draw()
})

onMounted(() => {
  draw()
  timer = setInterval(() => {
    if (!sheet.value) return
    tick++
    draw()
  }, 1000 / WALK_FPS)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <canvas
    ref="canvas"
    :width="FRAME_WIDTH"
    :height="FRAME_HEIGHT - CROP_TOP"
    :style="{
      width: `${FRAME_WIDTH * SCALE}px`,
      height: `${(FRAME_HEIGHT - CROP_TOP) * SCALE}px`,
    }"
    class="[image-rendering:pixelated]"
    aria-hidden="true"
  />
</template>
