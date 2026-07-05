<template>
  <div>
    <ErrorMessage :message="errorMessage || publishError" />
    <textarea
      ref="titleTextarea"
      class="mt-1 w-full bg-transparent resize-none border-0 px-0 py-0.5 text-4xl-semibold text-ink-gray-8 placeholder-ink-gray-3 focus:ring-0"
      :value="draftData.title"
      placeholder="Title"
      rows="1"
      wrap="soft"
      maxlength="140"
      @keydown.enter.prevent="editor.commands.focus()"
      @keydown.down.prevent="editor.commands.focus()"
      @blur="handleTitleBlur"
      :disabled="sessionUser.name != author.name"
      @input="handleTitleInput"
    />
    <EditorContent :editor="editor" :class="editorClass" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue'
import { useTextareaAutosize } from '@vueuse/core'
import { ErrorMessage } from 'frappe-ui'
import { EditorContent } from 'frappe-ui/editor'
import { useNewDiscussionContext } from './useNewDiscussion'
import type { Editor } from '@tiptap/core'

interface Props {
  editor: Editor
  // Editor-content classes (e.g. `prose-v3`) forwarded from the GPEditor
  // `#editor` slot scope — the renderless <TextEditor> applies no classes itself.
  editorClass?: unknown
}

defineProps<Props>()

// Autosize the single-visual-line title. useTextareaAutosize owns the height
// measurement; we only nudge it when the draft title changes from outside (e.g.
// a restored draft), since the content is bound via :value, not the composable's
// own input ref.
const { textarea: titleTextarea, triggerResize } = useTextareaAutosize()

const {
  errorMessage,
  publishError,
  draftData,
  sessionUser,
  author,
  handleTitleInput,
  handleTitleBlur,
} = useNewDiscussionContext()

watch(
  () => draftData.value.title,
  () => nextTick(triggerResize),
  { flush: 'post' },
)

onMounted(() => {
  let focusInterval: number = setInterval(() => {
    if (document.activeElement === titleTextarea.value) {
      clearInterval(focusInterval)
      return
    }
    if (titleTextarea.value) {
      titleTextarea.value?.focus()
      clearInterval(focusInterval)
    }
  }, 100)
})
</script>
