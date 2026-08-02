<template>
  <!-- PROTOTYPE — throwaway. Variant B: identity is fixed chrome, not cards.
       Cover / avatar / name / bio always render from the doc and cannot be moved
       or removed. The grid becomes pure decoration; About is a section below. -->
  <div class="space-y-6 pb-16">
    <header>
      <div v-if="coverImage" class="relative h-40 overflow-hidden rounded-xl bg-surface-gray-2">
        <img
          :src="coverImage"
          alt=""
          class="h-full w-full object-cover"
          :style="{ objectPosition: `center ${coverPosition}%` }"
        />
      </div>

      <div class="flex items-start gap-4" :class="coverImage ? '-mt-8 px-4' : ''">
        <Avatar
          :image="profile.doc?.image || undefined"
          :label="profile.doc?.full_name || ''"
          size="3xl"
          class="!h-20 !w-20 shrink-0 rounded-full ring-4 ring-surface-base"
        />
        <div class="min-w-0 flex-1" :class="coverImage ? 'pt-9' : 'pt-1'">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h1 class="truncate text-2xl font-semibold text-ink-gray-9">
                {{ profile.doc?.full_name }}
              </h1>
              <p v-if="profile.doc?.bio" class="mt-1 text-base leading-6 text-ink-gray-6">
                {{ profile.doc.bio }}
              </p>
              <button
                v-else-if="isOwnProfile"
                type="button"
                class="mt-1 text-base text-ink-gray-5 underline decoration-outline-gray-3 underline-offset-4 hover:text-ink-gray-7"
                @click="showSettingsDialog('Profile')"
              >
                Add a bio
              </button>
            </div>
            <Button
              v-if="isOwnProfile"
              class="shrink-0"
              icon-left="lucide-edit-2"
              @click="showSettingsDialog('Profile')"
            >
              Edit
            </Button>
          </div>
        </div>
      </div>
    </header>

    <PrototypeGrid v-if="cards.length" :cards="cards" />

    <AboutSection :profile="profile" :is-own-profile="isOwnProfile" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Avatar, Button } from 'frappe-ui'
import { showSettingsDialog } from '@/components/Settings'
import AboutSection from './AboutSection.vue'
import PrototypeGrid from './PrototypeGrid.vue'
import { getSampleCustomCards } from './boundCards'
import type { GPUserProfile } from '@/types/doctypes'

const props = defineProps<{
  profile: { doc?: GPUserProfile | null }
  isOwnProfile: boolean
  showCustomCards: boolean
}>()

const coverImage = computed(() => props.profile.doc?.cover_image || '')
const coverPosition = computed(() => props.profile.doc?.cover_image_position ?? 50)

const cards = computed(() => (props.showCustomCards ? getSampleCustomCards(props.profile.doc) : []))
</script>
