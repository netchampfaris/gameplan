<template>
  <div class="flex flex-col">
    <div
      v-if="comments.data == null"
      class="flex animate-pulse items-start space-x-3 px-2 py-4 text-base"
    >
      <div class="h-8 w-8 rounded-full bg-surface-gray-3"></div>
      <div>
        <div class="flex h-8 flex-col justify-center">
          <div class="h-2 w-40 bg-surface-gray-3"></div>
        </div>
        <div class="flex flex-col gap-2">
          <div v-for="i in 4">
            <div
              class="h-2 bg-surface-gray-3"
              :style="{ width: `${Math.max(Math.random() * 800, 600)}px` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
    <div class="comments-timeline" :style="{ paddingBottom: `${addCommentHeight + 80}px` }">
      <template v-for="(item, i) in timelineItems" :key="item.doctype + item.name">
        <div
          v-if="newMessagesFrom && newMessagesFrom == item.name"
          class="relative mb-4 mt-15"
          role="separator"
        >
          <div class="border-b border-blue-600"></div>
          <span
            class="absolute -top-2 left-1/2 -translate-x-1/2 bg-surface-base px-2 text-sm-medium text-ink-blue-8"
          >
            New comments
          </span>
        </div>
        <Comment
          v-if="item.doctype == 'GP Comment'"
          :ref="($comment) => setItemRef($comment, item)"
          :comment="item"
          :highlight="
            highlightedItem?.doctype == item.doctype && highlightedItem?.name == item.name
          "
          :readOnlyMode="readOnlyMode"
          :comments="comments"
        />
        <Activity
          :class="[
            {
              'pt-3': timelineItems[i - 1]?.doctype == 'GP Activity',
              'pt-15': timelineItems[i - 1]?.doctype != 'GP Activity',
            },
          ]"
          v-else-if="item.doctype == 'GP Activity'"
          :activity="item"
        />
        <Poll
          v-else-if="item.doctype == 'GP Poll'"
          :ref="($poll) => setItemRef($poll, item)"
          :highlight="
            highlightedItem?.doctype == item.doctype && highlightedItem?.name == item.name
          "
          :poll="item"
          :readOnlyMode="readOnlyMode"
        />
      </template>
    </div>

    <div
      v-if="!readOnlyMode && !disableNewComment && !hideNewComment"
      class="pointer-events-none fixed left-0 right-0 z-[2] mt-2 w-full print:hidden"
      :class="[
        showCommentBox && !composerMinimized
          ? 'bottom-0'
          : 'bottom-12 sm:bottom-0 standalone:bottom-16 standalone:sm:bottom-0',
      ]"
      ref="addComment"
    >
      <div class="pointer-events-auto sm:ml-60">
        <div class="discussion-container bg-surface-base px-2 py-2 sm:bg-transparent sm:py-3">
          <div v-if="!showCommentBox">
            <button
              type="button"
              class="flex w-full items-center rounded-lg border bg-surface-base px-2 py-2 text-left text-base text-ink-gray-5 shadow-sm hover:border-outline-gray-3 hover:bg-surface-gray-1"
              @click="openCommentBox"
            >
              <UserAvatar class="mr-3" :user="$user().name" size="sm" />
              Add a comment
            </button>
          </div>
          <button
            v-else-if="composerMinimized"
            type="button"
            class="flex w-full items-center rounded-lg border bg-surface-base px-2 py-2 text-left shadow-sm hover:border-outline-gray-3 hover:bg-surface-gray-1"
            @click="restoreComposer"
          >
            <UserAvatar class="mr-3" :user="$user().name" size="sm" />
            <span class="min-w-0 flex-1 truncate text-base text-ink-gray-6">
              {{ minimizedLabel }}
            </span>
            <span class="lucide-chevron-up ml-2 size-4 shrink-0 text-ink-gray-5" />
          </button>
          <div
            v-else
            class="w-full rounded-lg border bg-surface-base p-3 shadow-sm focus-within:border-outline-gray-3 sm:p-4"
            @keydown.ctrl.enter.capture.stop="submitComment"
            @keydown.meta.enter.capture.stop="submitComment"
          >
            <div class="mb-3 flex items-center gap-2">
              <UserAvatar :user="$user().name" size="md" />
              <span class="min-w-0 flex-1 truncate text-base-medium text-ink-gray-8">
                {{ $user().full_name }}
              </span>
              <TabButtons
                :buttons="[{ label: 'Comment' }, { label: 'Poll' }]"
                v-model="newCommentType"
              />
              <Tooltip text="Minimize">
                <Button
                  variant="ghost"
                  icon="lucide-chevron-down"
                  aria-label="Minimize comment box"
                  @click="minimizeComposer"
                />
              </Tooltip>
            </div>
            <CommentEditor
              ref="newCommentEditor"
              v-if="newCommentType == 'Comment'"
              :key="commentEditorKey"
              :value="draftData.content"
              @change="onNewCommentChange"
              :submitButtonProps="{
                variant: 'solid',
                onClick: submitComment,
                loading: comments.insert.loading,
                disabled: commentEmpty,
              }"
              :discardButtonProps="{
                onClick: discardComment,
              }"
              :editable="true"
              max-height="38vh"
              placeholder="Add a comment..."
            />
            <PollEditor
              v-show="newCommentType == 'Poll'"
              v-model:poll="newPoll"
              :submitButtonProps="{
                onClick: submitPoll,
                loading: polls.insert.loading,
              }"
              :discardButtonProps="{
                onClick: discardPoll,
              }"
            />
            <ErrorMessage :message="polls.insert.error" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  watch,
  watchEffect,
  useTemplateRef,
} from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useList, TabButtons, ErrorMessage, Button, Tooltip } from 'frappe-ui'
import CommentEditor from '@/components/editor/CommentEditor.vue'
import Comment from './Comment.vue'
import Activity from './Activity.vue'
import PollEditor from './PollEditor.vue'
import Poll from './Poll.vue'
import UserAvatar from './UserAvatar.vue'
import { getScrollContainer } from '@/utils/scrollContainer'
import { dialog } from 'frappe-ui'
import { useSocket } from '@/socket'
import { GPActivity, GPComment, GPPoll } from '@/types/doctypes'
import type { Editor } from '@tiptap/vue-3'
import { tags } from '@/data/tags'
import { isNewCommentOpen } from '@/data/newComment'
import { useRichQuotes } from '@/components/RichQuoteExtension/useRichQuotes'
import { useDraftSync } from '@/data/useDraftSync'
import { useSessionUser } from '@/data/users'

