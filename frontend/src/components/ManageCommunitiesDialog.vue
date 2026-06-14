<template>
  <Dialog v-model:open="show" title="Manage communities" size="md">
    <div class="space-y-3">
      <p class="text-p-base text-ink-gray-6">
        Choose the communities you want in your sidebar. Public communities can be joined anytime.
      </p>

      <div class="space-y-0.5">
        <div
          v-for="community in availableCommunities"
          :key="community.name"
          class="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition hover:bg-surface-gray-1"
          @click="toggleCommunity(community.name)"
        >
          <span
            class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-surface-gray-1"
          >
            <img
              v-if="community.image"
              :src="community.image"
              :alt="community.title"
              class="size-full object-cover"
            />
            <span v-else-if="community.icon" class="text-base leading-none">{{
              community.icon
            }}</span>
            <span v-else class="text-xs font-medium uppercase text-ink-gray-7">
              {{ community.title?.[0] }}
            </span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-1.5 text-base text-ink-gray-8">
              <span class="truncate">{{ community.title }}</span>
              <span
                v-if="community.is_private"
                class="lucide-lock size-3.5 shrink-0 text-ink-gray-5"
              />
            </span>
          </span>
          <Switch
            size="sm"
            :label="community.title"
            :model-value="isSelected(community.name)"
            class="shrink-0 [&_label]:sr-only"
            @click.stop
            @update:model-value="setCommunitySelected(community.name, $event)"
          />
        </div>

        <div
          v-if="availableCommunities.length === 0"
          class="px-3 py-6 text-center text-p-sm text-ink-gray-5"
        >
          No communities found
        </div>
      </div>
    </div>

    <template #actions>
      <div class="flex items-center justify-end gap-2">
        <Button variant="ghost" @click="show = false">Cancel</Button>
        <Button
          variant="solid"
          :disabled="selectedCommunityNames.length === 0"
          :loading="updateJoinedTeams.loading"
          @click="save"
        >
          Save
        </Button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Dialog, Switch, toast, useCall } from 'frappe-ui'
import { communityState } from '@/data/communityState'
import { activeCommunities, availableCommunities, communities } from '@/data/communities'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const route = useRoute()
const router = useRouter()
const selectedCommunityNames = ref<string[]>([])

const show = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const updateJoinedTeams = useCall<string[], { teams: string[] }>({
  url: '/api/v2/method/GP Team/update_joined_teams',
  method: 'POST',
  immediate: false,
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selectedCommunityNames.value = activeCommunities.value.map((community) => community.name)
    }
  },
)

function isSelected(communityName: string) {
  return selectedCommunityNames.value.includes(communityName)
}

function toggleCommunity(communityName: string) {
  if (isSelected(communityName)) {
    selectedCommunityNames.value = selectedCommunityNames.value.filter(
      (name) => name !== communityName,
    )
  } else {
    selectedCommunityNames.value = [...selectedCommunityNames.value, communityName]
  }
}

function setCommunitySelected(communityName: string, selected: boolean) {
  if (selected === isSelected(communityName)) return
  toggleCommunity(communityName)
}

async function save() {
  if (selectedCommunityNames.value.length === 0) {
    toast.error('Select at least one community')
    return
  }

  let previousCommunityId = communityState.id

  try {
    await updateJoinedTeams.submit({ teams: selectedCommunityNames.value })
    await communities.reload()

    if (previousCommunityId && !selectedCommunityNames.value.includes(previousCommunityId)) {
      let nextCommunity = activeCommunities.value[0]
      communityState.change(nextCommunity?.name ?? null)

      if (route.matched.some((record) => record.meta?.communityScope)) {
        router.push(
          nextCommunity
            ? { name: 'Discussions', params: { communityId: nextCommunity.name } }
            : { name: 'PersonalHome' },
        )
      }
    }

    show.value = false
    toast.success('Communities updated')
  } catch {
    toast.error('Failed to update communities')
  }
}
</script>
