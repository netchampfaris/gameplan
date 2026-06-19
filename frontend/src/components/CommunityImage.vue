<template>
  <span class="flex items-center justify-center overflow-hidden rounded-[7px]">
    <img
      v-if="community.image"
      :src="community.image"
      :alt="community.title"
      class="size-full object-cover"
    />
    <span v-else class="text-xs-medium uppercase text-ink-gray-9">
      {{ communityInitials }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Community } from '@/data/communities'

const props = defineProps<{
  community: Pick<Community, 'name' | 'title' | 'icon' | 'image'>
}>()

const communityInitials = computed(() => {
  const label = (props.community.title || props.community.name || '').trim()
  const words = label.split(/\s+/).filter(Boolean)

  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }

  return label.slice(0, 2).toUpperCase()
})
</script>