interface Props {
  doctype: string
  name: string
  newCommentsFrom?: string
  readOnlyMode?: boolean
  disableNewComment?: boolean
  // transient: hide the fixed comment bar while the post itself is being edited
  hideNewComment?: boolean
}

interface NewPoll {
  title: string
  anonymous: boolean
  multiple_answers: boolean
  options: Array<{
    title: string
    idx: number
  }>
}

interface ComposerUiState {
  open?: boolean
  minimized?: boolean
  type?: 'Comment' | 'Poll'
  poll?: NewPoll
}

const props = withDefaults(defineProps<Props>(), {
  readOnlyMode: false,
  disableNewComment: false,
  hideNewComment: false,
})

const router = useRouter()
const route = useRoute()
const socket = useSocket()
const sessionUser = useSessionUser()

const showCommentBox = ref(false)
const composerMinimized = ref(false)
const composerStateLoaded = ref(false)
const newCommentType = ref<'Comment' | 'Poll'>('Comment')

// The new-comment composer is an auto-saved draft, keyed to this discussion so it
// survives reloads and restores across tabs. One draft per (user, discussion).
const draft = useDraftSync({
  identity: () => ({
    type: 'Comment',
    mode: 'New',
    referenceDoctype: props.doctype,
    referenceName: props.name,
  }),
  initialPayload: () => ({ content: '' }),
})
const draftData = draft.data
const newPoll = ref({
  title: '',
  multiple_answers: false,
  anonymous: false,
  options: [
    { title: '', idx: 1 },
    { title: '', idx: 2 },
  ],
})
const newMessagesFrom = ref(props.newCommentsFrom)
const highlightedItem = ref<{ doctype: string; name: string } | null>(null)
const addCommentHeight = ref(0)
const newCommentEditor = useTemplateRef('newCommentEditor')
const addComment = useTemplateRef('addComment')
let mutationObserver: MutationObserver | undefined
let resizeObserver: ResizeObserver | undefined
const commentEditorKey = ref(0)

