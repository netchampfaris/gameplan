<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { Button } from 'frappe-ui'
import { EditorFixedMenu } from 'frappe-ui/editor'
import GPEditor from './GPEditor.vue'
import QuoteReplyButton from '@/components/RichQuoteExtension/QuoteReplyButton.vue'
import { useRichQuotes, useBacklinkRefresh } from '@/components/RichQuoteExtension/useRichQuotes'
import { gameplanToolbar } from './toolbars'
import { commentExtensions } from './commentExtensions'

// gameplan's comment box: the lighter CommentKit (no toc / iframe) + tables +
// @-mentions + #-tags + RichQuote + slash commands. The shared `gameplanToolbar`
// self-prunes to the comment-available buttons (spec §5), so it needs no separate
// curation.
const props = withDefaults(
  defineProps<{
    value?: string
    placeholder?: string | null
    editable?: boolean
    submitButtonProps?: Record<string, any>
    discardButtonProps?: Record<string, any>
    maxHeight?: string
    // 'comment:<id>' — enables "quoted by" badges + Reply-to-quote on this comment
    // when it's rendered inside a discussion
    quoteSourceId?: string
    // comment owner — stamped on quotes created from this comment's selection
    author?: string
  }>(),
  { value: '', placeholder: null, editable: true, maxHeight: '50vh' },
)

const emit = defineEmits<{ change: [value: string] }>()

const controller = useRichQuotes()

const extensions = commentExtensions({ controller, sourceId: props.quoteSourceId })

const gp = useTemplateRef<InstanceType<typeof GPEditor>>('gp')
const editor = computed(() => gp.value?.editor ?? null)

useBacklinkRefresh(editor, props.quoteSourceId, () => props.editable ?? false)

defineExpose({ editor })
</script>

<template>
  <GPEditor
    ref="gp"
    :extensions="extensions"
    :content="value"
    :placeholder="placeholder ?? undefined"
    :editable="editable"
    :editor-class="['prose-v3 max-w-none relative', editable && 'min-h-[4rem]']"
    :max-height="editable ? maxHeight : undefined"
    @change="editable ? emit('change', $event) : null"
  >
    <template v-if="!editable && quoteSourceId" #top="{ editor: e }">
      <QuoteReplyButton v-if="e" :editor="e" :source-id="quoteSourceId" :author="author ?? ''" />
    </template>
    <template v-if="editable" #bottom="{ editor: e }">
      <div class="mt-2 flex flex-col justify-between sm:flex-row sm:items-center">
        <EditorFixedMenu :editor="e" :items="gameplanToolbar" class="-ml-1 overflow-x-auto" />
        <div class="mt-2 flex items-center justify-end space-x-2 sm:mt-0">
          <Button v-bind="discardButtonProps || {}"> Discard </Button>
          <Button variant="solid" v-bind="submitButtonProps || {}"> Submit </Button>
        </div>
      </div>
    </template>
  </GPEditor>
</template>
