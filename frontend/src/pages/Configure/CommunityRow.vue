<template>
  <div :class="rowClass">
    <CommunityImageUploader :community="community" class="shrink-0" />

    <div class="min-w-0">
      <div class="truncate text-base text-ink-gray-8">
        {{ community.title }}
      </div>
      <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink-gray-5 md:hidden">
        <span>{{ spacesLabel }}</span>
        <span>{{ membersLabel }}</span>
        <span class="inline-flex items-center gap-1">
          <span :class="[visibilityIcon, 'size-3.5']" />
          {{ visibilityLabel }}
        </span>
      </div>
    </div>

    <div class="hidden text-sm text-ink-gray-5 md:block">
      {{ spacesLabel }}
    </div>
    <div class="hidden text-sm text-ink-gray-5 md:block">
      {{ membersLabel }}
    </div>
    <div class="hidden items-center gap-1 text-sm text-ink-gray-6 md:flex">
      <span :class="[visibilityIcon, 'size-3.5']" />
      {{ visibilityLabel }}
    </div>

    <div class="flex justify-end">
      <Button
        variant="ghost"
        label="Manage spaces"
        icon-right="lucide-arrow-right"
        :route="{ name: 'CommunitySpaces', params: { communityId: community.name } }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from 'frappe-ui'
import type { Community } from '@/data/communities'
import CommunityImageUploader from './CommunityImageUploader.vue'

const props = defineProps<{
  community: Community
  spacesCount: number
}>()

const rowClass = [
  'grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-1 py-2',
  'md:grid-cols-[1.75rem_minmax(10rem,1fr)_7rem_7rem_7rem_8rem]',
]

const visibilityLabel = computed(() => (props.community.is_private ? 'Private' : 'Public'))
const visibilityIcon = computed(() =>
  props.community.is_private ? 'lucide-lock' : 'lucide-globe-2',
)
const spacesLabel = computed(() => formatCount(props.spacesCount, 'space'))
const membersLabel = computed(() => formatCount(props.community.members?.length || 0, 'member'))

function formatCount(count: number, label: string) {
  return `${count} ${count === 1 ? label : `${label}s`}`
}
</script>