const richQuotes = useRichQuotes()

const composerStorageKey = computed(() => {
  return ['gameplan', 'comment-composer', sessionUser.name, props.doctype, props.name].join(':')
})

const comments = useList<GPComment>({
  doctype: 'GP Comment',
  cacheKey: ['Comments', props.doctype, props.name],
  fields: [
    'name',
    'content',
    'owner',
    'creation',
    'modified',
    'edited_at',
    'deleted_at',
    { reactions: ['name', 'user', 'emoji'] },
  ],
  transform(data) {
    return data.map((d) => ({ ...d, doctype: 'GP Comment' }))
  },
  filters: {
    reference_doctype: props.doctype,
    reference_name: props.name,
  },
  orderBy: 'creation asc',
  limit: 99999,
  onSuccess() {
    if (route.query.comment) {
      if (route.query.comment === 'first_post') {
        router.replace({ query: {} })
        return
      }
      const comment = comments.data?.find((c) => c.name === route.query.comment)
      scrollToItem(comment)
    } else if (!route.query.fromSearch && comments.data?.length > 0) {
      scrollToEnd()
    }
  },
})

const activities = useList<GPActivity>({
  doctype: 'GP Activity',
  fields: ['name', 'user', 'action', 'data', 'creation'],
  filters: {
    reference_doctype: props.doctype,
    reference_name: props.name,
  },
  orderBy: 'creation asc',
  limit: 99999,
  transform(activities) {
    return activities.map((activity) => ({
      ...activity,
      doctype: 'GP Activity',
      data: activity.data ? JSON.parse(activity.data as string) : null,
    }))
  },
})

const polls = useList<GPPoll>({
  doctype: 'GP Poll',
  fields: [
    'name',
    'title',
    'anonymous',
    'multiple_answers',
    'creation',
    'owner',
    'stopped_at',
    { options: ['name', 'title', 'idx', 'percentage'] },
    { votes: ['user', 'option'] },
    { reactions: ['name', 'user', 'emoji'] },
  ],
  filters: {
    discussion: props.name,
  },
  orderBy: 'creation asc',
  limit: 99999,
  transform(data) {
    return data.map((d) => ({ ...d, doctype: 'GP Poll' }))
  },
  onSuccess() {
    if (route.query.poll) {
      const poll = polls.data?.find((p) => p.name === route.query.poll)
      scrollToItem(poll)
    }
  },
})

watchEffect(() => {
  if (richQuotes) {
    richQuotes.commentsData.value = comments.data ?? null
  }
})

// Computed
const timelineItems = computed(() => {
  let items: Array<GPComment | GPActivity | GPPoll> = []
  if (comments.data?.length) {
    items = items.concat(comments.data)
  }
  if (activities.data?.length) {
    items = items.concat(activities.data)
  }
  if (polls.data?.length) {
    items = items.concat(polls.data)
  }
  return items.sort((a, b) => new Date(a.creation).valueOf() - new Date(b.creation).valueOf())
})

const commentEmpty = computed(() => {
  return !draftData.value.content || draftData.value.content === '<p></p>'
})

const editorObject = computed<Editor | null>(() => {
  return newCommentEditor.value?.editor || null
})

const minimizedLabel = computed(() => {
  if (newCommentType.value === 'Poll') return newPoll.value.title || 'Poll in progress'
  return commentEmpty.value ? 'Add a comment' : 'Comment in progress'
})

