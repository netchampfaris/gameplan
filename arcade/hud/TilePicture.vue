<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { TILE_SIZE } from '../maps/tiled'
import { drawPicture, type TilePicture } from './tileImages'

/** A catalog item, wallpaper or floor, drawn from its tiles and fitted into a square. */

const props = withDefaults(defineProps<{ picture: TilePicture; size?: number }>(), { size: 56 })

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const width = computed(() => props.picture.width * TILE_SIZE)
const height = computed(() => props.picture.height * TILE_SIZE)
// Whole-pixel scaling keeps pixel art crisp when the picture is enlarged; shrinking it
// has to blend pixels anyway.
const scale = computed(() => {
  const fit = props.size / Math.max(width.value, height.value)
  return fit >= 1 ? Math.floor(fit) : fit
})

watch(
  [canvas, () => props.picture],
  ([target, picture]) => {
    if (target) drawPicture(target, picture).catch((error: unknown) => console.error(error))
  },
  { immediate: true },
)
</script>

<template>
  <canvas
    ref="canvas"
    :width="width"
    :height="height"
    :style="{ width: `${width * scale}px`, height: `${height * scale}px` }"
    :class="scale >= 1 ? '[image-rendering:pixelated]' : ''"
    aria-hidden="true"
  />
</template>
