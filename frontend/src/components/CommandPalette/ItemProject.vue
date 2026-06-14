<template>
  <div class="flex w-full items-center rounded px-2 py-2 text-base" v-if="space">
    <SpaceIcon :icon="space.icon" class="mr-3 size-4 text-ink-gray-6" />
    <span v-if="community" class="font-medium inline-flex items-end text-ink-gray-5">
      {{ community?.title }}
      <div class="h-4 grid place-content-center mx-1">
        <span class="lucide-chevron-right size-3 text-ink-gray-5" />
      </div>
    </span>
    <span class="font-medium text-ink-gray-7"> {{ item.title }}&nbsp; </span>
    <span class="lucide-lock size-3 text-ink-gray-6 ml-0.5" v-if="space.is_private" />
  </div>
</template>
<script setup lang="ts">
import { useSpace } from '@/data/spaces'
import { useCommunity } from '@/data/communities'
import SpaceIcon from '@/components/SpaceIcon.vue'
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const space = useSpace(() => props.item.name)
const community = useCommunity(() => space.value?.team)
</script>
