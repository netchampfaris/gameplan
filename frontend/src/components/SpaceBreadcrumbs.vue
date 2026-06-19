<template>
  <Breadcrumbs
    class="space-breadcrumbs"
    :items="[
      {
        label: space?.title,
        prefix: h(SpaceIcon, { icon: space?.icon }),
        suffix: space?.is_private ? 'lucide-lock' : null,
        onClick: canEditSpace ? () => (showSpaceEditDialog = true) : undefined,
      },
      ...(items || []),
    ]"
  >
    <template #prefix="{ item }">
      <component :is="item.prefix" v-if="item.prefix" class="mr-1.5 size-5 text-ink-gray-6" />
    </template>
    <template #suffix="{ item }">
      <span v-if="item.suffix" :class="[item.suffix, 'ml-1.5 size-3.5 text-ink-gray-6']" />
    </template>
  </Breadcrumbs>
  <EditSpaceDialog v-model="showSpaceEditDialog" :spaceId="spaceId" />
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { Breadcrumbs } from 'frappe-ui'
import { useSpace } from '@/data/spaces'
import { RouteComponent } from 'vue-router'
import EditSpaceDialog from './EditSpaceDialog.vue'
import SpaceIcon from './SpaceIcon.vue'
import { readOnlyMode } from '@/data/readOnlyMode'

const props = defineProps<{
  spaceId: string
  items?: {
    label: string
    route?: RouteComponent
    suffix?: any
    prefix?: any
    onClick?: () => void
  }[]
}>()

const space = useSpace(() => props.spaceId)
const showSpaceEditDialog = ref(false)
const canEditSpace = computed(() => !readOnlyMode && !space.value?.archived_at)
</script>

<style>
button:has(span.font-\[emoji\]) {
  align-items: baseline;
}
</style>