defineExpose({
  editorObject,
  openCommentBox,
  scrollToCommentById,
  getCommentContentElement,
  highlightComment,
})

function openCommentBox() {
  showCommentBox.value = true
  composerMinimized.value = false
  newCommentType.value = 'Comment'
}

function minimizeComposer() {
  composerMinimized.value = true
}

function restoreComposer() {
  composerMinimized.value = false
  nextTick(() => {
    editorObject.value?.commands.focus()
  })
}

function getCommentContentElement(id) {
  const comment = timelineItems.value?.find((c) => c.name === id)
  if (comment?.$el) {
    return comment.$el
  }
}

function highlightComment(id: string) {
  const comment = timelineItems.value?.find((c) => c.doctype == 'GP Comment' && c.name === id)
  if (comment) {
    highlightedItem.value = {
      doctype: comment.doctype,
      name: comment.name,
    }
    setTimeout(() => {
      highlightedItem.value = null
    }, 10000)
  }
}

function resetCommentState() {
  showCommentBox.value = false
  composerMinimized.value = false
  commentEditorKey.value++
  newCommentType.value = 'Comment'
  newPoll.value = {
    title: '',
    multiple_answers: false,
    anonymous: false,
    options: [
      { title: '', idx: 1 },
      { title: '', idx: 2 },
    ],
  }
  highlightedItem.value = null
  isNewCommentOpen.value = false
}

async function submitComment() {
  if (commentEmpty.value) return

  comments.insert
    .submit({
      reference_doctype: props.doctype,
      reference_name: props.name,
      content: draftData.value.content,
    })
    .then(async () => {
      await draft.commit()
      resetCommentState()
      tags.reload()
    })
}

async function scrollToEnd() {
  await wait(50)
  _scrollToEnd()
  await wait(100)
  const scrollContainer = getScrollContainer()
  if (scrollContainer.scrollTop < scrollContainer.scrollHeight) {
    _scrollToEnd()
  }
}

function _scrollToEnd() {
  const scrollContainer = getScrollContainer()
  scrollContainer.scrollTop = scrollContainer.scrollHeight
}

function scrollToCommentById(id: string) {
  const item = timelineItems.value.find((item) => item.name === id)
  if (item) {
    scrollToItem(item)
  }
}

async function scrollToItem(item: any) {
  if (!item) return
  await nextTick()
  if (item.$el) {
    scrollToElement(item.$el)
    highlightedItem.value = {
      doctype: item.doctype,
      name: item.name,
    }
  }
  setTimeout(() => {
    highlightedItem.value = null
    router.replace({ query: {} })
  }, 10000)
}

async function scrollToElement($el: HTMLElement) {
  await wait(50)
  let top = _scrollToElement($el)
  await wait(100)
  const scrollContainer = getScrollContainer()
  if (scrollContainer.scrollTop != top) {
    _scrollToElement($el)
  }
}

