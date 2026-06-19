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
import { onMounted, nextTick, useTemplateRef } from 'vue'
import { ErrorMessage } from 'frappe-ui'
import { EditorContent } from 'frappe-ui/editor'
import { useNewDiscussionContext } from './useNewDiscussion'
import type { TextEditorInstance } from './types'

interface Props {
  editor: TextEditorInstance['editor']
  // Editor-content classes (e.g. `prose-v3`) forwarded from the GPEditor
  // `#editor` slot scope — the renderless <TextEditor> applies no classes itself.
  editorClass?: unknown
}

defineProps<Props>()

const titleTextarea = useTemplateRef<HTMLTextAreaElement>('titleTextarea')

const {
  errorMessage,
  publishError,
  draftData,
  sessionUser,
  author,
  handleTitleInput,
  handleTitleBlur,
} = useNewDiscussionContext()

onMounted(() => {
  let focusInterval: number = setInterval(() => {
    if (document.activeElement != titleTextarea.value) {
      titleTextarea.value?.focus()
      clearInterval(focusInterval)
    }
  }, 100)
})
</script>
