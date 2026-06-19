<template>
  <div v-if="communityGuests.length">
    <div class="mb-4">
      <h2 class="text-lg-medium text-ink-gray-9">Guests</h2>
      <p class="mt-1 text-base text-ink-gray-5">
        Guests are invited to specific spaces and do not become community members.
      </p>
    </div>

    <ConfigureList
      header-class="hidden grid-cols-[1.25rem_minmax(12rem,1fr)_minmax(12rem,1fr)_8rem_3rem] gap-2 items-center h-7 text-sm text-ink-gray-6 md:grid"
    >
      <template #header>
        <div class="col-span-2">Guest</div>
        <div>Email</div>
        <div>Spaces</div>
        <div />
      </template>
      <div
        v-for="guest in communityGuests"
        :key="guest.key"
        class="grid h-10 grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-2 md:grid-cols-[1.25rem_minmax(12rem,1fr)_minmax(12rem,1fr)_8rem_3rem]"
      >
        <UserAvatar :user="guest.user" size="sm" class="shrink-0" />

        <div class="min-w-0">
          <div class="truncate text-base-medium text-ink-gray-7">
            {{ guest.fullName }}
          </div>
          <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-base text-ink-gray-5 md:hidden">
            <span>{{ guest.email }}</span>
            <span>{{ guest.spacesLabel }}</span>
          </div>
        </div>

        <div class="hidden truncate text-base text-ink-gray-5 md:block">
          {{ guest.email }}
        </div>
        <div class="hidden truncate text-base text-ink-gray-5 md:block">
          {{ guest.spacesLabel }}
        </div>
        <div class="hidden md:block" />
      </div>
    </ConfigureList>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useList } from 'frappe-ui'
import UserAvatar from '@/components/UserAvatar.vue'
import type { Community } from '@/data/communities'
import { getSpace, spaces } from '@/data/spaces'
import { useUser } from '@/data/users'
import type { GPGuestAccess, GPInvitation } from '@/types/doctypes'
import ConfigureList from './ConfigureList.vue'

const props = defineProps<{
  community: Community
}>()

const guestAccess = useList<GPGuestAccess>({
  doctype: 'GP Guest Access',
  fields: ['name', 'user', 'project', 'team'],
  filters: () => ({ team: props.community.name }),
})

const pendingGuestInvitations = useList<GPInvitation>({
  doctype: 'GP Invitation',
  fields: ['name', 'email', 'projects', 'role', 'status'],
  filters: {
    role: 'Gameplan Guest',
    status: 'Pending',
  },
})

const communitySpaceNames = computed(() => {
  return new Set(
    (spaces.data || [])
      .filter((space) => space.team === props.community.name)
      .map((space) => space.name),
  )
})

const communityGuests = computed(() => {
  const guests = new Map<string, GuestSummary>()

  for (const access of guestAccess.data || []) {
    addGuestSummary(guests, {
      key: access.user,
      user: access.user,
      fullName: useUser(access.user).full_name,
      email: useUser(access.user).email,
      projectNames: [access.project],
    })
  }

  for (const invitation of pendingGuestInvitations.data || []) {
    const projectNames = parseProjectNames(invitation.projects).filter((project) =>
      communitySpaceNames.value.has(project),
    )
    if (!projectNames.length) continue

    addGuestSummary(guests, {
      key: `pending:${invitation.email}`,
      user: invitation.email,
      fullName: invitation.email,
      email: invitation.email,
      projectNames,
    })
  }

  return Array.from(guests.values())
    .map((guest) => ({
      ...guest,
      spacesLabel: formatSpacesLabel(guest.projectNames),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
})

type GuestSummary = {
  key: string
  user: string
  fullName: string
  email: string
  projectNames: string[]
}

function addGuestSummary(guests: Map<string, GuestSummary>, guest: GuestSummary) {
  const existingGuest = guests.get(guest.key)
  if (!existingGuest) {
    guests.set(guest.key, {
      ...guest,
      projectNames: uniqueProjectNames(guest.projectNames),
    })
    return
  }

  existingGuest.projectNames = uniqueProjectNames([
    ...existingGuest.projectNames,
    ...guest.projectNames,
  ])
}

function parseProjectNames(projects?: string) {
  if (!projects) return []

  try {
    const value = JSON.parse(projects)
    return Array.isArray(value) ? value.map(String) : []
  } catch {
    return []
  }
}

function formatSpacesLabel(projectNames: string[]) {
  return projectNames
    .map((project) => getSpace(project)?.title || project)
    .sort((a, b) => a.localeCompare(b))
    .join(', ')
}

function uniqueProjectNames(projectNames: string[]) {
  return Array.from(new Set(projectNames.filter(Boolean)))
}
</script>
