<template>
  <PageHeader>
    <button
      v-if="communityState.doc"
      class="flex sm:hidden min-w-0 items-center gap-2 rounded-md text-left transition hover:opacity-80"
      @click="showCommunitySpacesSheet = true"
    >
      <CommunityImage :community="communityState.doc" class="size-7 shrink-0 bg-surface-gray-1" />
      <span class="ml-1 truncate text-xl-semibold text-ink-gray-9">{{
        communityState.doc.title
      }}</span>
      <LucideChevronsUpDown class="ml-2 size-4 shrink-0 text-ink-gray-5" />
    </button>
    <Breadcrumbs
      class="hidden h-7 sm:flex"
      :items="[
        { label: feedTitle, route: { name: 'DiscussionsTab', params: { communityId, feedType } } },
      ]"
    />
    <div class="flex items-center gap-2">
      <Select class="shrink-0 !w-fit" :options="orderOptions" v-model="orderBy" />
      <Button
        variant="solid"
        icon-left="lucide-plus"
        :route="{ name: 'NewDiscussion', params: { communityId } }"
      >
        Add new
      </Button>
    </div>
  </PageHeader>
  <div class="body-container pt-5 pb-40">
    <LastPostReminder class="mb-3" />

    <KeepAlive>
      <DiscussionList
        class="-mx-3"
        ref="discussionListRef"
        :filters="filters"
        :orderBy="() => orderBy"
        :cacheKey="`Discussions-${communityId}-${feedType}`"
        :key="JSON.stringify(filters)"
      />
    </KeepAlive>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { Breadcrumbs, Select, usePageMeta } from 'frappe-ui'
import type { OrderBy } from 'frappe-ui'
import DiscussionList from '@/components/DiscussionList.vue'
import PageHeader from '@/components/PageHeader.vue'
import LastPostReminder from '@/components/LastPostReminder.vue'
import CommunityImage from '@/components/CommunityImage.vue'
import { communityState } from '@/data/communityState'
import { showCommunitySpacesSheet } from '@/data/communitySpacesSheet'
import LucideChevronsUpDown from '~icons/lucide/chevrons-up-down'

type FeedType = 'recent' | 'unread' | 'participating'

interface Props {
  communityId: string
  feedType?: FeedType
}

const props = withDefaults(defineProps<Props>(), {
  feedType: 'recent',
})

const orderBy = ref<OrderBy>('last_post_at desc')
const discussionListRef = useTemplateRef('discussionListRef')

const filters = computed(() => ({
  team: props.communityId,
  feed_type: props.feedType,
}))

const feedTitles: Record<FeedType, string> = {
  recent: 'All Discussions',
  unread: 'Unread',
  participating: 'Participating',
}

const feedTitle = computed(() => feedTitles[props.feedType])

const orderOptions = [
  {
    label: 'Sort by',
    value: '' as const,
    disabled: true,
  },
  {
    label: 'Newest first',
    value: 'last_post_at desc' as OrderBy,
  },
  {
    label: 'Oldest first',
    value: 'last_post_at asc' as OrderBy,
  },
  {
    label: 'Creation date',
    value: 'creation desc' as OrderBy,
  },
]

usePageMeta(() => ({ title: feedTitle.value }))
</script>
