<template>
  <span v-if="isLucideIcon" :class="[icon, 'inline-block shrink-0']" />
  <span v-else class="inline-block shrink-0 font-[emoji] leading">
    {{ icon }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  icon?: string | null
}>()

const isLucideIcon = computed(() => props.icon?.startsWith('lucide-'))
</script>
