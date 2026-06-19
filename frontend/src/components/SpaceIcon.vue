<template>
  <span :class="[displayIcon, 'inline-block shrink-0']" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  icon?: string | null
}>()

const displayIcon = computed(() => {
  return props.icon?.startsWith('lucide-') ? props.icon : 'lucide-hash'
})
</script>
