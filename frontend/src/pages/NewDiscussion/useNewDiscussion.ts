import { ref, computed, onMounted, provide, inject, watch, type InjectionKey } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { call, useDoctype, dialog } from 'frappe-ui'
import { useDraftSync, type DraftPayload } from '@/data/useDraftSync'
import { useGroupedSpaceOptions } from '@/data/groupedSpaces'
import { getSpace } from '@/data/spaces'
import { useSessionUser, useUser } from '@/data/users'
import { tags } from '@/data/tags'
import type { TextEditorRef } from './types'
import type { GPDiscussion } from '@/types/doctypes'

const PUBLISH_DRAFT = 'gameplan.gameplan.doctype.gp_draft.gp_draft.publish_draft'

/** Title or non-empty body — the threshold for persisting a draft at all. */
function hasMeaningfulContent(payload: Partial<DraftPayload>): boolean {
  const body = (payload.content ?? '').trim()
  const title = (payload.title ?? '').trim()
  return title.length > 0 || (body.length > 0 && body !== '<p></p>')
}

export function useNewDiscussion(_textEditorRef?: TextEditorRef) {
  const route = useRoute()
  const router = useRouter()
  const sessionUser = useSessionUser()
  const discussions = useDoctype<GPDiscussion>('GP Discussion')

  // The canonical composer route carries the community; the legacy route does not.
  const communityId = computed(() => optionalParam(route.params.communityId))
  const isScoped = computed(() => Boolean(communityId.value))

  const errorMessage = ref<string | null>(null)
  const publishError = ref<string | null>(null)
  const publishing = ref(false)
  const isPublishingSuccessfully = ref(false)
  const isDeletingDraft = ref(false)
  const hasInteracted = ref(false)

  // Bound to the URL so a reload — or a draft opened from the Drafts list — resumes the
  // same row. The composable assigns this (via onCreate) the moment it creates the draft,
  // which is what keeps two new-discussion tabs from sharing one row.
  const draftName = computed(() => (route.query.draft as string) || null)

  const draft = useDraftSync({
    identity: { type: 'Discussion', mode: 'New' },
    draftName,
    canSave: hasMeaningfulContent,
    initialPayload: () => ({
      title: '',
      content: '',
      project: (route.query.spaceId as string) || null,
    }),
    onCreate: (name) => syncDraftToRoute(name),
  })

  const draftData = draft.data
  const isPersisted = computed(() => Boolean(draft.serverName.value))
  const isDraftChanged = computed(() => draft.dirty.value)

  const saveStatus = computed(() => ({
    isSaving: draft.saving.value,
    lastSaved: draft.savedAt.value,
    hasUnsavedChanges: draft.dirty.value,
    error: null,
  }))

  // Drafts are owner-scoped on the server, so the author is always the current user.
  const author = computed(() => useUser(sessionUser.name))

  // Space options and formatting. In scoped mode the picker only offers spaces from the
  // route's community; the legacy route keeps the full grouped list.
  const spaceOptions = useGroupedSpaceOptions({
    filterFn: (space) =>
      !space.archived_at && (!isScoped.value || space.team === communityId.value),
  })

  const formattedSpaceOptions = computed(() => {
    return spaceOptions.value.map((d) => {
      if ('group' in d && 'items' in d) {
        return { group: d.group, options: d.items }
      }
      return d
    })
  })

  const immediateSave = () => draft.flush()

  function syncDraftToRoute(name: string) {
    if (communityId.value) {
      router.replace({
        name: 'NewDiscussion',
        params: { communityId: communityId.value },
        query: { draft: name },
      })
    } else {
      router.replace({ name: 'LegacyNewDiscussion', query: { draft: name } })
    }
  }

  // A draft opened on the legacy route that already belongs to a space is moved onto the
  // canonical scoped route. Drafts with no resolvable community stay on the legacy route.
  function normalizeDraftRoute() {
    if (isScoped.value) return
    const project = draftData.value.project
    if (!project) return
    const targetCommunityId = getSpace(project)?.team
    if (!targetCommunityId) return
    router.replace({
      name: 'NewDiscussion',
      params: { communityId: targetCommunityId },
      query: { draft: draft.serverName.value || draftName.value || undefined },
    })
  }

  // Validation
  const validateDraft = (checkProject = true): boolean => {
    if (!hasInteracted.value) return true // Don't validate until user has interacted

    errorMessage.value = null
    if (!draftData.value.title) {
      errorMessage.value = 'Please enter title.'
      return false
    }
    if (checkProject && !draftData.value.project) {
      errorMessage.value = 'Please select a space.'
      return false
    }
    return true
  }

  // Event handlers
  const handleTitleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement
    draftData.value.title = target.value
    target.style.height = target.scrollHeight + 'px'
    hasInteracted.value = true
  }

  const handleTitleBlur = () => {
    hasInteracted.value = true
    immediateSave()
  }

  const handleSpaceChange = () => {
    hasInteracted.value = true
    immediateSave()
  }

  // Publish: flush the latest content, then turn the draft into a discussion. The draft
  // row is deleted server-side by publish, so we only forget the local copy afterwards.
  async function publish() {
    hasInteracted.value = true
    publishError.value = null
    if (!validateDraft(true)) return

    publishing.value = true
    try {
      await draft.flush()

      let discussionId: string | undefined
      if (draft.serverName.value) {
        isPublishingSuccessfully.value = true
        discussionId = await call(PUBLISH_DRAFT, { name: draft.serverName.value })
      } else {
        // No server row (e.g. the flush failed) — publish directly so nothing is lost.
        isPublishingSuccessfully.value = true
        const doc = await discussions.insert.submit({
          title: draftData.value.title,
          content: draftData.value.content,
          project: draftData.value.project || undefined,
        })
        discussionId = doc?.name
      }

      await draft.forget()

      if (discussionId) {
        const spaceId = draftData.value.project
        const targetCommunityId = communityId.value || (spaceId ? getSpace(spaceId)?.team : null)
        await router.replace({
          name: 'Discussion',
          params: { communityId: targetCommunityId, spaceId, postId: discussionId },
        })
        tags.reload()
      }
    } catch (error: any) {
      publishError.value = error?.message || String(error)
      publishing.value = false
    } finally {
      isPublishingSuccessfully.value = false
    }
  }

  function deleteDraft() {
    dialog.danger({
      title: 'Delete draft',
      message: 'Are you sure you want to delete this draft?',
      confirmLabel: 'Delete draft',
      onConfirm: async () => {
        isDeletingDraft.value = true
        await draft.clear()
        router.back()
      },
    })
  }

  function discard() {
    if (!hasMeaningfulContent(draftData.value)) {
      router.back()
      return
    }
    dialog.danger({
      title: 'Discard post',
      message: 'Are you sure you want to discard your post?',
      confirmLabel: 'Discard post',
      onConfirm: async () => {
        await draft.clear()
        router.back()
      },
    })
  }

  function initialize() {
    onMounted(() => {
      // Move legacy-route drafts onto the canonical scoped route once their space is known.
      watch(() => draft.ready.value, (ready) => ready && normalizeDraftRoute(), { immediate: true })
    })

    // Frictionless leave: drafts auto-save, so navigating away just flushes any pending
    // change instead of prompting. Explicit Delete/Discard still remove the draft.
    onBeforeRouteLeave(async () => {
      if (isDeletingDraft.value || isPublishingSuccessfully.value) return true
      if (draft.dirty.value) {
        try {
          await draft.flush()
        } catch (error) {
          console.error('Failed to save draft before leaving:', error)
        }
      }
      return true
    })
  }

  return {
    // Data
    draftData,
    isPersisted,
    publishError,
    errorMessage,
    sessionUser,
    author,
    formattedSpaceOptions,

    // State
    isDraftChanged,
    publishing,
    isPublishingSuccessfully,
    isDeletingDraft,
    saveStatus,

    // Actions
    publish,
    deleteDraft,
    discard,
    handleTitleInput,
    handleTitleBlur,
    handleSpaceChange,
    immediateSave,

    // Lifecycle
    initialize,
  }
}

function optionalParam(value: string | string[] | undefined): string | undefined {
  const resolved = Array.isArray(value) ? value[0] : value
  return resolved || undefined
}

export type NewDiscussionContext = ReturnType<typeof useNewDiscussion>
export const NewDiscussionKey: InjectionKey<NewDiscussionContext> = Symbol('NewDiscussion')

export function provideNewDiscussion(textEditorRef?: TextEditorRef) {
  const context = useNewDiscussion(textEditorRef)
  provide(NewDiscussionKey, context)
  return context
}

export function useNewDiscussionContext() {
  const context = inject(NewDiscussionKey)
  if (!context) {
    throw new Error('useNewDiscussionContext must be used within a NewDiscussion component')
  }
  return context
}
