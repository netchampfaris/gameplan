<template>
  <div :class="rowClass">
    <IconPicker :modelValue="space.icon || ''" @update:modelValue="updateIcon">
      <template #default="{ togglePopover }">
        <Button
          variant="ghost"
          class="shrink-0"
          tooltip="Edit icon"
          :disabled="!canEditSpace"
          @click="togglePopover()"
        >
          <template #icon>
            <SpaceIcon :icon="space.icon" class="size-4.5 text-ink-gray-6" />
          </template>
        </Button>
      </template>
    </IconPicker>

    <div class="min-w-0">
      <div class="flex min-w-0 items-center gap-1.5">
        <input
          v-model="title"
          aria-label="Space title"
          class="h-7 min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 text-base text-ink-gray-8 outline-none ring-0 transition-colors hover:border-outline-gray-2 focus:border-outline-gray-3 focus:ring-0 disabled:cursor-not-allowed disabled:text-ink-gray-6 disabled:hover:border-transparent"
          :disabled="!canEditSpace"
          @blur="saveTitle"
          @keydown.enter.prevent="saveTitle"
        />
        <span v-if="space.is_private" class="lucide-lock size-3.5 shrink-0 text-ink-gray-5" />
        <Badge v-if="space.archived_at" class="shrink-0">Archived</Badge>
      </div>
      <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink-gray-5 md:hidden">
        <span class="inline-flex items-center gap-1">
          <span :class="[visibilityIcon, 'size-3.5']" />
          {{ visibilityLabel }}
        </span>
        <span>{{ contentLabel }}</span>
      </div>
    </div>

    <div class="hidden items-center gap-1 text-sm text-ink-gray-6 md:flex">
      <span :class="[visibilityIcon, 'size-3.5']" />
      {{ visibilityLabel }}
    </div>
    <div class="hidden truncate text-sm text-ink-gray-5 md:block">
      {{ contentLabel }}
    </div>

    <div class="flex items-center justify-end gap-1">
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
import { computed, ref, watch } from 'vue'
import { Badge, Button, useDoctype } from 'frappe-ui'
import IconPicker from '@/components/IconPicker.vue'
import SpaceIcon from '@/components/SpaceIcon.vue'
import SpaceOptions from '@/components/SpaceOptions.vue'
import { isDocMethodLoading, spaces, type Space, unarchiveSpace } from '@/data/spaces'
import { readOnlyMode } from '@/data/readOnlyMode'
import type { GPProject } from '@/types/doctypes'

const props = defineProps<{
  space: Space
  pagesCount: number
}>()

const rowClass = [
  'grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 py-2',
  'md:grid-cols-[2rem_minmax(8rem,1fr)_6.5rem_15rem_3rem]',
]

const project = useDoctype<GPProject>('GP Project')
const title = ref(props.space.title)
const savingTitle = ref(false)
const canEditSpace = computed(() => !readOnlyMode && !props.space.archived_at)
const visibilityLabel = computed(() => (props.space.is_private ? 'Private' : 'Public'))
const visibilityIcon = computed(() => (props.space.is_private ? 'lucide-lock' : 'lucide-globe-2'))
const contentLabel = computed(() => {
  const discussions = props.space.discussions_count ?? 0
  const pages = props.pagesCount
  const tasks = props.space.tasks_count ?? 0
  return `${formatCount(discussions, 'post')} / ${formatCount(pages, 'page')} / ${formatCount(
    tasks,
    'task',
  )}`
})

watch(
  () => props.space.title,
  (value) => {
    title.value = value
  },
)

async function updateIcon(icon: string) {
  if (!canEditSpace.value || icon === props.space.icon) return
  await project.setValue.submit({
    name: props.space.name,
    icon,
  })
  await spaces.reload()
}

async function saveTitle() {
  const nextTitle = title.value.trim()
  if (savingTitle.value || !canEditSpace.value || !nextTitle || nextTitle === props.space.title) {
    title.value = props.space.title
    return
  }

  savingTitle.value = true
  try {
    await project.setValue.submit({
      name: props.space.name,
      title: nextTitle,
    })
    await spaces.reload()
  } finally {
    savingTitle.value = false
  }
}

async function restoreSpace() {
  await unarchiveSpace(props.space)
  await spaces.reload()
}

function formatCount(count: number, label: string) {
  return `${count} ${count === 1 ? label : `${label}s`}`
}
</script>
