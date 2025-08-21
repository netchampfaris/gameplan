<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

const canvasRef = useTemplateRef<HTMLCanvasElement | null>('canvasRef')

onMounted(() => {
  let ctx = canvasRef.value?.getContext('2d')

  if (ctx) {
    ctx.fillStyle = 'gray'
    ctx.fillRect(0, 0, 600, 600)
  }
})
</script>

<template>
  <div class="bg-white p-4">
    <div class="rounded-xl overflow-hidden border">
      <canvas ref="canvasRef" width="400" height="400"></canvas>
    </div>
  </div>
</template>
