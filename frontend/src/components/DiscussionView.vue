<template>
  <div class="relative flex h-full flex-col" v-if="postId">
    <div class="discussion-container">
      <div v-if="discussion.loading">
        <div class="pb-2 pt-14 flex w-full items-center sticky top-0 z-[1] bg-surface-base">
          <Avatar size="lg" label="A" class="mr-3 animate-pulse shrink-0">
            <div></div>
          </Avatar>
          <div class="flex flex-col md:block">
            <div class="text-base-medium bg-surface-gray-2 animate-pulse w-20 h-4"></div>
          </div>
          <div class="ml-auto flex space-x-2">
            <Button>
              <template #icon>
                <div class="animate-pulse w-20 h-8"></div>
              </template>
            </Button>
          </div>
        </div>
        <div class="flex items-start justify-between space-x-1">
          <h1 class="flex items-center text-4xl-semibold animate-pulse">
            <span class="bg-surface-gray-3 h-5.5 w-32"> </span>
            <span class="bg-surface-gray-3 h-5.5 w-20 ml-2"> </span>
            <span class="bg-surface-gray-3 h-5.5 w-40 ml-2"> </span>
          </h1>
        </div>
      </div>
      <template v-else-if="discussion.doc">
        <div
          :class="{
            'rounded-lg border mt-14 py-4 px-3 sm:px-5 -mx-3 sm:-mx-5 focus-within:border-outline-gray-3':
              editingPost,
          }"
          @keydown.ctrl.enter.capture.stop="updatePost"
          @keydown.meta.enter.capture.stop="updatePost"
          @keydown.esc="cancelEdit"
        >
          <div
            class="pb-2 flex w-full items-center bg-surface-base"
            :class="{ 'sticky top-0 z-[1] pt-14': !editingPost }"
          >
            <UserProfileLink class="mr-3" :user="discussion.doc.owner">
              <UserAvatarWithHover size="lg" :user="discussion.doc.owner" />
            </UserProfileLink>
            <div class="flex flex-col md:block">
              <UserProfileLink
                class="text-base-medium text-ink-gray-8 hover:text-ink-blue-8"
                :user="discussion.doc.owner"
              >
                {{ $user(discussion.doc.owner).full_name }}
                <span class="hidden md:inline text-ink-gray-7">&nbsp;&middot;&nbsp;</span>
              </UserProfileLink>
              <Tooltip :text="dayjsLocal(discussion.doc.creation).format('D MMM YYYY [at] h:mm A')">
                <time class="text-base text-ink-gray-5" :datetime="discussion.doc.creation">
                  {{ dayjsLocal(discussion.doc.creation).fromNow() }}
                </time>
              </Tooltip>
            </div>
            <div class="ml-auto flex space-x-2 print:hidden">
              <Dropdown
                v-if="!readOnlyMode"
                class="ml-auto"
                align="end"
                :button="{
                  icon: 'lucide-more-horizontal',
                  variant: 'ghost',
                  label: 'Discussion Options',
                }"
                :options="actions"
              />
            </div>
          </div>
          <div :class="{ 'pb-4 mt-1': !editingPost }">
            <div class="flex items-start justify-between space-x-1">
              <h1 v-if="!editingPost" class="flex items-center text-4xl-semibold">
                <Tooltip v-if="discussion.doc.closed_at" text="This discussion is closed">
                  <span class="lucide-lock mr-2 h-4 w-4 text-ink-gray-6" />
                </Tooltip>
                <span class="text-ink-gray-8">
                  {{ discussion.doc.title }}
                </span>
              </h1>
            </div>
            <div class="mt-2 flex items-center text-base" v-show="!editingPost">
              <span class="text-ink-gray-5">
                {{
                  discussion.doc.participants_count == 1
                    ? `1 participant`
                    : `${discussion.doc.participants_count} participants`
                }}
              </span>
              <template v-if="discussion.doc.views > 1">
                <span class="px-1.5 text-ink-gray-7">&middot;</span>
                <span class="text-ink-gray-5"> {{ discussion.doc.views }} views </span>
              </template>
            </div>
          </div>
          <div ref="mainPostContentEl">
            <div v-if="editingPost" class="w-full">
              <div class="mb-2">
                <input
                  v-if="editingPost"
                  type="text"
                  class="w-full rounded border-0 text-ink-gray-8 px-0 py-0.5 text-4xl-semibold focus:ring-0"
                  ref="title"
                  v-model="discussion.doc.title"
                  placeholder="Title"
                />
              </div>
            </div>
            <DiscussionViewEditor
              ref="postEditor"
              :content="discussion.doc.content"
              :editable="editingPost"
              :saving="discussion.setValue.loading"
              :can-save="canSavePost"
              :quote-source-id="`discussion:${discussion.doc.name}`"
              :author="discussion.doc.owner"
              @change="discussion.doc.content = $event"
              @save="updatePost"
              @discard="cancelEdit"
            />
          </div>
          <div class="mt-3" v-show="!editingPost">
            <Reactions
              doctype="GP Discussion"
              :name="discussion.doc.name"
              v-model:reactions="discussion.doc.reactions"
              :read-only-mode="readOnlyMode"
            />
          </div>
        </div>
        <CommentsArea
          doctype="GP Discussion"
          :name="discussion.doc.name"
          :newCommentsFrom="discussion.doc.last_unread_comment?.toString()"
          :read-only-mode="readOnlyMode"
          :disable-new-comment="Boolean(discussion.doc.closed_at)"
          :hide-new-comment="editingPost"
          ref="commentsArea"
        />
        <QuoteBacklinksPopover :store="richQuotes" @select="scrollToQuotingComment" />
        <Dialog
          title="Move discussion to another space"
          @close="
            () => {
              discussionMoveDialog.project = null
            }
          "
          v-model:open="discussionMoveDialog.show"
        >
          <Combobox
            :options="spaceOptions"
            v-model="discussionMoveDialog.project"
            placeholder="Select a project"
            class="w-full"
            autofocus
            open-on-click
          />
          <ErrorMessage class="mt-2" :message="discussion.moveToProject.error" />
          <template #actions>
            <Button
              class="w-full"
              variant="solid"
              :loading="discussion.moveToProject.loading"
              @click="moveToSpace"
            >
              {{
                discussionMoveDialog.project
                  ? `Move to ${useSpace(discussionMoveDialog.project).value?.title}`
                  : 'Move'
              }}
            </Button>
          </template>
        </Dialog>
        <Dialog
          title="Pin discussion"
          @close="
            () => {
              pinDialog.show = false
              pinDialog.pinToCategory = false
            }
          "
          v-model:open="pinDialog.show"
        >
          <p class="text-p-base text-ink-gray-6 mb-3">
            When a discussion is pinned, it shows up on top of the discussion list.
          </p>

          <div class="space-y-2">
            <label class="flex items-center justify-between">
              <div>
                <div class="text-base-medium text-ink-gray-9 mb-1">Pin to Community</div>
                <div class="text-sm text-ink-gray-5" v-if="pinDialog.pinToCategory">
                  Show in all {{ communityTitle }} discussions
                </div>
                <div class="text-sm text-ink-gray-5" v-else>Show in {{ space?.title }} only</div>
              </div>
              <Switch size="sm" v-model="pinDialog.pinToCategory" />
            </label>
          </div>
          <template #actions>
            <div class="flex">
              <Button
                class="ml-auto"
                variant="solid"
                :loading="discussion.pinDiscussion.loading"
                @click="
                  () => {
                    discussion.pinDiscussion
                      .submit({ pin_scope: pinDialog.pinToCategory ? 'Category' : 'Space' })
                      .then(() => {
                        pinDialog.show = false
                        pinDialog.pinToCategory = false
                      })
                  }
                "
              >
                Pin Discussion
              </Button>
            </div>
          </template>
        </Dialog>
        <RevisionsDialog
          v-model="showRevisionsDialog"
          doctype="GP Discussion"
          :name="discussion.doc.name"
          fieldname="content"
        />
      </template>
    </div>
    <div
      v-if="!isMobile && !editingPost"
      class="fixed bottom-3 h-9 grid place-content-center right-3 z-[2] print:hidden"
    >
      <Button variant="ghost" v-show="isScrolled" @click="scrollToTop">
        <template #prefix>
          <span class="lucide-arrow-up h-5 w-5 text-ink-gray-6" />
        </template>
        Scroll to top
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, reactive, useTemplateRef } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Combobox,
  Avatar,
  Dropdown,
  Dialog,
  Tooltip,
  usePageMeta,
  dayjsLocal,
  Switch,
  dialog,
} from 'frappe-ui'
import { until } from '@vueuse/core'
import type { Editor } from '@tiptap/vue-3'
import Reactions from './Reactions.vue'
import UserAvatarWithHover from './UserAvatarWithHover.vue'
import CommentsArea from '@/components/CommentsArea.vue'
import DiscussionViewEditor from './editor/DiscussionViewEditor.vue'
import UserProfileLink from './UserProfileLink.vue'
import RevisionsDialog from './RevisionsDialog.vue'
import { copyToClipboard } from '@/utils'
import { getSpace, useSpace } from '@/data/spaces'
import { useCommunity } from '@/data/communities'
import { useGroupedSpaceOptions } from '@/data/groupedSpaces'
import { useDiscussion } from '@/data/discussions'
import { tags } from '@/data/tags'
import { useScrollPosition } from '@/utils/scrollContainer'
import { isMobile } from '@/composables/isMobile'
import { provideRichQuotes } from '@/components/RichQuoteExtension/useRichQuotes'
import QuoteBacklinksPopover from '@/components/RichQuoteExtension/QuoteBacklinksPopover.vue'
import { refreshUnreadCountForProjects } from '@/data/unreadCount'
import { isSessionUser } from '@/data/session'

