<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'
import type { AvatarAppearance } from '../avatar/catalog'
import { compositeFrames, frameName } from '../avatar/sheet'
import { useAvatarSheet } from './useAvatarSheet'

/** The head of an Avatar facing the viewer, for lists. */

const props = withDefaults(defineProps<{ appearance: AvatarAppearance; size?: number }>(), {
  size: 24,
})

// Where the head sits in a 48x96 frame, on the first idle frame facing down.
const HEAD = { x: 8, y: 36, size: 32 }
const FRONT = compositeFrames().find((frame) => frame.name === frameName('idle', 'down', 0))

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const sheet = useAvatarSheet(() => props.appearance)

watch([sheet, canvas], ([source, target]) => {
  const context = target?.getContext('2d')
  if (!context || !source || !FRONT) return
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, HEAD.size, HEAD.size)
  context.drawImage(
    source,
    FRONT.x + HEAD.x,
    FRONT.y + HEAD.y,
    HEAD.size,
    HEAD.size,
    0,
    0,
    HEAD.size,
    HEAD.size,
  )
})
</script>

<template>
  <canvas
    ref="canvas"
    :width="HEAD.size"
    :height="HEAD.size"
    :style="{ width: `${size}px`, height: `${size}px` }"
    class="shrink-0 rounded-full bg-surface-gray-3 [image-rendering:pixelated]"
    aria-hidden="true"
  />
</template>
