<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { ArcadeGame } from './ArcadeGame'

const gameRoot = useTemplateRef<HTMLElement>('gameRoot')
const game = ref<ArcadeGame | null>(null)

onMounted(() => {
  if (!gameRoot.value) return

  game.value = new ArcadeGame()
  game.value.mount(gameRoot.value)
})

onUnmounted(() => {
  game.value?.destroy()
})
</script>

<template>
  <div class="h-[100dvh] w-full overflow-hidden bg-surface-black">
    <div ref="gameRoot" class="h-full w-full"></div>
  </div>
</template>
