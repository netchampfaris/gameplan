<template>
  <div :class="rowClass">
    <Button
      variant="ghost"
      class="!size-8 shrink-0"
      tooltip="Edit icon"
      :disabled="!canEditSpace"
      @click="emit('edit', space.name)"
    >
      <template #icon>
        <SpaceIcon :icon="space.icon" class="size-4.5 text-ink-gray-6" />
      </template>
    </Button>

    <div class="min-w-0">
      <div class="flex min-w-0 items-center gap-1.5">
        <div class="truncate text-base-medium text-ink-gray-8">
          {{ space.title }}
        </div>
        <span v-if="space.is_private" class="lucide-lock size-3.5 shrink-0 text-ink-gray-5" />
        <Badge v-if="space.archived_at" class="shrink-0">Archived</Badge>
      </div>
      <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink-gray-5 md:hidden">
        <span>{{ visibilityLabel }}</span>
        <span>{{ contentLabel }}</span>
      </div>
    </div>

    <div class="hidden text-sm text-ink-gray-6 md:block">
      {{ visibilityLabel }}
    </div>
    <div class="hidden truncate text-sm text-ink-gray-5 md:block">
      {{ contentLabel }}
    </div>

    <div class="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        icon="lucide-edit-2"
        tooltip="Edit title"
        :disabled="!canEditSpace"
        @click="emit('edit', space.name)"
      />
      <Button
        v-if="space.archived_at"
        variant="ghost"
        icon="lucide-archive-restore"
        tooltip="Unarchive space"
        :loading="isDocMethodLoading(space.name, 'unarchive')"
        @click="restoreSpace"
      />
      <SpaceOptions v-else align="end" :spaceId="space.name" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Badge, Button } from 'frappe-ui'
import SpaceIcon from '@/components/SpaceIcon.vue'
import SpaceOptions from '@/components/SpaceOptions.vue'
import { isDocMethodLoading, spaces, type Space, unarchiveSpace } from '@/data/spaces'
import { readOnlyMode } from '@/data/readOnlyMode'

const props = defineProps<{
  space: Space
}>()

const emit = defineEmits<{
  edit: [spaceId: string]
}>()

const rowClass = [
  'grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5',
  'transition-colors hover:bg-surface-gray-1',
  'md:grid-cols-[2rem_minmax(0,1fr)_7rem_8rem_8rem]',
]

const canEditSpace = computed(() => !readOnlyMode && !props.space.archived_at)
const visibilityLabel = computed(() => (props.space.is_private ? 'Private' : 'Public'))
const contentLabel = computed(() => {
  const discussions = props.space.discussions_count ?? 0
  const tasks = props.space.tasks_count ?? 0
  return `${formatCount(discussions, 'post')} / ${formatCount(tasks, 'task')}`
})

async function restoreSpace() {
  await unarchiveSpace(props.space)
  await spaces.reload()
}

function formatCount(count: number, label: string) {
  return `${count} ${count === 1 ? label : `${label}s`}`
}
</script>
