import { useCall } from 'frappe-ui'
import { GPProject } from '@/doctypes'
import { reactive } from 'vue'

interface ProjectUnreadCount {
  [spaceId: string]: number
}

const unreadCounts = reactive<ProjectUnreadCount>({})

const unreadCountByProjects = useCall<ProjectUnreadCount, { projects?: string[] }>({
  url: '/api/v2/method/GP Unread Record/get_unread_count',
  method: 'POST',
  immediate: false,
  onSuccess(data) {
    for (const [spaceId, count] of Object.entries(data)) {
      unreadCounts[spaceId] = count
    }
  },
})

// load unread count for all projects once
unreadCountByProjects.submit({})

export function getProjectUnreadCount(spaceId: string) {
  return unreadCounts[spaceId] ?? 0
}

export function markSpaceAsRead(spaceId: string) {
  const handle = GPProject.getDoc(spaceId)
  return handle.promise
    .then(() => handle.markAllAsRead.call())
    .then(() => refreshUnreadCountForProjects([spaceId]))
}

export function markSpacesAsRead(spaceIds: string[]) {
  return GPProject.markAllAsRead
    .call({ spaces: spaceIds })
    .then(() => refreshUnreadCountForProjects(spaceIds))
}

export function refreshUnreadCountForProjects(projects: string[]) {
  return unreadCountByProjects.submit({ projects })
}