const props = defineProps<{
  postId: string
  readOnlyMode?: boolean
}>()

const router = useRouter()
const route = useRoute()
const commentsArea = useTemplateRef('commentsArea')
const postEditor = useTemplateRef<{ editor: Editor | null }>('postEditor')
const mainPostContentEl = ref<HTMLElement | null>(null)

const { isScrolled, scrollToTop } = useScrollPosition()

const richQuotes = provideRichQuotes()
richQuotes.setPostContentEl(() => mainPostContentEl.value)

function scrollToQuotingComment(commentId: string) {
  commentsArea.value?.scrollToCommentById(commentId)
}

const editingPost = ref(false)
// snapshot of title/content captured when edit mode opens, so we can detect
// unsaved changes and confirm before discarding them
const editSnapshot = ref<{ title: string; content: string } | null>(null)
const discussionMoveDialog = reactive<{
  show: boolean
  project: string | null
}>({
  show: false,
  project: null,
})
const pinDialog = reactive<{
  show: boolean
  pinToCategory: boolean
}>({
  show: false,
  pinToCategory: false,
})
const showRevisionsDialog = ref(false)

const discussion = useDiscussion(() => props.postId)

onMounted(() => {
  scrollToUnread()
})

async function scrollToUnread() {
  if (!discussion.doc) {
    await until(() => discussion.doc).toBeTruthy()
  }

  updateUrlSlug()

  let doc = discussion.doc
  if (
    !route.query.comment &&
    !route.query.poll &&
    !route.query.fromSearch &&
    (doc?.last_unread_comment || doc?.last_unread_poll)
  ) {
    if (doc.last_unread_comment) {
      router.replace({
        query: {
          comment: doc.last_unread_comment || undefined,
        },
      })
    } else if (doc.last_unread_poll) {
      router.replace({
        query: {
          poll: doc.last_unread_poll || undefined,
        },
      })
    }
  }

  if (route.name === 'Discussion' && route.params.postId === doc?.name) {
    discussion.trackVisit.submit().then(() => {
      refreshUnreadCountForProjects([doc.project])
    })
  }
}

