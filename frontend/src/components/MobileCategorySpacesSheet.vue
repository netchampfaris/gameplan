<template>
  <BottomSheet
    :model-value="modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
    title="Choose space"
  >
    <div class="pb-10">
      <!-- Categories (only when multiple exist) -->
      <template v-if="activeTeams.length > 1">
        <button
          v-for="team in activeTeams"
          :key="team.name"
          class="flex w-full items-baseline gap-3 px-4 py-3 text-left transition"
          :class="team.name === activeCategory.id ? 'bg-surface-gray-2' : 'hover:bg-surface-gray-1'"
          @click="changeCategory(team.name)"
        >
          <span class="w-6 text-center text-xl leading-none">{{ team.icon }}</span>
          <span
            class="flex-1 truncate text-lg text-ink-gray-8"
            :class="team.name === activeCategory.id ? 'font-semibold' : ''"
          >
            {{ team.title }}
          </span>
          <LucideCheck
            v-if="team.name === activeCategory.id"
            class="size-5 shrink-0 text-ink-gray-5"
          />
        </button>

        <!-- <div class="mx-4 my-3 border-t border-outline-gray-2" /> -->
      </template>

      <!-- Spaces -->
      <div class="mt-6 px-4 pb-1.5 text-center text-3xl-semibold text-ink-gray-9">
        <template v-if="activeTeams.length <= 1 && activeCategory.team">
          {{ activeCategory.team.icon }} {{ activeCategory.team.title }}
        </template>
        <template v-else>Choose space</template>
      </div>

      <div v-if="categorySpaces.list.length === 0" class="px-4 py-4 text-sm text-ink-gray-4">
        No spaces yet
      </div>

      <button
        v-for="space in categorySpaces.list"
        :key="space.name"
        class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition"
        :class="isActive(space.name) ? 'bg-surface-gray-2' : 'hover:bg-surface-gray-1'"
        @click="openSpace(space.name)"
      >
        <span class="w-6 text-center text-lg leading-none">{{ space.icon }}</span>
        <span
          class="flex-1 truncate text-[15px] text-ink-gray-8"
          :class="isActive(space.name) ? 'font-semibold' : ''"
        >
          {{ space.title }}
        </span>
        <LucideLock v-if="space.is_private" class="size-4 shrink-0 text-ink-gray-4" />
        <LucideCheck v-if="isActive(space.name)" class="size-5 shrink-0 text-ink-gray-5" />
      </button>
    </div>
  </BottomSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { activeCategory } from '@/data/activeCategory'
import { categorySpaces } from '@/data/categorySpaces'
import { activeTeams } from '@/data/teams'
import BottomSheet from './BottomSheet.vue'
import LucideCheck from '~icons/lucide/check'
import LucideLock from '~icons/lucide/lock'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const route = useRoute()
const router = useRouter()

function isActive(spaceId: string) {
  const routeName = route.name?.toString() || ''
  return route.params.spaceId?.toString() === spaceId && routeName.startsWith('Space')
}

function changeCategory(teamId: string) {
  if (!teamId) return

  if (
    teamId === activeCategory.id &&
    route.name === 'Discussions' &&
    route.params.teamId === teamId
  ) {
    emit('update:modelValue', false)
    return
  }

  activeCategory.change(teamId)
  emit('update:modelValue', false)
  router.push({ name: 'Discussions', params: { teamId } })
}

function openSpace(spaceId: string) {
  if (!activeCategory.id) return

  if (route.params.spaceId?.toString() === spaceId && route.params.teamId === activeCategory.id) {
    emit('update:modelValue', false)
    return
  }

  emit('update:modelValue', false)
  router.push({
    name: 'Space',
    params: { teamId: activeCategory.id, spaceId },
  })
}
</script>
