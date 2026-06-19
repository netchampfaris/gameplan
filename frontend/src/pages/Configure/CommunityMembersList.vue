<template>
  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-lg-medium text-ink-gray-9">Members</h2>
      <p class="mt-1 text-base text-ink-gray-5">
        Members can access public spaces in this community.
      </p>
    </div>
    <Button
      icon-left="lucide-user-plus"
      :disabled="Boolean(community.archived_at)"
      @click="showAddMembersDialog = true"
    >
      Add members
    </Button>
  </div>

  <ConfigureList
    v-if="communityMembers.length"
    header-class="hidden grid-cols-[1.25rem_minmax(12rem,1fr)_minmax(12rem,1fr)_8rem_3rem] gap-2 items-center h-7 text-sm text-ink-gray-6 md:grid"
  >
    <template #header>
      <div class="col-span-2">Member</div>
      <div>Email</div>
      <div>Role</div>
      <div />
    </template>
    <MemberRow
      v-for="member in communityMembers"
      :key="member.user"
      :community="community"
      :member="member"
    />
  </ConfigureList>

  <ConfigureEmptyState
    v-else
    icon="lucide-users"
    title="No members yet"
    description="Add community members so they can access public spaces here."
  >
    <template #actions>
      <Button
        icon-left="lucide-user-plus"
        :disabled="Boolean(community.archived_at)"
        @click="showAddMembersDialog = true"
      >
        Add members
      </Button>
    </template>
  </ConfigureEmptyState>

  <CommunityGuestsList class="mt-10" :community="community" />

  <Dialog title="Add members" v-model:open="showAddMembersDialog">
    <div class="space-y-4">
      <ul v-if="membersToAdd.length" class="flex flex-wrap gap-2">
        <li
          class="flex items-center gap-2 rounded bg-surface-gray-2 px-2 py-1.5"
          v-for="user in membersToAdd"
          :key="user.value"
        >
          <UserAvatar :user="user.value" size="sm" />
          <span class="text-base text-ink-gray-8">{{ user.label }}</span>
          <Button
            variant="ghost"
            icon="lucide-x"
            @click="membersToAdd = membersToAdd.filter((member) => member.value !== user.value)"
          />
        </li>
      </ul>

      <Combobox
        :options="addableMembers"
        v-model="selectedUser"
        placeholder="Jane Doe"
        open-on-click
      >
        <template #item-prefix="{ item }">
          <UserAvatar :user="item.value" size="xs" />
        </template>
      </Combobox>
      <ErrorMessage :message="teams.runDocMethod.error" />
    </div>
    <template #actions>
      <Button
        class="w-full"
        variant="solid"
        :disabled="!membersToAdd.length"
        :loading="teams.runDocMethod.isLoading(community.name, 'add_members')"
        @click="addMembers"
      >
        Add
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button, Combobox, Dialog, ErrorMessage, toast, useDoctype } from 'frappe-ui'
import type { Community } from '@/data/communities'
import { communities } from '@/data/communities'
import { activeUsers, useUser } from '@/data/users'
import UserAvatar from '@/components/UserAvatar.vue'
import type { GPTeam } from '@/types/doctypes'
import ConfigureEmptyState from './ConfigureEmptyState.vue'
import ConfigureList from './ConfigureList.vue'
import CommunityGuestsList from './CommunityGuestsList.vue'
import MemberRow from './MemberRow.vue'

const props = defineProps<{
  community: Community
}>()

const teams = useDoctype<GPTeam>('GP Team')
const showAddMembersDialog = ref(false)
const selectedUser = ref<string | null>(null)
const membersToAdd = ref<{ value: string; label: string }[]>([])

const communityMembers = computed(() => {
  const seen = new Set<string>()

  return props.community.members
    .filter((member) => {
      if (!member.user || seen.has(member.user)) return false
      seen.add(member.user)
      return true
    })
    .sort((a, b) => {
      return useUser(a.user).full_name.localeCompare(useUser(b.user).full_name)
    })
})

const addableMembers = computed(() => {
  const existingMembers = new Set(props.community.members.map((member) => member.user))
  const queuedMembers = new Set(membersToAdd.value.map((member) => member.value))

  return activeUsers.value
    .filter((user) => user.isNotGuest)
    .filter((user) => !existingMembers.has(user.name) && !queuedMembers.has(user.name))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
    .map((user) => ({ value: user.name, label: user.full_name }))
})

watch(selectedUser, (value) => {
  if (!value) return

  const user = addableMembers.value.find((member) => member.value === value)
  if (user) {
    membersToAdd.value.push(user)
  }
  selectedUser.value = null
})

watch(showAddMembersDialog, (value) => {
  if (!value) {
    selectedUser.value = null
    membersToAdd.value = []
  }
})

async function addMembers() {
  if (!membersToAdd.value.length) return

  await teams.runDocMethod.submit({
    name: props.community.name,
    method: 'add_members',
    params: {
      users: membersToAdd.value.map((member) => member.value),
    },
  })
  await communities.reload()
  toast.success('Members added')
  showAddMembersDialog.value = false
}
</script>
