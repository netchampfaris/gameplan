import { MaybeRefOrGetter, onScopeDispose, toValue } from 'vue'
import { useDoc, useList } from 'frappe-ui'
import { UseListOptions } from 'frappe-ui'
import { GPDiscussion } from '@/types/doctypes'
import { serverEvents } from '@/serverEvents'

export interface Discussion extends GPDiscussion {
  project_title: string
  last_post_at: string
  unread: number
  last_comment_content?: string
  last_poll_title?: string
}

interface DiscussionCreatedEvent {
  name: string
  owner: string
  project: string
  team: string
}

export type UseDiscussionOptions = Pick<
  UseListOptions<Discussion>,
  'cacheKey' | 'filters' | 'limit' | 'orderBy' | 'immediate'
>

export function useDiscussions(options: UseDiscussionOptions) {
  const discussions = useList<Discussion>({
    url: '/api/v2/method/gameplan.gameplan.doctype.gp_discussion.api.get_discussions',
    doctype: 'GP Discussion',
    cacheKey: options.cacheKey ? ['Discussions', options.cacheKey] : undefined,
    filters: options.filters,
    limit: options.limit || 50,
    orderBy: options.orderBy,
    immediate: options.immediate ?? true,
  })

  const stopListening = serverEvents.on<DiscussionCreatedEvent>('discussion:created', (event) => {
    if (!shouldReloadDiscussionList(options.filters, event)) {
      return
    }

    discussions.reload()
  })

  onScopeDispose(stopListening)

  return discussions
}

function shouldReloadDiscussionList(
  filters: UseDiscussionOptions['filters'],
  event: DiscussionCreatedEvent,
) {
  const resolvedFilters = toValue(filters)
  if (!resolvedFilters || typeof resolvedFilters !== 'object' || Array.isArray(resolvedFilters)) {
    return true
  }

  if (resolvedFilters.project && resolvedFilters.project !== event.project) {
    return false
  }

  if (resolvedFilters.team && resolvedFilters.team !== event.team) {
    return false
  }

  if (resolvedFilters.owner && resolvedFilters.owner !== event.owner) {
    return false
  }

  if (resolvedFilters.participator && resolvedFilters.participator !== event.owner) {
    return false
  }

  if (resolvedFilters.feed_type === 'bookmarks') {
    return false
  }

  return true
}

let discussionsCache: Record<string, ReturnType<typeof useDoc>> = {}

export function useDiscussion(discussionId: MaybeRefOrGetter<string>) {
  interface Discussion extends GPDiscussion {
    last_unread_comment: string
    last_unread_poll: string
    is_bookmarked: boolean
    views: number
  }

  interface DiscussionMethods {
    trackVisit: () => void
    markAsUnread: () => void
    closeDiscussion: () => void
    reopenDiscussion: () => void
    pinDiscussion: (data: { pin_scope: 'Global' | 'Space' }) => void
    unpinDiscussion: () => void
    addBookmark: () => void
    removeBookmark: () => void
    moveToProject: (data: { project: string }) => void
  }

  let name = toValue(discussionId)
  if (!discussionsCache[name]) {
    discussionsCache[name] = useDoc<Discussion, DiscussionMethods>({
      doctype: 'GP Discussion',
      name: discussionId,
      methods: {
        trackVisit: 'track_visit',
        markAsUnread: 'mark_as_unread',
        closeDiscussion: 'close_discussion',
        reopenDiscussion: 'reopen_discussion',
        pinDiscussion: 'pin_discussion',
        unpinDiscussion: 'unpin_discussion',
        addBookmark: 'add_bookmark',
        removeBookmark: 'remove_bookmark',
        moveToProject: 'move_to_project',
      },
    })
  }
  return discussionsCache[name] as ReturnType<typeof useDoc<Discussion, DiscussionMethods>>
}
