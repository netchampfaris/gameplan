<template>
  <BottomSheet
    :model-value="modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
    title="Choose space"
  >
    <div class="pb-10">
      <!-- Communities (only when multiple exist) -->
      <template v-if="activeCommunities.length > 1">
        <button
          v-for="community in activeCommunities"
          :key="community.name"
          class="flex w-full items-baseline gap-3 px-4 py-3 text-left transition"
          :class="
            community.name === communityState.id ? 'bg-surface-gray-2' : 'hover:bg-surface-gray-1'
          "
          @click="changeCommunity(community.name)"
        >
          <CommunityImage :community="community" class="size-6 shrink-0 bg-surface-gray-1" />
          <span
            class="flex-1 truncate text-lg text-ink-gray-8"
            :class="community.name === communityState.id ? 'font-semibold' : ''"
          >
            {{ community.title }}
          </span>
          <LucideCheck
            v-if="community.name === communityState.id"
            class="size-5 shrink-0 text-ink-gray-5"
          />
        </button>

        <!-- <div class="mx-4 my-3 border-t border-outline-gray-2" /> -->
      </template>

      <!-- Spaces -->
      <div class="mt-6 px-4 pb-1.5 text-center text-3xl-semibold text-ink-gray-9">
        <template v-if="activeCommunities.length <= 1 && communityState.doc">
          <span class="inline-flex items-center gap-2">
            <CommunityImage :community="communityState.doc" class="size-8 bg-surface-gray-1" />
            <span>{{ communityState.doc.title }}</span>
          </span>
        </template>
        <template v-else>Choose space</template>
      </div>

      <div v-if="communitySpaces.list.length === 0" class="px-4 py-4 text-sm text-ink-gray-4">
        {{ communitySpaces.emptyMessage }}
      </div>

      <button
        v-for="space in communitySpaces.list"
        :key="space.name"
        class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition"
        :class="isActive(space.name) ? 'bg-surface-gray-2' : 'hover:bg-surface-gray-1'"
        @click="openSpace(space.name)"
      >
        <SpaceIcon :icon="space.icon" class="size-5 text-ink-gray-6" />
        <span
          class="flex-1 truncate text-[15px] text-ink-gray-8"
          :class="isActive(space.name) ? 'font-semibold' : ''"
        >
          {{ space.title }}
        </span>
        <LucideLock v-if="space.is_private" class="size-4 shrink-0 text-ink-gray-4" />
        <LucideCheck v-if="isActive(space.name)" class="size-5 shrink-0 text-ink-gray-5" />
      </button>

      <button
        v-if="isAdmin && communityState.id && communitySpaces.archived.length === 0"
        class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-ink-gray-6 transition hover:bg-surface-gray-1"
        @click="openNewSpace"
      >
        <span class="grid size-5 place-items-center lucide-plus" />
        <span class="flex-1 text-[15px]">New space</span>
      </button>
    </div>
  </BottomSheet>

  <NewSpaceDialog
    v-model="showNewSpaceDialog"
    :lockedCommunityId="communityState.id ?? undefined"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { communityState } from '@/data/communityState'
import { communitySpaces } from '@/data/communitySpaces'
import { activeCommunities } from '@/data/communities'
import { useSessionUser } from '@/data/users'
import BottomSheet from './BottomSheet.vue'
import CommunityImage from './CommunityImage.vue'
import NewSpaceDialog from './NewSpaceDialog.vue'
import SpaceIcon from './SpaceIcon.vue'
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
const sessionUser = useSessionUser()

const isAdmin = computed(() => sessionUser.role === 'Gameplan Admin')
const showNewSpaceDialog = ref(false)

function openNewSpace() {
  emit('update:modelValue', false)
  showNewSpaceDialog.value = true
}

function isActive(spaceId: string) {
  const routeName = route.name?.toString() || ''
  return route.params.spaceId?.toString() === spaceId && routeName.startsWith('Space')
}

function changeCommunity(communityId: string) {
  if (!communityId) return

  if (
    communityId === communityState.id &&
    route.name === 'Discussions' &&
    route.params.communityId === communityId
  ) {
    emit('update:modelValue', false)
    return
  }

  communityState.change(communityId)
  emit('update:modelValue', false)
  router.push({ name: 'Discussions', params: { communityId } })
}

function openSpace(spaceId: string) {
  if (!communityState.id) return

  if (
    route.params.spaceId?.toString() === spaceId &&
    route.params.communityId === communityState.id
  ) {
    emit('update:modelValue', false)
    return
  }

  emit('update:modelValue', false)
  router.push({
    name: 'Space',
    params: { communityId: communityState.id, spaceId },
  })
}
</script>
