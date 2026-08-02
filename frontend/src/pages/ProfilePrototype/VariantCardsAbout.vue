<template>
  <!-- PROTOTYPE — throwaway. Variant C: identity is bound cards, About is a section.
       Same grid freedom as A (avatar/bio can be moved, resized, removed), but the
       long-form introduction escapes the fixed-tile constraint. -->
  <div class="space-y-6 pb-16">
    <PrototypeGrid :cards="cards" />
    <AboutSection :profile="profile" :is-own-profile="isOwnProfile" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AboutSection from './AboutSection.vue'
import PrototypeGrid from './PrototypeGrid.vue'
import { getBoundCards, getSampleCustomCards } from './boundCards'
import type { GPUserProfile } from '@/types/doctypes'

const props = defineProps<{
  profile: { doc?: GPUserProfile | null }
  isOwnProfile: boolean
  showCustomCards: boolean
}>()

const cards = computed(() => {
  let bound = getBoundCards(props.profile.doc)
  return props.showCustomCards ? [...bound, ...getSampleCustomCards(props.profile.doc)] : bound
})
</script>
