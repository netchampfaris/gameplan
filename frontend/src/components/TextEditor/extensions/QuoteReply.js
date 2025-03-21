import { mergeAttributes, Node } from '@tiptap/core'

export default Node.create({
  name: 'quoteReply',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      author: {
        default: null,
      },
      date: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="quote-reply"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'quote-reply' }), 0]
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos }) => {
      const container = document.createElement('div')
      container.classList.add('quote-reply')

      const header = document.createElement('div')
      header.classList.add('quote-reply-header')
      header.textContent = `${node.attrs.author} wrote:`

      const content = document.createElement('div')
      content.classList.add('quote-reply-content')

      container.appendChild(header)
      container.appendChild(content)

      return {
        dom: container,
        contentDOM: content,
      }
    }
  },
})
