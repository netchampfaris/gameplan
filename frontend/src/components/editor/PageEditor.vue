<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import GPEditor from './GPEditor.vue'
import { gameplanToolbar } from './toolbars'
import { richTextExtensions } from './richTextExtensions'

// gameplan's page editor (collaborative GP Pages): a rich body with bubble-menu
// formatting and no @-mention/#-tag popups (pages never had them). The page owns
// its title input + autosave; this wrapper just bakes the page's editor config.
withDefaults(
  defineProps<{
    content?: string | null
    placeholder?: string
    editable?: boolean
    autofocus?: boolean
    editorClass?: unknown
  }>(),
  { editable: true, autofocus: false },
)

const emit = defineEmits<{
  change: [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const extensions = richTextExtensions({ suggestions: false })

const gp = useTemplateRef<InstanceType<typeof GPEditor>>('gp')
const editor = computed(() => gp.value?.editor ?? null)
defineExpose({ editor })
</script>

<template>
  <GPEditor
    ref="gp"
    :extensions="extensions"
    :content="content"
    :placeholder="placeholder"
    :editable="editable"
    :autofocus="autofocus"
    :editor-class="editorClass"
    :bubble-menu="editable ? gameplanToolbar : undefined"
    @change="emit('change', $event)"
    @blur="emit('blur', $event)"
    @focus="emit('focus', $event)"
  />
</template>
