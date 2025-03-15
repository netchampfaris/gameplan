<template>
  <FTextEditor :mentions="users" v-bind="$attrs" :extensions="extensions" ref="textEditor">
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
import QuoteReplyButton from './extensions/QuoteReplyButton'
import GPQuoteExtension from './extensions/gp-quote-extension.js'

export default {
  name: 'TextEditor',
  inheritAttrs: false,
  components: { FTextEditor },
  expose: ['editor', 'insertQuote'],
  emits: ['quote-reply'],
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
        GPQuoteExtension,
        QuoteReplyButton.configure({
          onQuoteReply: (text, selectionNode) => {
            this.$emit('quote-reply', { text, selectionNode })
          },
        }),
      ]
    },
  },
}
</script>
<style>
.quote-reply {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f3f4f6;
  border-left: 4px solid #e5e7eb;
  border-radius: 0.375rem;
}

.quote-reply-header {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.quote-reply-button {
  position: fixed;
  z-index: 50;
  transform: translateX(-50%);
  padding: 0.5rem;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 0.875rem;
}

.quote-reply-button:hover {
  background-color: #f3f4f6;
}

.quote-box {
  @apply my-3;
}

.quote-box-wrapper {
  @apply rounded-lg border border-gray-100 bg-gray-50 p-3 transition-colors duration-200;
}

.quote-box-wrapper:hover {
  @apply bg-gray-100;
}

.quote-box-header {
  @apply mb-2 flex items-center gap-2 text-sm text-gray-600;
}

.quote-box-date {
  @apply text-gray-400;
}

.quote-box-content {
  @apply text-gray-700;
}

.highlight {
  @apply bg-yellow-100;
}

/* Add styles for highlighted comment */
.highlight-comment {
  @apply transition-colors duration-500;
  animation: highlight-pulse 2s ease-in-out;
}

@keyframes highlight-pulse {
  0% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(253, 224, 71, 0.3);
  }
  100% {
    background-color: transparent;
  }
}
</style>
