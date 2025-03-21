<template>
  <NodeViewWrapper class="not-prose border border-gray-300 p-2.5 bg-surface-gray-1 rounded-lg">
    <button @click="scrollToComment" class="w-full">
      <div class="flex items-center w-full">
        <UserAvatar size="sm" :user="node.attrs.author" />
        <span class="text-sm ml-2 text-ink-gray-7">
          {{ $user(node.attrs.author).full_name }} said:
        </span>
        <span class="ml-auto text-sm text-ink-gray-7">#{{ node.attrs.commentId }}</span>
      </div>
      <div class="mt-2 italic text-left">
        {{ decodeURIComponent(node.attrs.text) }}
      </div>
    </button>
  </NodeViewWrapper>
</template>

<script>
import UserAvatar from '@/components/UserAvatar.vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

export default {
  components: {
    UserAvatar,
    NodeViewWrapper,
  },
  props: nodeViewProps,
  methods: {
    scrollToComment() {
      this.$emit('scroll-to-comment', this.node.attrs.commentId)
    },
  },
}
</script>
