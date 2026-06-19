<template>
  <DropdownMoreOptions
    :label="`${space?.title} Space Options`"
    v-bind="$attrs"
    button-size="xs"
    :options="options"
  />

  <MergeSpaceDialog v-model="showSpaceMergeDialog" :spaceId="props.spaceId" />
  <ChangeSpaceCategoryDialog v-model="showSpaceCategoryDialog" :spaceId="props.spaceId" />
  <SpaceAccessDialog v-model="showSpaceAccessDialog" :spaceId="props.spaceId" />
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDoctype, dialog } from 'frappe-ui'
import DropdownMoreOptions from './DropdownMoreOptions.vue'
import MergeSpaceDialog from './MergeSpaceDialog.vue'
import ChangeSpaceCategoryDialog from './ChangeSpaceCategoryDialog.vue'
import SpaceAccessDialog from './SpaceAccessDialog.vue'
import { useSpace } from '@/data/spaces'
import { readOnlyMode } from '@/data/readOnlyMode'
import { GPProject } from '@/types/doctypes'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  spaceId: string
}>()

const space = useSpace(() => props.spaceId)
const spaces = useDoctype<GPProject>('GP Project')

const showSpaceMergeDialog = ref(false)
const showSpaceCategoryDialog = ref(false)
const showSpaceAccessDialog = ref(false)
const canEditSpace = computed(() => !readOnlyMode && !space.value?.archived_at)

const options = computed(() => [
  {
    label: 'Manage access',
    icon: 'lucide-users',
    onClick: () => (showSpaceAccessDialog.value = true),
    condition: () => canEditSpace.value,
  },
  {
    label: 'Change Community',
    icon: 'lucide-log-out',
    onClick: () => (showSpaceCategoryDialog.value = true),
    condition: () => canEditSpace.value,
  },
  {
    label: 'Merge',
    icon: 'lucide-merge',
    onClick: () => (showSpaceMergeDialog.value = true),
    condition: () => canEditSpace.value,
  },
  {
    label: 'Archive',
    icon: 'lucide-archive',
    onClick: () => {
      dialog.confirm({
        title: 'Archive space',
        message:
          'You cannot create new discussions, pages or tasks in an archived space. It will remain read-only. You can unarchive it again at any time.',
        confirmLabel: 'Archive',
        onConfirm: () => spaces.runDocMethod.submit({ method: 'archive', name: props.spaceId }),
      })
    },
    condition: () => canEditSpace.value,
  },
  {
    label: 'Delete',
    icon: 'lucide-trash-2',
    onClick: () => {
      let message = `This will permanently delete the space and all its content. This action cannot be undone.`
      if (space.value?.discussions_count && space.value?.tasks_count) {
        message = `This will permanently delete the space and all its content. This space has ${space.value?.discussions_count} discussions and ${space.value?.tasks_count} tasks. This action cannot be undone.`
      } else if (space.value?.discussions_count) {
        message = `This will permanently delete the space and all its content. This space has ${space.value?.discussions_count} discussions. This action cannot be undone.`
      }
      dialog.danger({
        title: 'Delete space',
        message,
        onConfirm: () => spaces.delete.submit({ name: props.spaceId }),
      })
    },
    condition: () => canEditSpace.value,
  },
])
</script>
