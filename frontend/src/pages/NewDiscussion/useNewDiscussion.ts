import { ref, computed, nextTick, onMounted, provide, inject, watch, type InjectionKey } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import { useDoc, useNewDoc, useDoctype, dialog } from 'frappe-ui'
import { debounce } from 'frappe-ui'
import { useGroupedSpaceOptions } from '@/data/groupedSpaces'
import { getSpace } from '@/data/spaces'
import { useSessionUser, useUser } from '@/data/users'
import { tags } from '@/data/tags'
import type { TextEditorRef, DraftDocument, DraftMethods, DraftData } from './types'
import type { GPDraft, GPDiscussion } from '@/types/doctypes'

export function useNewDiscussion(textEditorRef?: TextEditorRef) {
  const currentRoute = useRoute()
  const router = useRouter()
  const sessionUser = useSessionUser()
  const discussions = useDoctype<GPDiscussion>('GP Discussion')
  const draftId = currentRoute.query.draft as string

  // Core reactive state
  const getStorageKey = () => (draftId ? `draft_discussion_${draftId}` : 'new_discussion')

  const draftData = useLocalStorage(
    getStorageKey(),
    {
      title: '',
      content: '',
      project: null as string | null,
    },
    { deep: true },
  )

  const draftDoc = ref<DraftDocument>(null)
  const errorMessage = ref<string | null>(null)
  const publishing = ref(false)
  const isDeletingDraft = ref(false)
  const isPublishingSuccessfully = ref(false)
  const hasInteracted = ref(false)
  const persistedDraftData = ref<DraftData | null>(null)
  const isApplyingPersistedDraft = ref(false)

  // Computed values
  const isDraftChanged = computed(() => {
    const currentTitle = draftData.value.title
    const currentContent = draftData.value.content
    const currentProject = draftData.value.project

    if (persistedDraftData.value) {
      return (
        currentTitle !== persistedDraftData.value.title ||
        currentContent !== persistedDraftData.value.content ||
        currentProject !== persistedDraftData.value.project
      )
    } else {
      return !!(currentTitle || currentContent || currentProject)
    }
  })

  // Auto-save functionality
  const savingDraft = ref(false)

  const canAutoSave = computed(() => {
    return !savingDraft.value && (draftData.value.title.trim().length > 0 || hasBodyContent())
  })

  function hasBodyContent() {
    return !!draftData.value.content && draftData.value.content !== '<p></p>'
  }

  async function _updateDraft() {
    if (!draftDoc.value) return
    const doc = (await draftDoc.value.setValue.submit({
      title: draftData.value.title,
      content: draftData.value.content,
      project: draftData.value.project || undefined,
    })) as GPDraft | null
    persistedDraftData.value = doc ? getDraftData(doc) : getCurrentDraftData()
  }

  async function _createDraft() {
    const draft = useNewDoc<GPDraft>('GP Draft', {
      title: draftData.value.title,
      content: draftData.value.content,
      project: draftData.value.project || undefined,
      type: 'Discussion',
    })

    const doc = await draft.submit()
    persistedDraftData.value = getDraftData(doc)

    if (currentRoute.params.communityId) {
      router.replace({
        name: 'NewDiscussion',
        params: { communityId: currentRoute.params.communityId },
        query: { draft: doc.name },
      })
    } else {
      router.replace({ name: 'LegacyNewDiscussion', query: { draft: doc.name } })
    }
    fetchDraftDoc(doc.name)
  }

  async function performAutoSave() {
    if (!canAutoSave.value) return

    savingDraft.value = true
    try {
      if (draftDoc.value) {
        await _updateDraft()
      } else {
        await _createDraft()
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      savingDraft.value = false
    }
  }

  const debouncedAutoSave = debounce(performAutoSave, 300)
  const immediateSave = performAutoSave

  // Watch for changes and auto-save
  watch(
    () => [draftData.value.title, draftData.value.content, draftData.value.project],
    () => {
      if (!isApplyingPersistedDraft.value && canAutoSave.value) {
        debouncedAutoSave()
      }
    },
    { flush: 'post' },
  )

  const saveStatus = computed(() => ({
    isSaving: savingDraft.value,
    lastSaved: null,
    hasUnsavedChanges: isDraftChanged.value,
    error: null,
  }))

  // Space options and formatting
  const spaceOptions = useGroupedSpaceOptions({ filterFn: (space) => !space.archived_at })

  const formattedSpaceOptions = computed(() => {
    return spaceOptions.value.map((d) => {
      if ('group' in d && 'items' in d) {
        return { group: d.group, options: d.items }
      }
      return d
    })
  })

  const author = computed(() => {
    return useUser(draftDoc.value ? draftDoc.value.doc?.owner : sessionUser.name)
  })

  // Core functions
  function fetchDraftDoc(draftId: string) {
    draftDoc.value = useDoc<GPDraft, DraftMethods>({
      doctype: 'GP Draft',
      name: draftId,
      methods: {
        publish: 'publish',
      },
    })
    return draftDoc.value.onSuccess((doc) => updateLocalDraft(doc))
  }

  function getDraftData(doc: GPDraft): DraftData {
    return {
      title: doc.title || '',
      content: doc.content || '',
      project: doc.project ? doc.project.toString() : null,
    }
  }

  function getCurrentDraftData(): DraftData {
    return {
      title: draftData.value.title,
      content: draftData.value.content,
      project: draftData.value.project,
    }
  }

  function updateLocalDraft(doc = draftDoc.value?.doc) {
    if (!doc) return
    const data = getDraftData(doc)
    isApplyingPersistedDraft.value = true
    persistedDraftData.value = data
    draftData.value = { ...data }
    nextTick(() => {
      isApplyingPersistedDraft.value = false
    })
  }

  function resetValues() {
    draftData.value.project = null
    draftData.value.title = ''
    draftData.value.content = ''
    persistedDraftData.value = null
    localStorage.removeItem(getStorageKey())
  }

  function initializeFromRoute() {
    if (!draftId) {
      draftData.value.title = ''
      draftData.value.content = ''
      draftData.value.project = (currentRoute.query.spaceId as string) || null
    }
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

  // Publish functionality
  function publish() {
    hasInteracted.value = true
    if (!validateDraft(true)) {
      return
    }
    publishing.value = true

    const projectValue = draftData.value.project || undefined

    if (draftDoc.value) {
      return draftDoc.value.setValue
        .submit({
          title: draftData.value.title,
          content: draftData.value.content,
          project: projectValue,
        })
        .then(() => {
          isPublishingSuccessfully.value = true
          return draftDoc.value?.publish.submit()
        })
        .then((discussionId: any) => {
          if (discussionId) {
            const spaceId = draftData.value.project
            const communityId =
              currentRoute.params.communityId || (spaceId ? getSpace(spaceId)?.team : null)

            resetValues()
            router
              .replace({
                name: 'Discussion',
                params: {
                  communityId,
                  spaceId: spaceId,
                  postId: discussionId,
                },
              })
              .finally(() => {
                isPublishingSuccessfully.value = false
              })
            tags.reload()
          }
        })
        .catch(() => {
          publishing.value = false
        })
    }

    return discussions.insert
      .submit({
        title: draftData.value.title,
        content: draftData.value.content,
        project: projectValue,
      })
      .then((doc) => {
        if (doc) {
          const communityId = currentRoute.params.communityId || getSpace(doc.project)?.team

          isPublishingSuccessfully.value = true
          resetValues()
          router
            .replace({
              name: 'Discussion',
              params: {
                communityId,
                spaceId: doc.project,
                postId: doc.name,
              },
            })
            .finally(() => {
              isPublishingSuccessfully.value = false
            })
        }
      })
      .catch(() => {
        publishing.value = false
      })
  }

  function deleteDraft() {
    dialog.danger({
      title: 'Delete draft',
      message: 'Are you sure you want to delete this draft?',
      confirmLabel: 'Delete draft',
      onConfirm: async () => {
        await draftDoc.value?.delete.submit()
        resetValues()
        isDeletingDraft.value = true
        router.back()
      },
    })
  }

  function discard() {
    if (!textEditorRef?.value?.editor?.isEmpty || draftData.value.title) {
      dialog.danger({
        title: 'Discard post',
        message: 'Are you sure you want to discard your post?',
        confirmLabel: 'Discard post',
        onConfirm: () => {
          resetValues()
          router.back()
        },
      })
    } else {
      router.back()
    }
  }

  // Editor setup
  const setupEditorListeners = (editorRef: TextEditorRef) => {
    setTimeout(() => {
      const editor = editorRef.value?.editor
      if (editor) {
        editor.on('update', () => {
          // Trigger auto-save when editor content changes
          debouncedAutoSave()
        })
      }
    }, 100)
  }

  // Lifecycle management
  function initialize() {
    // Initialize draft document if we have a draft ID
    if (draftId) {
      fetchDraftDoc(draftId)
    } else {
      initializeFromRoute()
    }

    onMounted(() => {
      if (textEditorRef) {
        setupEditorListeners(textEditorRef)
      }
    })

    // Navigation guard
    onBeforeRouteLeave((_, __, next) => {
      if (isDeletingDraft.value || isPublishingSuccessfully.value || publishing.value) {
        next()
        return
      }
      if (isDraftChanged.value) {
        // Save Draft → onConfirm; Discard / Escape / outside-click → onCancel.
        dialog.confirm({
          title: 'Unsaved Changes',
          message: 'You have unsaved changes. Do you want to save them before leaving?',
          confirmLabel: 'Save Draft',
          cancelLabel: 'Discard',
          onConfirm: async () => {
            try {
              await immediateSave()
            } catch (e) {
              console.error('Failed to save draft before leaving:', e)
            }
            next()
          },
          onCancel: () => {
            resetValues()
            next()
          },
        })
      } else {
        next()
      }
    })
  }

  return {
    // Data
    draftData,
    draftDoc,
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
