<template>
  <div class="flex min-h-0 flex-col">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold leading-none">Members</h2>
      <div class="flex items-center gap-2">
        <Tooltip text="Filter by Role">
          <Select :options="['All Roles', 'Admin', 'Member', 'Guest']" v-model="filterByRole" />
        </Tooltip>
        <Button @click="showSettingsDialog('Invites')">
          <LucidePlus class="size-4" data-prefix />
          Invite Members
        </Button>
      </div>
    </div>
    <div class="mt-4.5 min-h-0 flex flex-col">
      <FormControl
        placeholder="Search"
        autocomplete="off"
        @input="search = $event.target.value"
        :debounce="300"
      >
        <template #prefix>
          <LucideSearch class="h-4 w-4 text-ink-gray-4" />
        </template>
      </FormControl>

      <ul class="pt-2 divide-y pb-16 overflow-y-auto">
        <li
          class="flex items-center justify-between py-2"
          v-for="user in filteredUsers"
          :key="user.name"
        >
          <div class="flex w-3/5 items-center">
            <UserAvatar :user="user.name" size="xl" />
            <div class="ml-3">
              <div class="text-base text-ink-gray-8">
                {{ user.full_name }}
              </div>
              <div class="mt-1 text-base text-ink-gray-6">
                {{ user.email }}
              </div>
            </div>
          </div>
          <div class="flex w-56 items-center justify-end gap-2">
            <Button
              class="w-24"
              size="sm"
              variant="ghost"
              :disabled="user.role !== 'Gameplan Guest'"
              @click="showGuestPermissions(user)"
            >
              {{ getGuestSpaceText(user) }}
            </Button>
            <Dropdown :options="getDropdownOptions(user)" placement="right">
              <Button class="w-28">
                {{ getUserRole(user) }}
                <template #suffix>
                  <LucideChevronDown class="size-4 ml-auto text-ink-gray-6" />
                </template>
              </Button>
            </Dropdown>
          </div>
        </li>
      </ul>
    </div>

    <!-- Guest Permissions Dialog -->
    <GuestPermissionsDialog v-model="showGuestPermissionsDialog" :user="selectedGuestUser" />
  </div>
</template>
<script setup lang="ts">
import { h, computed, ref, onMounted } from 'vue'
import { Dropdown, Button, Select, useCall } from 'frappe-ui'
import { users, activeUsers, useSessionUser } from '@/data/users'
import { createDialog } from '@/utils/dialogs'
import { useGuestAccessForUser, loadGuestAccess } from '@/data/guestAccess'
import GuestPermissionsDialog from './GuestPermissionsDialog.vue'
import LucideCheck from '~icons/lucide/check'
import LucideShield from '~icons/lucide/shield'
import UserAvatar from '../UserAvatar.vue'
import Tooltip from 'frappe-ui/src/components/Tooltip/Tooltip.vue'
import { showSettingsDialog } from '@/components/Settings'

// Types
interface User {
  name: string
  full_name: string
  email: string
  role: string
}

interface DropdownProps {
  active: boolean
}

interface RoleOptionProps {
  active: boolean
  role: string
  onClick: () => void
  selected: boolean
}

// Template refs
const guestPermissionDialog = ref<InstanceType<typeof GuestPermissionsDialog>>()

// Reactive data
const search = ref('')
const filterByRole = ref<string>('All Roles')
const selectedGuestUser = ref<string | null>(null)
const showGuestPermissionsDialog = ref(false)

// Resources
const changeUserRoleResource = useCall<User>({
  url: '/api/v2/method/gameplan.api.change_user_role',
  immediate: false,
  onSuccess(user: User) {
    users.reload()
    // Reload guest access data since role changes may affect permissions
    loadGuestAccess()
  },
})

const removeUserResource = useCall<string>({
  url: '/api/v2/method/gameplan.api.remove_user',
  immediate: false,
  onSuccess() {
    users.reload()
  },
})

