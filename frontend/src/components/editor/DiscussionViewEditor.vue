<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { Button } from 'frappe-ui'
import GPEditor from './GPEditor.vue'
import QuoteReplyButton from '@/components/RichQuoteExtension/QuoteReplyButton.vue'
import { useRichQuotes, useBacklinkRefresh } from '@/components/RichQuoteExtension/useRichQuotes'
import { gameplanToolbar } from './toolbars'
import { commentExtensions } from './commentExtensions'

// The editor for a discussion's main post (GP Discussion content). One scenario,
// composed directly from GPEditor — not a configurable generic:
//   - read mode: renders the post body with a quote-reply bubble
//   - edit mode: a free-growing body (no inner scroll) with a selection bubble
//     menu and Save / Discard actions
// Other surfaces (comments, pages, tasks) get their own dedicated editor rather
// than another prop on a shared one.
const props = withDefaults(
  defineProps<{
    content?: string
    editable?: boolean
    saving?: boolean
    canSave?: boolean
    // 'discussion:<id>' — powers the "quoted by" backlink badges + Reply-to-quote
    quoteSourceId: string
    // post owner — stamped on quotes created from this post's selection
    author?: string
  }>(),
  { content: '', editable: false, saving: false, canSave: true },
)

const emit = defineEmits<{
  change: [value: string]
  save: []
  discard: []
}>()

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
    :content="content"
    :editable="editable"
    :editor-class="['prose-v3 max-w-none relative', editable && 'min-h-[4rem]']"
    :bubble-menu="editable ? gameplanToolbar : false"
    @change="editable ? emit('change', $event) : null"
  >
    <template v-if="!editable" #top="{ editor: e }">
      <QuoteReplyButton v-if="e" :editor="e" :source-id="quoteSourceId" :author="author ?? ''" />
    </template>
    <template v-if="editable" #bottom>
      <div class="mt-2 flex items-center justify-end space-x-2">
        <Button @click="emit('discard')">Discard</Button>
        <Button variant="solid" :loading="saving" :disabled="!canSave" @click="emit('save')">
          Save
        </Button>
      </div>
    </template>
  </GPEditor>
</template>
