<template>
  <div class="pb-16">
    <ProfileBentoGrid :cards="bentoCards" />
  </div>
</template>

<script setup lang="ts">
import ProfileBentoGrid from '@/components/ProfileBento/ProfileBentoGrid.vue'
import type { ProfileBentoCard } from '@/components/ProfileBento/types'

defineOptions({
  name: 'PersonProfileProfile',
})

defineProps<{
  bentoCards: ProfileBentoCard[]
}>()
</script>
