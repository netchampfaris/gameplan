<template>
  <Button variant="ghost" size="md" icon="lucide-chevron-left" :label="label" @click="onClick" />
</template>

<script setup lang="ts">
import { Button } from 'frappe-ui'
import { useRouter, type RouteLocationRaw } from 'vue-router'

const props = withDefaults(
  defineProps<{
    /** Where to navigate on tap. Omit to fall back to browser history. */
    to?: RouteLocationRaw
    label?: string
  }>(),
  {
    label: 'Back',
  },
)

const router = useRouter()

function onClick() {
  if (props.to) {
    router.push(props.to)
  } else {
    router.back()
  }
}
</script>
