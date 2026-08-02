<template>
  <!-- PROTOTYPE — throwaway. Read-only twin of ProfileBentoGrid (no drag), so a
       variant can render a non-standard tile (About) inside the real packing. -->
  <section ref="gridElement" class="relative min-w-0" :style="{ height: `${layout.height}px` }">
    <div
      v-for="card in cards"
      :key="card.id"
      class="absolute left-0 top-0 min-w-0"
      :style="rectStyle(card.id)"
    >
      <slot name="card" :card="card">
        <ProfileBentoCard :card="card" />
      </slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import ProfileBentoCard from '@/components/ProfileBento/ProfileBentoCard.vue'
import {
  createProfileBentoLayout,
  type ProfileBentoLayoutRect,
} from '@/components/ProfileBento/profileBentoLayout'
import type { PrototypeCard } from './boundCards'

const props = defineProps<{ cards: PrototypeCard[] }>()

const gridGap = 12
const gridElement = useTemplateRef<HTMLElement>('gridElement')
const { width } = useElementSize(gridElement)

const layout = computed(() =>
  createProfileBentoLayout(
    props.cards.map((card) => ({ id: card.id, size: card.size })),
    width.value,
    gridGap,
  ),
)

function rectStyle(cardId: string) {
  let rect: ProfileBentoLayoutRect | undefined = layout.value.rects.get(cardId)
  if (!rect) return { height: '0px', width: '0px' }
  return {
    height: `${rect.height}px`,
    width: `${rect.width}px`,
    transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
  }
}
</script>
