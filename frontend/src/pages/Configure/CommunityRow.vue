<template>
  <div :class="rowClass">
    <div class="flex min-w-0 items-center gap-2">
      <CommunityImageUploader :community="community" class="shrink-0" />

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <div class="truncate text-base-medium text-ink-gray-7">
            {{ community.title }}
          </div>
          <Badge v-if="community.archived_at" class="shrink-0">Archived</Badge>
        </div>
        <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-base text-ink-gray-5 md:hidden">
          <Button
            size="xs"
            variant="ghost"
            :label="spacesLabel"
            icon-right="lucide-arrow-up-right text-ink-gray-5"
            :route="{ name: 'CommunitySpaces', params: { communityId: community.name } }"
          />
          <Button
            size="xs"
            variant="ghost"
            :label="membersLabel"
            icon-right="lucide-arrow-up-right text-ink-gray-5"
            :route="{ name: 'CommunityMembers', params: { communityId: community.name } }"
          />
          <span class="inline-flex items-center gap-1">
            <span :class="[visibilityIcon, 'size-3.5']" />
            {{ visibilityLabel }}
          </span>
        </div>
      </div>
    </div>

    <div class="hidden md:block">
      <Button
        size="xs"
        variant="ghost"
        :label="spacesLabel"
        icon-right="lucide-arrow-up-right text-ink-gray-5"
        :route="{ name: 'CommunitySpaces', params: { communityId: community.name } }"
      />
    </div>
    <div class="hidden md:block">
      <Button
        size="xs"
        variant="ghost"
        :label="membersLabel"
        icon-right="lucide-arrow-up-right text-ink-gray-5"
        :route="{ name: 'CommunityMembers', params: { communityId: community.name } }"
      />
    </div>
    <div class="hidden items-center gap-1 text-base text-ink-gray-5 md:flex">
      <span :class="[visibilityIcon, 'size-3.5']" />
      {{ visibilityLabel }}
    </div>
    <div class="hidden justify-end md:flex">
      <CommunityOptions :community="community" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Badge, Button } from 'frappe-ui'
import type { Community } from '@/data/communities'
import CommunityImageUploader from './CommunityImageUploader.vue'
import CommunityOptions from './CommunityOptions.vue'

const props = defineProps<{
  community: Community
  spacesCount: number
}>()

const rowClass = [
  'grid grid-cols-[minmax(0,1fr)] items-center h-12',
  'md:grid-cols-[minmax(12rem,6fr)_minmax(6rem,1.2fr)_minmax(6rem,1.2fr)_minmax(5.5rem,1fr)_3rem] md:gap-24',
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
