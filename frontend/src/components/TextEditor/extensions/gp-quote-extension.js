import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'

import Component from './GPQuoteNode.vue'

export default Node.create({
  name: 'gpQuote',
  group: 'block',
  atom: true,

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
    return ['gp-quote', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(Component)
  },
})
