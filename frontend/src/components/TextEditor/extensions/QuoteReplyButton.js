import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

export default Extension.create({
  name: 'quoteReplyButton',

  addOptions() {
    return {
      onQuoteReply: () => {},
    }
  },

  addProseMirrorPlugins() {
    let button = null

    return [
      new Plugin({
        key: new PluginKey('quote-reply-button'),
        view: (view) => {
          button = document.createElement('button')
          button.innerHTML = 'Quote & Reply'
          button.className = 'quote-reply-button'
          button.style.display = 'none'
          view.dom.parentElement.appendChild(button)

          return {
            update: (view) => {
              const { state } = view
              const { selection } = state

              if (!selection.empty) {
                const { from, to } = selection
                const start = view.coordsAtPos(from)
                const end = view.coordsAtPos(to)

                button.style.display = 'block'
                button.style.top = `${start.top - 40}px`
                button.style.left = `${(start.left + end.left) / 2}px`

                const handleClick = () => {
                  const selectedText = state.doc.textBetween(from, to)

                  // Get the HTML content of the selection
                  let htmlContent = null
                  try {
                    const domFrom = view.domAtPos(from)
                    const domTo = view.domAtPos(to)

                    if (domFrom.node && domTo.node) {
                      const range = document.createRange()
                      range.setStart(domFrom.node, domFrom.offset)
                      range.setEnd(domTo.node, domTo.offset)
                      const fragment = range.cloneContents()

                      const tempDiv = document.createElement('div')
                      tempDiv.appendChild(fragment)
                      htmlContent = tempDiv.innerHTML
                    }
                  } catch (e) {
                    console.error('Error capturing HTML content:', e)
                  }

                  // Find the comment element and ID
                  const commentElement = view.dom.closest('[data-comment-id]')
                  const commentId = commentElement
                    ? commentElement.getAttribute('data-comment-id')
                    : null
                  const authorId = commentElement
                    ? commentElement.getAttribute('data-author-id')
                    : null

                  this.options.onQuoteReply({
                    text: selectedText,
                    htmlContent,
                    commentId,
                    authorId,
                  })

                  button.style.display = 'none'
                }

                button.onclick = handleClick
              } else {
                button.style.display = 'none'
              }
            },
            destroy: () => {
              button.remove()
            },
          }
        },
      }),
    ]
  },
})
