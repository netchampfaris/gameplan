<template>
  <PageHeader>
    <button
      v-if="activeCategory.team"
      class="flex sm:hidden min-w-0 items-center gap-2 rounded-md text-left transition hover:opacity-80"
      @click="showCategorySpacesSheet = true"
    >
      <span class="text-xl">{{ activeCategory.team.icon }}</span>
      <span class="ml-1 truncate text-lg font-semibold text-ink-gray-9">{{
        activeCategory.team.title
      }}</span>
      <LucideChevronsUpDown class="ml-2 size-4 shrink-0 text-ink-gray-5" />
    </button>
    <Breadcrumbs
      class="hidden h-7 sm:flex"
      :items="[{ label: 'Discussions', route: { name: 'Discussions', params: { teamId } } }]"
    />
    <Button
      variant="solid"
      icon-left="lucide-plus"
      :route="{ name: 'NewDiscussion', params: { teamId } }"
    >
      Add new
    </Button>
  </PageHeader>
  <div class="body-container pt-5 pb-40">
    <LastPostReminder class="mb-3" />

    <div class="overflow-x-auto flex gap-2 py-1 mb-3 items-center -mx-3 px-3">
      <TabButtons :options="feedOptions" v-model="currentFeedType" />
      <div class="ml-auto flex space-x-2" v-if="currentFeedType !== 'drafts'">
        <Button
          v-if="discussionListRef?.discussions?.loading"
          :loading="discussionListRef?.discussions?.loading"
        >
          Loading...
        </Button>
        <Select class="shrink-0 !w-fit" :options="orderOptions" v-model="orderBy" />
      </div>
    </div>
    <KeepAlive>
      <DiscussionList
        class="-mx-3"
        ref="discussionListRef"
        :filters="filters"
        :orderBy="() => orderBy"
        :cacheKey="`HomeDiscussions-${currentFeedType}`"
        :key="JSON.stringify(filters)"
      />
    </KeepAlive>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { Breadcrumbs, Select, TabButtons, usePageMeta } from 'frappe-ui'
import type { OrderBy } from 'frappe-ui'
import DiscussionList from '@/components/DiscussionList.vue'
import PageHeader from '@/components/PageHeader.vue'
import LastPostReminder from '@/components/LastPostReminder.vue'
import { useRouter } from 'vue-router'
import { activeCategory } from '@/data/activeCategory'
import { showCategorySpacesSheet } from '@/data/categorySpacesSheet'
import LucideChevronsUpDown from '~icons/lucide/chevrons-up-down'

type FeedType = 'following' | 'participating' | 'recent' | 'bookmarks' | 'unread'

interface Props {
  teamId: string
  feedType?: FeedType
}

const props = withDefaults(defineProps<Props>(), {
  feedType: 'recent',
})

const router = useRouter()
const orderBy = ref<OrderBy>('last_post_at desc')
const discussionListRef = useTemplateRef('discussionListRef')

const currentFeedType = computed({
  get: () => props.feedType,
  set: (value: FeedType) => {
    router.push({ name: 'DiscussionsTab', params: { teamId: props.teamId, feedType: value } })
  },
})

const filters = computed(() => {
  return currentFeedType.value ? { feed_type: currentFeedType.value } : undefined
})

const feedOptions = [
  {
    label: 'All',
    value: 'recent',
  },
  {
    label: 'Unread',
    value: 'unread',
  },
  {
    label: 'Following',
    value: 'following',
  },
  {
    label: 'Participating',
    value: 'participating',
  },
  {
    label: 'Bookmarks',
    value: 'bookmarks',
  },
]

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

usePageMeta(() => {
  return {
    title: 'Discussions',
  }
})
</script>
