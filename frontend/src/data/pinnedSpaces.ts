import { GPPinnedProject } from '@/doctypes'

export const pinnedSpaces = GPPinnedProject.getList({
  fields: ['project', 'team', 'user', 'name'],
  filters: {
    'project.archived_at': ['=', null],
  },
  orderBy: 'creation desc',
  limit: 99999,
})

export function isPinned(spaceId: string) {
  return pinnedSpaces.data?.some((p) => p.project.toString() === spaceId.toString())
}

export function pinSpace(spaceId: string) {
  return pinnedSpaces.insert.call({
    project: spaceId,
  })
}

export function unpinSpace(spaceId: string) {
  let pin = pinnedSpaces.data?.find((p) => p.project.toString() === spaceId.toString())
  if (pin) {
    return pinnedSpaces.delete.call(pin.name.toString())
  }
  return Promise.resolve()
}

export function isPinActionLoading(spaceId: string) {
  let pin = pinnedSpaces.data?.find((p) => p.project.toString() === spaceId.toString())
  if (pin) {
    return pinnedSpaces.isItemLoading(pin.name.toString(), 'delete')
  } else {
    return pinnedSpaces.insert.loading
  }
}
