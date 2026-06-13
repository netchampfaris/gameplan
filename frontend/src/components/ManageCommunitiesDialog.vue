<template>
  <Dialog v-model:open="show" title="Manage communities">
    <div class="space-y-4">
      <p class="text-p-sm text-ink-gray-6">
        Choose the communities you want in your sidebar. Public communities can be joined anytime.
      </p>

      <div class="space-y-1">
        <button
          v-for="team in availableTeams"
          :key="team.name"
          type="button"
          class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-surface-gray-1"
          @click="toggleTeam(team.name)"
        >
          <Checkbox :modelValue="isSelected(team.name)" />
          <span
            class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-surface-gray-1"
          >
            <img
              v-if="team.image"
              :src="team.image"
              :alt="team.title"
              class="size-full object-cover"
            />
            <span v-else-if="team.icon" class="text-base leading-none">{{ team.icon }}</span>
            <span v-else class="text-xs font-medium uppercase text-ink-gray-7">
              {{ team.title?.[0] }}
            </span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-1.5 text-base text-ink-gray-8">
              <span class="truncate">{{ team.title }}</span>
              <span v-if="team.is_private" class="lucide-lock size-3.5 shrink-0 text-ink-gray-5" />
            </span>
          </span>
          <span v-if="isTeamJoined(team)" class="shrink-0 text-sm text-ink-gray-5">Joined</span>
        </button>

        <div
          v-if="availableTeams.length === 0"
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
          :disabled="selectedTeamNames.length === 0"
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
import { Button, Checkbox, Dialog, toast, useCall } from 'frappe-ui'
import { activeCategory } from '@/data/activeCategory'
import { activeTeams, availableTeams, isTeamJoined, teams } from '@/data/teams'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const route = useRoute()
const router = useRouter()
const selectedTeamNames = ref<string[]>([])

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
      selectedTeamNames.value = activeTeams.value.map((team) => team.name)
    }
  },
)

function isSelected(teamName: string) {
  return selectedTeamNames.value.includes(teamName)
}

function toggleTeam(teamName: string) {
  if (isSelected(teamName)) {
    selectedTeamNames.value = selectedTeamNames.value.filter((name) => name !== teamName)
  } else {
    selectedTeamNames.value = [...selectedTeamNames.value, teamName]
  }
}

async function save() {
  if (selectedTeamNames.value.length === 0) {
    toast.error('Select at least one community')
    return
  }

  let previousActiveTeam = activeCategory.id

  try {
    await updateJoinedTeams.submit({ teams: selectedTeamNames.value })
    await teams.reload()

    if (previousActiveTeam && !selectedTeamNames.value.includes(previousActiveTeam)) {
      let nextTeam = activeTeams.value[0]
      activeCategory.change(nextTeam?.name ?? null)

      if (route.matched.some((record) => record.meta?.categoryScope)) {
        router.push(
          nextTeam
            ? { name: 'Discussions', params: { teamId: nextTeam.name } }
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
