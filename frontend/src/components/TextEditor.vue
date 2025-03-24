<template>
  <FTextEditor :mentions="users" v-bind="$attrs" ref="textEditor" :extensions="extensions">
    <template #editor="props">
      <slot name="editor" v-bind="props" />
    </template>
    <template #top>
      <slot name="top" />
    </template>
    <template #bottom>
      <slot name="bottom" />
    </template>
  </FTextEditor>
</template>
<script>
import { TextEditor as FTextEditor } from 'frappe-ui'
import SpellingGrammarExtension from './TextEditorAI/spellingGrammar'
import { useCall } from 'frappe-ui/src/data-fetching'

export default {
  name: 'TextEditor',
  inheritAttrs: false,
  components: { FTextEditor },
  expose: ['editor'],
  computed: {
    editor() {
      return this.$refs.textEditor.editor
    },
    users() {
      return this.$users.data
        .filter((user) => user.enabled)
        .map((user) => ({
          label: user.full_name.trimEnd(),
          value: user.name,
        }))
    },
    extensions() {
      return [
        SpellingGrammarExtension.configure({
          sendRequest(content) {
            let fixSpellingGrammar = useCall({
              method: '/api/v2/method/gameplan.api.fix_spelling_grammar',
              immediate: false,
            })
            return fixSpellingGrammar.submit({ content })
          },
        }),
      ]
    },
  },
}
</script>
