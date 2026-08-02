<template>
  <!-- PROTOTYPE — throwaway. Variant A: everything is a card.
       Avatar, name, bio and About are all bound cards seeded into the grid.
       One mental model, one editor — but About lives in a fixed-height tile. -->
  <div class="pb-16">
    <PrototypeGrid :cards="cards">
      <template #card="{ card }">
        <AboutTile
          v-if="card.id === 'about'"
          :readme="profile.doc?.readme"
          :is-own-profile="isOwnProfile"
          @edit="showSettingsDialog('Profile')"
        />
        <ProfileBentoCard v-else :card="card" />
      </template>
    </PrototypeGrid>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProfileBentoCard from '@/components/ProfileBento/ProfileBentoCard.vue'
import { showSettingsDialog } from '@/components/Settings'
import AboutTile from './AboutTile.vue'
import PrototypeGrid from './PrototypeGrid.vue'
import { getBoundCards, getSampleCustomCards } from './boundCards'
import type { GPUserProfile } from '@/types/doctypes'

const props = defineProps<{
  profile: { doc?: GPUserProfile | null }
  isOwnProfile: boolean
  showCustomCards: boolean
}>()

const cards = computed(() => {
  let bound = getBoundCards(props.profile.doc, { includeAbout: true })
  if (!props.showCustomCards) return bound

  // About packs last so author-made cards read before the long-form introduction.
  let about = bound.filter((card) => card.id === 'about')
  let identity = bound.filter((card) => card.id !== 'about')
  return [...identity, ...getSampleCustomCards(props.profile.doc), ...about]
})
</script>
