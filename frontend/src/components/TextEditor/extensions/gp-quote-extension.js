import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'

import Component from './GPQuoteNode.vue'

export default Node.create({
  name: 'gpQuote',
  group: 'block',
  content: 'block+', // Allow rich content
  atom: false, // Not an atom since it contains content
  isolating: true, // Prevents selection from entering

  addAttributes() {
    return {
      author: {
        default: null,
      },
      text: {
        default: null,
      },
      commentId: {
        default: null,
      },
      htmlContent: {
        default: null, // To store rich HTML content
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'gp-quote',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['gp-quote', mergeAttributes(HTMLAttributes, { contenteditable: 'false' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(Component)
  },
})