function _scrollToElement($el: HTMLElement) {
  const scrollContainer = getScrollContainer()
  const headerHeight = 64
  const top = $el.offsetTop - scrollContainer.scrollTop - headerHeight
  scrollContainer.scrollBy({ top, left: 0 })
  return top
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function submitPoll() {
  if (props.doctype !== 'GP Discussion') return
  return polls.insert
    .submit({
      discussion: props.name,
      title: newPoll.value.title,
      anonymous: newPoll.value.anonymous ? 1 : 0,
      multiple_answers: newPoll.value.multiple_answers ? 1 : 0,
      options: newPoll.value.options,
    })
    .then(() => {
      resetCommentState()
    })
}

function discardPoll() {
  resetCommentState()
}

function setItemRef($component: any, item: any) {
  if ($component?.$el) {
    item.$el = $component.$el
  }
}

function onNewCommentChange(content: string) {
  draftData.value.content = content
}

async function discardComment() {
  if (!editorObject.value?.isEmpty) {
    dialog.danger({
      title: 'Discard comment',
      message: 'Are you sure you want to discard your comment?',
      confirmLabel: 'Discard comment',
      cancelLabel: 'Keep comment',
      onConfirm: async () => {
        await draft.clear()
        resetCommentState()
      },
    })
  } else {
    await draft.clear()
    resetCommentState()
  }
}

watch(showCommentBox, (val) => {
  updateGlobalCommentState()
  if (val && !composerMinimized.value) {
    nextTick(() => {
      editorObject.value?.commands.focus()
      scrollToEnd()
    })
  }
})

watch(composerMinimized, (minimized) => {
  updateGlobalCommentState()
  if (!minimized && showCommentBox.value) {
    nextTick(() => {
      editorObject.value?.commands.focus()
    })
  }
})

watch(
  [showCommentBox, composerMinimized, newCommentType, newPoll],
  () => {
    saveComposerState()
  },
  { deep: true },
)

watch(
  composerStorageKey,
  () => {
    loadComposerState()
  },
  { immediate: true },
)

// Reopen the composer if a saved draft is restored for this discussion.
watch(
  () => draft.ready.value,
  (ready) => {
    if (ready && draft.restored.value) showCommentBox.value = true
  },
  { immediate: true },
)

onMounted(() => {
  // Announce this area's reply box (quote insert target) and its comments (scroll
  // targets) to the rich-quote controller, instead of being reached into.
  richQuotes?.setReplyTarget({
    open: openCommentBox,
    getEditor: () => editorObject.value,
  })
  richQuotes?.setCommentNavigator({
    getCommentEl: getCommentContentElement,
    scrollToComment: scrollToCommentById,
    highlightComment,
  })
  socket.on('new_activity', (data) => {
    if (data.reference_doctype === props.doctype && data.reference_name === props.name) {
      activities.reload()
    }
  })
  setupComposerMeasurement()
})

onUnmounted(() => {
  richQuotes?.setReplyTarget(null)
  richQuotes?.setCommentNavigator(null)
  socket.off('new_activity')
  mutationObserver?.disconnect()
  resizeObserver?.disconnect()
  isNewCommentOpen.value = false
})

function setupComposerMeasurement() {
  const $el = addComment.value
  if (!$el) return

  updateComposerHeight()

  mutationObserver = new MutationObserver(updateComposerHeight)
  mutationObserver.observe($el, { childList: true, subtree: true })

  resizeObserver = new ResizeObserver(updateComposerHeight)
  resizeObserver.observe($el)
}

function updateComposerHeight() {
  addCommentHeight.value = addComment.value?.clientHeight ?? 0
}

function updateGlobalCommentState() {
  isNewCommentOpen.value = showCommentBox.value && !composerMinimized.value
}

function loadComposerState() {
  composerStateLoaded.value = false
  const state = readComposerState()
  showCommentBox.value = Boolean(state.open)
  composerMinimized.value = Boolean(state.minimized)
  newCommentType.value = state.type ?? 'Comment'
  newPoll.value = normalizePoll(state.poll)
  composerStateLoaded.value = true
  updateGlobalCommentState()
}

function saveComposerState() {
  if (!composerStateLoaded.value) return
  localStorage.setItem(
    composerStorageKey.value,
    JSON.stringify({
      open: showCommentBox.value,
      minimized: composerMinimized.value,
      type: newCommentType.value,
      poll: newPoll.value,
    } satisfies ComposerUiState),
  )
}

function readComposerState(): ComposerUiState {
  try {
    return JSON.parse(localStorage.getItem(composerStorageKey.value) || '{}')
  } catch {
    return {}
  }
}

function normalizePoll(poll?: ComposerUiState['poll']): NewPoll {
  return {
    title: poll?.title ?? '',
    multiple_answers: Boolean(poll?.multiple_answers),
    anonymous: Boolean(poll?.anonymous),
    options: poll?.options?.length
      ? poll.options.map((option, index) => ({
          title: option.title ?? '',
          idx: option.idx || index + 1,
        }))
      : [
          { title: '', idx: 1 },
          { title: '', idx: 2 },
        ],
  }
}
</script>