// Methods
function copyLink() {
  let location = window.location
  let url = `${location.origin}${location.pathname}`
  copyToClipboard(url)
}

function moveToSpace() {
  if (discussionMoveDialog.project) {
    discussion.moveToProject
      .submit({
        project: discussionMoveDialog.project,
      })
      .then(() => {
        nextTick(() => {
          discussionMoveDialog.show = false
          discussionMoveDialog.project = null

          const communityId = discussion.doc?.project
            ? getSpace(discussion.doc.project)?.team
            : null

          router.replace({
            name: 'Discussion',
            params: {
              communityId,
              spaceId: discussion.doc?.project,
              postId: discussion.doc?.name,
            },
          })
        })
      })
      .catch(() => {
        discussionMoveDialog.show = true
      })
  }
}

const canSavePost = computed(() => Boolean(discussion.doc?.title?.trim()))

// Read content from the editor's own serializer rather than discussion.doc.content:
// the editor re-normalizes HTML on load and writes it back, so the stored value
// drifts from the server copy without any user edit. Comparing getHTML() to
// getHTML() keeps both sides on the same normalization.
function currentPostContent() {
  return postEditor.value?.editor?.getHTML() ?? discussion.doc?.content ?? ''
}

function startEditingPost() {
  editSnapshot.value = {
    title: discussion.doc?.title ?? '',
    content: currentPostContent(),
  }
  editingPost.value = true
  // The options dropdown restores focus to its trigger as it closes, which would
  // otherwise swallow the editor focus (and the Esc/⌘+Enter shortcuts). Focus the
  // editor on the next frame, after that restore has settled.
  nextTick(() => {
    requestAnimationFrame(() => postEditor.value?.editor?.commands.focus())
  })
}

function isPostDirty() {
  if (!editSnapshot.value) return false
  return (
    (discussion.doc?.title ?? '') !== editSnapshot.value.title ||
    currentPostContent() !== editSnapshot.value.content
  )
}

function closeEditor() {
  editingPost.value = false
  editSnapshot.value = null
  discussion.reload()
}

function cancelEdit() {
  if (!editingPost.value) return
  if (isPostDirty()) {
    dialog.danger({
      title: 'Discard changes',
      message: 'You have unsaved changes. Are you sure you want to discard them?',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Keep editing',
      onConfirm: closeEditor,
    })
  } else {
    closeEditor()
  }
}