// Computed
const filteredUsers = computed(() => {
  if (!search.value && !filterByRole.value) {
    return activeUsers.value
  }
  return activeUsers.value.filter((user: User) => {
    let term = search.value.toLowerCase()
    let matchesSearch =
      user.name.toLowerCase().includes(term) || user.full_name.toLowerCase().includes(term)
    let matchesRole =
      filterByRole.value && filterByRole.value !== 'All Roles'
        ? user.role === `Gameplan ${filterByRole.value}`
        : true
    return matchesSearch && matchesRole
  })
})

// Load guest access data on component mount
onMounted(() => {
  loadGuestAccess()
})

// Methods
function getGuestSpaceCount(user: User) {
  const userGuestAccess = useGuestAccessForUser(() => user.name)
  return userGuestAccess.value?.length || 0
}

function getGuestSpaceText(user: User) {
  if (user.role === 'Gameplan Guest') {
    const count = getGuestSpaceCount(user)
    return count === 1 ? '1 space' : `${count} spaces`
  }
  return 'All spaces'
}

function changeUserRole({ user, role }: { user: User; role: string }) {
  createDialog({
    title: 'Change Role',
    message: `Are you sure you want to change ${user.full_name}'s role to ${role}?`,
    actions: [
      {
        label: 'Change Role',
        variant: 'solid',
        onClick: ({ close }) => {
          return changeUserRoleResource.submit({ user: user.name, role }).then(() => {
            close()
          })
        },
      },
      {
        label: 'Cancel',
      },
    ],
  })
}

function removeUser(user: User) {
  createDialog({
    title: 'Remove User',
    message: `Are you sure you want to remove ${user.full_name} (${user.email})?`,
    actions: [
      {
        label: 'Remove User',
        variant: 'solid',
        theme: 'red',
        onClick: ({ close }) => {
          return removeUserResource.submit({ user: user.name }).then(() => {
            close()
          })
        },
      },
      {
        label: 'Cancel',
      },
    ],
  })
}

function getUserRole(user: User) {
  return (user.role || '').replace('Gameplan', '')
}

function showGuestPermissions(user: User) {
  selectedGuestUser.value = user.name
  showGuestPermissionsDialog.value = true
}

function getDropdownOptions(user: User) {
  return [
    {
      label: 'Admin',
      component: (props: DropdownProps) =>
        RoleOption({
          role: 'Admin',
          active: props.active,
          selected: user.role === 'Gameplan Admin',
          onClick: () =>
            changeUserRole({
              user: user,
              role: 'Gameplan Admin',
            }),
        }),
    },
    {
      label: 'Member',
      component: (props: DropdownProps) =>
        RoleOption({
          role: 'Member',
          active: props.active,
          selected: user.role === 'Gameplan Member',
          onClick: () =>
            changeUserRole({
              user: user,
              role: 'Gameplan Member',
            }),
        }),
    },
    {
      label: 'Guest',
      component: (props: DropdownProps) =>
        RoleOption({
          role: 'Guest',
          active: props.active,
          selected: user.role === 'Gameplan Guest',
          onClick: () =>
            changeUserRole({
              user: user,
              role: 'Gameplan Guest',
            }),
        }),
    },
    {
      label: 'Remove',
      component: (props: DropdownProps) =>
        h(
          'button',
          {
            class: [
              props.active ? 'bg-surface-gray-2' : '',
              'group flex w-full items-center text-ink-red-3 rounded-md px-2 py-2 text-sm',
            ],
            onClick: () => removeUser(user),
          },
          'Remove',
        ),
    },
  ]
}

function RoleOption({ active, role, onClick, selected }: RoleOptionProps) {
  return h(
    'button',
    {
      class: [
        active ? 'bg-surface-gray-2' : 'text-ink-gray-8',
        'group flex w-full justify-between items-center rounded-md px-2 py-2 text-sm',
      ],
      onClick: !selected ? onClick : null,
    },
    [
      h('span', { class: 'whitespace-nowrap' }, role),
      selected
        ? h(LucideCheck, {
            class: ['h-4 w-4 shrink-0 text-ink-gray-6'],
            'aria-hidden': true,
          })
        : null,
    ],
  )
}
</script>
