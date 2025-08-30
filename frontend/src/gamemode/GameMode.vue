<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { GameEngine } from '@/gamemode'

const canvasRef = useTemplateRef<HTMLCanvasElement | null>('canvasRef')
const engine = ref<GameEngine | null>(null)

onMounted(() => {
  const canvas = canvasRef.value
  if (canvas) {
    engine.value = new GameEngine(canvas)
    engine.value?.start()
  }
})

onUnmounted(() => {
  engine.value?.destroy()
})
</script>

<template>
  <div class="bg-surface-white p-4 h-screen flex items-center justify-center">
    <div>
      <div class="w-[768px] h-[576px]">
        <div class="rounded-xl border overflow-hidden">
          <!-- Game canvas -->
          <canvas ref="canvasRef"></canvas>
        </div>
      </div>
      <div class="mt-2">
        <Button :route="{ name: 'SpritesheetBrowser' }">Spritesheet Browser</Button>
      </div>
    </div>
  </div>
</template>
