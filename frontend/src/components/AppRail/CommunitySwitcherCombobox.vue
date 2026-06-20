<template>
  <Combobox
    :options="communityOptions"
    :model-value="communityState.id"
    placeholder="Search communities"
    align="start"
    @update:selectedOption="onSelect"
  >
    <template #trigger="{ open }">
      <slot :open="open" />
    </template>

    <template #item-prefix="{ item }">
      <CommunityImage :community="item" class="size-6 shrink-0 bg-surface-gray-1" />
    </template>

    <template #footer="{ setOpen }">
      <div class="border-t border-outline-gray-1 p-1">
        <Button
          variant="ghost"
          class="w-full justify-start"
          @click="openManageCommunities(setOpen)"
        >
          <template #prefix>
            <span class="lucide-settings-2 size-4" />
          </template>
          Manage communities
        </Button>
      </div>
    </template>
  </Combobox>

  <ManageCommunitiesDialog v-model="showManageCommunities" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Combobox } from 'frappe-ui'
import { communityState } from '@/data/communityState'
import { activeCommunities } from '@/data/communities'
import CommunityImage from '../CommunityImage.vue'
import ManageCommunitiesDialog from './ManageCommunitiesDialog.vue'

const router = useRouter()
const showManageCommunities = ref(false)

const communityOptions = computed(() => {
  return activeCommunities.value.map((community) => ({
    label: community.title,
    value: community.name,
    name: community.name,
    title: community.title,
    icon: community.icon,
    image: community.image,
  }))
})

function onSelect(option: { value: string } | null) {
  if (!option || option.value === communityState.id) return

  communityState.change(option.value)
  router.push({ name: 'Discussions', params: { communityId: option.value } })
}

function openManageCommunities(setOpen: (value: boolean) => void) {
  setOpen(false)
  showManageCommunities.value = true
}
</script>
