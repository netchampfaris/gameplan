<template>
  <div class="w-full space-y-5 py-6">
    <div class="sm:rounded sm:border sm:px-4 sm:py-3">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-3xl-semibold">Discussions</h2>
        <Button :route="discussionsRoute">View all</Button>
      </div>
      <DiscussionList
        :listOptions="{
          pageLength,
        }"
        :hideLoadMore="true"
      />
    </div>
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-1">
      <div class="sm:rounded sm:border sm:px-4 sm:py-3">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-3xl-semibold">Tasks</h2>
          <Button :route="{ name: 'MyTasks' }">View all</Button>
        </div>
        <TaskList
          :listOptions="{
            filters: {
              status: ['in', ['Backlog', 'Todo', 'In Progress']],
              assigned_or_owner: $user().name,
            },
            pageLength,
          }"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { communityState } from '@/data/communityState'
import { useScreenSize } from '@/composables/useScreenSize'

const screenSize = useScreenSize()
const discussionsRoute = computed(() => {
  return communityState.id
    ? { name: 'Discussions', params: { communityId: communityState.id } }
    : { name: 'Home' }
})
const pageLength = computed(() => {
  let header = 50
  let title = 28 + 12
  let gap = 24 + 12 + 12
  let task = 60

  let availableHeight = screenSize.height - (header + (title + gap) * 2)
  let _pageLength = Math.floor(availableHeight / task / 2)
  if (_pageLength > 8) {
    _pageLength = 8
  }
  if (_pageLength < 3) {
    _pageLength = 3
  }
  return _pageLength
})
</script>
