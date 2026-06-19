<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { Button, Tooltip } from 'frappe-ui'
import { EditorFixedMenu } from 'frappe-ui/editor'
import GPEditor from './GPEditor.vue'
import QuoteReplyButton from '@/components/RichQuoteExtension/QuoteReplyButton.vue'
import { useRichQuotes, useBacklinkRefresh } from '@/components/RichQuoteExtension/useRichQuotes'
import { compactCommentToolbar, gameplanToolbar } from './toolbars'
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
    toolbarExpanded?: boolean
    // 'comment:<id>' — enables "quoted by" badges + Reply-to-quote on this comment
    // when it's rendered inside a discussion
    quoteSourceId?: string
    // comment owner — stamped on quotes created from this comment's selection
    author?: string
  }>(),
  { value: '', placeholder: null, editable: true, maxHeight: '50vh', toolbarExpanded: false },
)

const emit = defineEmits<{
  change: [value: string]
  'update:toolbarExpanded': [value: boolean]
}>()

const controller = useRichQuotes()

const extensions = commentExtensions({ controller, sourceId: props.quoteSourceId })

const gp = useTemplateRef<InstanceType<typeof GPEditor>>('gp')
const editor = computed(() => gp.value?.editor ?? null)
const toolbarItems = computed(() =>
  props.toolbarExpanded ? gameplanToolbar : compactCommentToolbar,
)

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
      <div class="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div class="flex min-w-0 items-center">
          <EditorFixedMenu :editor="e" :items="toolbarItems" class="-ml-1 overflow-x-auto" />
          <Tooltip :text="toolbarExpanded ? 'Show fewer tools' : 'Show more tools'">
            <Button
              variant="ghost"
              :icon="toolbarExpanded ? 'lucide-chevron-left' : 'lucide-ellipsis'"
              :aria-label="toolbarExpanded ? 'Show fewer editor tools' : 'Show more editor tools'"
              @click="emit('update:toolbarExpanded', !toolbarExpanded)"
            />
          </Tooltip>
        </div>
        <div class="flex items-center justify-end space-x-2">
          <Button v-bind="discardButtonProps || {}"> Discard </Button>
          <Button variant="solid" v-bind="submitButtonProps || {}"> Submit </Button>
        </div>
      </div>
    </template>
  </GPEditor>
</template>
