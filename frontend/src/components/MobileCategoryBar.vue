<template>
  <div v-if="showBar" class="shrink-0 border-b border-outline-gray-2 bg-surface-white">
    <div class="flex items-center gap-2 px-4 py-2">
      <button
        v-if="activeCategory.team"
        class="flex min-w-0 flex-1 items-center rounded-md bg-surface-gray-1 px-3 py-2 text-left text-sm text-ink-gray-7 transition hover:bg-surface-gray-2"
        :class="isCategoryView ? 'bg-surface-selected shadow-sm hover:bg-surface-gray-3' : ''"
        @click="showCategorySpacesSheet = true"
      >
        <span class="grid h-5 w-6 place-items-center text-base text-ink-gray-6">
          {{ activeCategory.team.icon }}
        </span>
        <span class="truncate">{{ activeCategory.team.title }}</span>
        <LucideChevronsUpDown
          v-if="activeTeams.length > 1"
          class="ml-auto size-4 text-ink-gray-5"
        />
      </button>

      <button
        v-if="activeCategory.id"
        class="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-gray-7 transition"
        :class="isCurrentSpaceView ? 'bg-surface-selected shadow-sm' : 'hover:bg-surface-gray-1'"
        @click="showCategorySpacesSheet = true"
      >
        <LucideLayoutGrid class="size-4 text-ink-gray-6" />
        Spaces
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { activeCategory } from '@/data/activeCategory'
import { activeTeams } from '@/data/teams'
import { showCategorySpacesSheet } from '@/data/categorySpacesSheet'
import LucideChevronsUpDown from '~icons/lucide/chevrons-up-down'
import LucideLayoutGrid from '~icons/lucide/layout-grid'

const route = useRoute()

const showBar = computed(() => {
  return activeTeams.value.length > 1 || Boolean(activeCategory.team)
})

const isCategoryView = computed(() => {
  return ['Discussions', 'DiscussionsTab', 'NewDiscussion'].includes(route.name?.toString() || '')
})

const isCurrentSpaceView = computed(() => {
  return [
    'Space',
    'SpaceDiscussions',
    'SpacePages',
    'SpacePage',
    'SpaceTasks',
    'SpaceTask',
  ].includes(route.name?.toString() || '')
})
</script>