function updatePost() {
  if (!editingPost.value || !canSavePost.value) return
  discussion.setValue
    .submit({
      title: discussion.doc?.title,
      content: discussion.doc?.content,
    })
    .then(() => {
      tags.reload()
    })
  editingPost.value = false
  editSnapshot.value = null
}

function updateUrlSlug() {
  let doc = discussion.doc
  if (!doc) return
  if (!route.params.slug || route.params.slug !== doc.slug) {
    nextTick(() => {
      router.replace({
        name: 'Discussion',
        params: { ...route.params, slug: doc.slug },
        query: route.query,
      })
    })
  }
}

const space = useSpace(() => discussion.doc?.project)
const community = useCommunity(() => discussion.doc?.team)
const communityTitle = computed(() => community.value?.title ?? '')

const spaceOptions = useGroupedSpaceOptions({
  filterFn: (space) => !space.archived_at && space.name !== discussion.doc?.project,
})

const actions = computed(() => [
  {
    label: 'Edit',
    icon: 'lucide-edit',
    onClick: startEditingPost,
  },
  {
    label: 'Revisions',
    icon: 'lucide-rotate-ccw',
    onClick: () => (showRevisionsDialog.value = true),
  },
  {
    label: 'Copy link',
    icon: 'lucide-link',
    onClick: copyLink,
  },
  {
    label: 'Mark as unread',
    icon: 'lucide-mail',
    onClick: () => {
      discussion.markAsUnread.submit().then(() => {
        if (discussion.doc?.project) {
          refreshUnreadCountForProjects([discussion.doc.project])
        }
      })
    },
  },
  {
    label: 'Bookmark',
    icon: 'lucide-bookmark',
    onClick: () => discussion.addBookmark.submit(),
    condition: () => !discussion.doc?.is_bookmarked,
  },
  {
    label: 'Pin discussion...',
    icon: 'lucide-arrow-up-left',
    condition: () => !discussion.doc?.pinned_at,
    onClick: () => {
      pinDialog.show = true
    },
  },
  {
    label: 'Unpin discussion...',
    icon: 'lucide-arrow-down-left',
    condition: () => !!discussion.doc?.pinned_at,
    onClick: () => {
      const pinScope = discussion.doc?.pin_scope
      const scopeText =
        pinScope === 'Category'
          ? `This discussion is pinned across the ${communityTitle.value} community.`
          : `This discussion is pinned in ${space.value?.title} only.`

      dialog.confirm({
        title: 'Unpin discussion',
        message: `${scopeText} Do you want to unpin it?`,
        icon: 'lucide-arrow-down-left',
        confirmLabel: 'Unpin',
        onConfirm: () => discussion.unpinDiscussion.submit(),
      })
    },
  },
  {
    label: 'Close discussion...',
    icon: 'lucide-lock',
    condition: () => !discussion.doc?.closed_at,
    onClick: () => {
      dialog.confirm({
        title: 'Close discussion',
        message:
          'When a discussion is closed, commenting is disabled. Anyone can re-open the discussion later. Do you want to close this discussion?',
        icon: 'lucide-lock',
        confirmLabel: 'Close',
        onConfirm: () => discussion.closeDiscussion.submit(),
      })
    },
  },
  {
    label: 'Re-open discussion...',
    icon: 'lucide-unlock',
    condition: () => discussion.doc?.closed_at,
    onClick: () => {
      dialog.confirm({
        title: 'Re-open discussion',
        message: 'Do you want to re-open this discussion? Anyone can comment on it again.',
        icon: 'lucide-unlock',
        confirmLabel: 'Re-open',
        onConfirm: () => discussion.reopenDiscussion.submit(),
      })
    },
  },
  {
    label: 'Remove Bookmark',
    icon: 'lucide-bookmark',
    onClick: () => discussion.removeBookmark.submit(),
    condition: () => discussion.doc?.is_bookmarked,
  },
  {
    label: 'Move to...',
    icon: 'lucide-log-out',
    onClick: () => {
      discussionMoveDialog.show = true
    },
  },
  {
    label: 'Delete',
    icon: 'lucide-trash',
    condition: () => !!discussion.doc?.owner && isSessionUser(discussion.doc.owner),
    onClick: () => {
      dialog.danger({
        title: 'Delete',
        message: 'Are you sure you want to delete this post? This is irreversible!',
        onConfirm: async () => {
          await discussion.delete.submit()
          router.replace({
            name: 'Space',
            params: {
              communityId: route.params.communityId,
              spaceId: route.params.spaceId,
            },
          })
        },
      })
    },
  },
])

// Page Meta
usePageMeta(() => {
  if (!discussion.doc) return
  let space = useSpace(() => discussion.doc?.project)
  if (!space) return
  return {
    title: [discussion.doc.title, space.value?.title].filter(Boolean).join(' - '),
  }
})
</script>
