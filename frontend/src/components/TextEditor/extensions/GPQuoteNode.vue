<template>
  <NodeViewWrapper class="not-prose border border-gray-300 p-2.5 bg-surface-gray-1 rounded-lg">
    <button @click="scrollToComment" class="w-full">
      <div class="flex items-center w-full">
        <UserAvatar size="sm" :user="node.attrs.author" />
        <span class="text-sm ml-2 text-ink-gray-7"
          >{{ $user(node.attrs.author).full_name }} said:</span
        >
        <span class="ml-auto text-sm text-ink-gray-7">#{{ node.attrs.commentId }}</span>
      </div>
      <div
        class="mt-2 text-left quote-content"
        v-if="node.attrs.htmlContent"
        v-html="node.attrs.htmlContent"
      ></div>
      <div class="mt-2 italic text-left" v-else>
        {{ decodeURIComponent(node.attrs.text) }}
      </div>
    </button>
    <NodeViewContent class="content-editable-disable" :as="'div'" />
  </NodeViewWrapper>
</template>

<script>
import UserAvatar from '@/components/UserAvatar.vue'
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'

export default {
  components: {
    UserAvatar,
    NodeViewWrapper,
    NodeViewContent,
  },
  props: nodeViewProps,
  methods: {
    scrollToComment() {
      // Find the comment element by its ID and scroll to it
      console.log('Scrolling to comment:', this.node.attrs.commentId)
      //   const commentId = this.node.attrs.commentId
      //   const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`)
      //   if (commentElement) {
      //     commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      //     // Optional: add highlight effect
      //     commentElement.classList.add('highlight-comment')
      //     setTimeout(() => {
      //       commentElement.classList.remove('highlight-comment')
      //     }, 2000)
      //   }
    },
  },
}
</script>

<style>
.content-editable-disable {
  pointer-events: none;
  user-select: none;
  caret-color: transparent;
  display: none; /* Hide actual content but keep it in DOM */
}

.quote-content :deep(p) {
  margin: 0.5em 0;
}

.quote-content :deep(*) {
  /* Ensure any elements inside cannot be edited */
  pointer-events: none;
}
</style>
