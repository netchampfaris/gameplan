import { Node, mergeAttributes } from '@tiptap/core'

export default Node.create({
  name: 'quoteBox',
  group: 'block',
  content: 'block+',
  draggable: true,
  selectable: true,
  defining: true,

  addAttributes() {
    return {
      author: { default: null },
      commentId: { default: null },
      date: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-quote-box]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-quote-box': '' }, HTMLAttributes), 0]
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const container = document.createElement('div')
      container.classList.add('quote-box')

      const quoteContent = document.createElement('div')
      quoteContent.classList.add('quote-box-wrapper')
      quoteContent.setAttribute('contenteditable', 'false')

      const header = document.createElement('div')
      header.classList.add('quote-box-header')

      const authorText = document.createElement('span')
      authorText.textContent = node.attrs.author
      header.appendChild(authorText)

      if (node.attrs.date) {
        const dateText = document.createElement('span')
        dateText.classList.add('quote-box-date')
        dateText.textContent = new Date(node.attrs.date).toLocaleDateString()
        header.appendChild(dateText)
      }

      const content = document.createElement('div')
      content.classList.add('quote-box-content')

      quoteContent.appendChild(header)
      quoteContent.appendChild(content)
      container.appendChild(quoteContent)

      if (node.attrs.commentId) {
        container.setAttribute('data-comment-id', node.attrs.commentId)
        container.style.cursor = 'pointer'
        container.addEventListener('click', () => {
          const originalComment = document.querySelector(
            `[data-comment-id="${node.attrs.commentId}"]`,
          )
          if (originalComment) {
            originalComment.scrollIntoView({ behavior: 'smooth' })
            originalComment.classList.add('highlight')
            setTimeout(() => originalComment.classList.remove('highlight'), 2000)
          }
        })
      }

      return {
        dom: container,
        contentDOM: content,
      }
    }
  },

  addCommands() {
    return {
      createQuoteBox:
        (attributes) =>
        ({ tr, dispatch, editor }) => {
          if (dispatch) {
            const paragraph = editor.schema.nodes.paragraph.create(
              null,
              editor.schema.text(attributes.content),
            )

            const quoteBox = this.type.create(
              {
                author: attributes.author,
                commentId: attributes.commentId,
                date: attributes.date,
              },
              [paragraph],
            )

            // Insert quote box
            tr.replaceSelectionWith(quoteBox)

            // Insert two empty paragraphs after quote box
            const emptyParagraph = editor.schema.nodes.paragraph.create()
            const pos = tr.selection.from
            tr.insert(pos, emptyParagraph)
            tr.insert(pos + 1, emptyParagraph.copy()) // Add another paragraph

            // Set cursor to the first empty paragraph
            const resolvedPos = tr.doc.resolve(pos + 2)
            tr.setSelection(editor.state.selection.constructor.near(resolvedPos))
          }

          return true
        },
    }
  },
})
