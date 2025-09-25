<template>
  <Dialog
    v-if="user"
    :model-value="show"
    @update:model-value="show = $event"
    :options="{ size: '2xl' }"
  >
    <template #body-header>
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-3">
          <UserAvatar :user="user" size="lg" />
          <h2 class="text-xl font-semibold text-ink-gray-9">{{ useUser(user).full_name }}</h2>
          <Badge v-if="userGuestSpaces.length > 0" variant="subtle" :label="accessibleSpacesText" />
        </div>
        <Button variant="ghost" @click="show = false">
          <LucideX class="h-4 w-4" />
        </Button>
      </div>
    </template>
    <template #body-content>
      <div v-if="guestAccess.loading" class="flex justify-center py-8">
        <LoadingIndicator class="h-6 w-6" />
      </div>

      <div v-else-if="userGuestSpaces.length === 0" class="text-center py-8">
        <div class="text-ink-gray-6">
          <LucideLock class="mx-auto size-6 mb-3 text-ink-gray-5" />
          <p class="text-base">No spaces accessible</p>
        </div>
      </div>

      <div v-else class="divide-y">
        <div
          v-for="space in userGuestSpaces"
          :key="space.name"
          class="flex items-center justify-between py-2 bg-surface-white"
        >
          <div class="flex items-center space-x-3">
            <div class="text-base font-medium flex items-center">
              <span class="text-ink-gray-6">{{ space.team_title }}</span>
              <LucideChevronRight class="text-ink-gray-6 size-4 mx-1" />
              <div class="flex size-4 items-center justify-center rounded bg-surface-gray-1">
                <span v-if="space.icon" class="font-[emoji]">{{ space.icon }}</span>
              </div>
              <span class="ml-2 text-ink-gray-8">{{ space.title }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="outline" label="Read, Post, Comment Access" />
            <Button
              variant="ghost"
              size="sm"
              @click="removeGuestAccess(space)"
              :loading="isRemoveLoading(space.accessId)"
            >
              <LucideX class="h-4 w-4 text-ink-gray-6" />
            </Button>
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { Dialog, Button, Badge, LoadingIndicator, toast } from 'frappe-ui'
import UserAvatar from '@/components/UserAvatar.vue'
import {
  useGuestAccessForUser,
  guestAccess,
  loadGuestAccess,
  revokeGuestAccess,
  isGuestAccessLoading,
} from '@/data/guestAccess'
import { createDialog } from '@/utils/dialogs'
import LucideX from '~icons/lucide/x'
import LucideLock from '~icons/lucide/lock'
import LucideFolder from '~icons/lucide/folder'
import LucideChevronRight from '~icons/lucide/chevron-right'
import LucideTrash2 from '~icons/lucide/trash-2'
import { useUser } from '@/data/users'

interface Props {
  user: string | null
}

const props = defineProps<Props>()
const show = defineModel<boolean>({ default: false })

const userGuestAccess = useGuestAccessForUser(() => props.user)
const userGuestSpaces = computed(() => {
  return (userGuestAccess.value || []).map((access) => ({
    name: access.project,
    title: access.project_title || access.project,
    team: access.team,
    team_title: access.team_title || access.team,
    icon: access.project_icon,
    accessId: access.name, // Include the access record ID for deletion
  }))
})

// Methods
function removeGuestAccess(space: any) {
  createDialog({
    title: 'Remove Access',
    message: `Are you sure you want to remove ${useUser(props.user).full_name}'s access to "${
      space.title
    }"?`,
    actions: [
      {
        label: 'Cancel',
      },
      {
        label: 'Remove Access',
        variant: 'solid',
        theme: 'red',
        onClick: ({ close }) => {
          return revokeGuestAccess(space.accessId).then(() => {
            toast.success(`Removed access to "${space.title}"`)
            close()
          })
        },
      },
    ],
  })
}

function isRemoveLoading(accessId: string) {
  return isGuestAccessLoading('delete', accessId)
}

const accessibleSpacesText = computed(() => {
  const count = userGuestSpaces.value.length
  return count === 1 ? '1 space accessible' : `${count} spaces accessible`
})

// Load guest access data when dialog is opened
watch(show, (newValue) => {
  if (newValue) {
    loadGuestAccess()
  }
})

// Watch for changes in guest access data to update the count badge
watch(
  userGuestSpaces,
  () => {
    // The computed property will automatically update when the underlying data changes
  },
  { deep: true },
)
</script>
