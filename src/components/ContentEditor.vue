<template>
  <div
    style="width: 100%;"
    @keydown.meta.enter="onSubmit"
    @keydown.ctrl.enter="onSubmit"
    @keydown.esc="$emit('escape')"
  >
    <quill-editor
      :content="content"
      :options="options"
      ref="quillEditor"
      @change="$emit('change', $event.html)"
    />
  </div>
</template>
<script>
import { quillEditor } from 'vue-quill-editor'
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.bubble.css'

export default {
  name: 'ContentEditor',
  props: ['content'],
  model: {
    prop: 'content',
    event: 'change',
  },
  data() {
    return {
      options: {
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ header: 1 }, { header: 2 }],
            ['link', 'blockquote'],
            ['clean'],
          ],
        },
        placeholder: 'Write here...',
        theme: 'bubble',
      },
    }
  },
  components: {
    quillEditor,
  },
  mounted() {
    this.$refs.quillEditor.quill.focus()
  },
  methods: {
    onSubmit() {
      const value = this.$refs.quillEditor.quill.root.innerHTML
      this.$emit('submit', value)
    },
  },
}
</script>
<style>
.ql-editor {
  font-family: var(--font-stack);
  font-size: initial;
  padding: 0;
  min-height: 5rem;
  caret-color: var(--text-blue);
  color: var(--text-black);
}

.ql-editor.ql-blank::before {
  color: var(--text-grey);
  left: 0;
  font-style: normal;
}
</style>
