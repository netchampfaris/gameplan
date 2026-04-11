import { MaybeRefOrGetter } from 'vue'
import { GPDiscussion } from '@/doctypes'
import type { GPDiscussionInterface } from '@/doctypes'

export interface Discussion extends GPDiscussionInterface {
  project_title: string
  last_post_at: string
  unread: number
  last_comment_content?: string
  last_poll_title?: string
}

export interface UseDiscussionOptions {
  filters?: Record<string, any>
  limit?: number
  orderBy?: MaybeRefOrGetter<string | undefined>
}

export function useDiscussions(options: UseDiscussionOptions) {
  return GPDiscussion.getList<Discussion>({
    url: '/api/v2/method/gameplan.gameplan.doctype.gp_discussion.api.get_discussions',
    filters: options.filters,
    limit: options.limit || 50,
    orderBy: options.orderBy,
  })
}

export function useDiscussion(discussionId: MaybeRefOrGetter<string>) {
  return GPDiscussion.getDoc(discussionId)
}
