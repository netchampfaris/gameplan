import { computed, MaybeRefOrGetter, toValue } from 'vue'
import { useList, useDoctype } from 'frappe-ui/src/data-fetching'
import { GPGuestAccess } from '@/types/doctypes'

export interface GuestAccess extends GPGuestAccess {
  project_title?: string
  team_title?: string
  project_icon?: string
}

export let guestAccess = useList<GuestAccess>({
  doctype: 'GP Guest Access',
  fields: [
    'name',
    'user',
    'project',
    'team',
    'project.title as project_title',
    'project.icon as project_icon',
    'team.title as team_title',
  ],
  initialData: [],
  orderBy: 'modified desc',
  limit: 99999,
  cacheKey: 'guestAccess',
  transform(data) {
    for (let access of data) {
      access.name = access.name.toString()
    }
    return data
  },
  immediate: false,
})

export function useGuestAccessForUser(email: MaybeRefOrGetter<string | null>) {
  return computed(() => {
    let _email = toValue(email)
    if (!_email) return []
    return (guestAccess.data || []).filter((access) => access.user === _email)
  })
}

export function useGuestAccessForProject(projectId: MaybeRefOrGetter<string | undefined>) {
  return computed(() => {
    let _projectId = toValue(projectId)
    if (!_projectId) return []
    return (guestAccess.data || []).filter((access) => access.project === _projectId)
  })
}

export function getGuestSpaces(userEmail: string) {
  return computed(() => {
    const userAccess = (guestAccess.data || []).filter((access) => access.user === userEmail)
    return userAccess.map((access) => ({
      name: access.project,
      title: access.project_title || access.project,
      team: access.team,
      team_title: access.team_title || access.team,
    }))
  })
}

const guestAccessDoctype = useDoctype<GPGuestAccess>('GP Guest Access')

export function grantGuestAccess(userEmail: string, projectId: string) {
  return guestAccessDoctype.runMethod
    .submit({
      method: 'create_guest_access',
      params: {
        user: userEmail,
        project: projectId,
      },
    })
    .then(() => {
      guestAccess.reload()
    })
}

export function revokeGuestAccess(accessId: string) {
  return guestAccess.delete.submit({ name: accessId }).then(() => {
    guestAccess.reload()
  })
}

export function revokeUserGuestAccess(userEmail: string) {
  return guestAccessDoctype.runMethod
    .submit({
      method: 'remove_user_access',
      params: {
        user: userEmail,
      },
    })
    .then(() => {
      guestAccess.reload()
    })
}

export function isGuestAccessLoading(method: string, docname?: string) {
  return guestAccessDoctype.runMethod.isLoading(method) || guestAccess.delete.loading
}

export function loadGuestAccess() {
  return guestAccess.reload()
}
