import { computed, MaybeRefOrGetter, ref, toValue } from 'vue'
import { useCall, dialog } from 'frappe-ui'
import { GPProject } from '@/doctypes'
import type { GPProjectInterface, GPMemberInterface } from '@/doctypes'
import { getProjectUnreadCount, markSpacesAsRead } from './unreadCount'

interface Member extends Pick<GPMemberInterface, 'user'> {}

export interface Space
  extends Pick<
    GPProjectInterface,
    | 'name'
    | 'title'
    | 'icon'
    | 'team'
    | 'archived_at'
    | 'is_private'
    | 'modified'
    | 'tasks_count'
    | 'discussions_count'
  > {
  team_title: string
  members: Member[]
}

export let spaces = GPProject.getList<Space>({
  fields: [
    'name',
    'title',
    'icon',
    'team',
    'archived_at',
    'is_private',
    'modified',
    'tasks_count',
    'discussions_count',
    'team.title as team_title',
    { members: ['user'] } as any,
  ],
  orderBy: 'title asc',
  limit: 99999,
  transform(doc) {
    doc.name = doc.name.toString()
    return doc
  },
})

export function useSpace(name: MaybeRefOrGetter<string | undefined>) {
  return computed(() => {
    let _name = toValue(name)
    if (!_name) return null
    return spaces.data?.find((space) => space.name.toString() === _name?.toString()) ?? null
  })
}

export const joinedSpaces = useCall<string[]>({
  url: '/api/v2/method/GP Project/get_joined_spaces',
  cacheKey: 'joinedSpaces',
  initialData: [],
})

export function hasJoined(spaceId: MaybeRefOrGetter<string>) {
  return joinedSpaces.data?.includes(toValue(spaceId))
}

export function getSpaceUnreadCount(spaceId: string) {
  return getProjectUnreadCount(spaceId)
}

export function joinSpace(space: Space) {
  const handle = GPProject.getDoc(space.name)
  return handle.promise.then(() => handle.join.call()).then(() => joinedSpaces.reload())
}

export function joinSpaces(spaceIds: string[]) {
  return GPProject.joinSpaces.call({ spaces: spaceIds }).then(() => joinedSpaces.reload())
}

export function leaveSpace(space: Space) {
  const handle = GPProject.getDoc(space.name)
  return handle.promise.then(() => handle.leave.call()).then(() => joinedSpaces.reload())
}

export function leaveSpaces(spaceIds: string[]) {
  return GPProject.leaveSpaces.call({ spaces: spaceIds }).then(() => joinedSpaces.reload())
}

export function unarchiveSpace(space: Space) {
  const handle = GPProject.getDoc(space.name)
  return handle.promise.then(() => handle.unarchive.call())
}

const _markAllAsReadLoading = ref(false)

export function markAllAsRead(spaceIds: string[], groupTitle: string) {
  dialog.confirm({
    title: 'Mark all as read',
    message: `Are you sure you want to mark all discussions in ${groupTitle} as read? This action cannot be undone.`,
    confirmLabel: 'Mark all as read',
    onConfirm: () => markSpacesAsRead(spaceIds),
  })
}

export function isMethodLoading(method: string) {
  if (method === 'mark_all_as_read') {
    return GPProject.markAllAsRead.loading
  }
  return false
}

// Convenience aliases for project-oriented consumers (TeamOverview, Project page)

export let activeProjects = computed(
  () => spaces.data?.filter((space) => !space.archived_at) || [],
)

export let archivedProjects = computed(
  () => spaces.data?.filter((space) => space.archived_at) || [],
)

export function getTeamProjects(team: string) {
  return activeProjects.value.filter((project) => project.team === team) || []
}

export function getTeamArchivedProjects(team: string) {
  return archivedProjects.value.filter((project) => project.team === team) || []
}

export function getProject(projectId: string | null) {
  if (projectId == null) return null
  return spaces.data?.find((p) => p.name.toString() === projectId.toString()) ?? null
}
