import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

// Define a unique key for our plugin
const SpellingGrammarKey = new PluginKey('spelling-grammar')

export default Extension.create({
  name: 'spellingGrammar',

  addOptions() {
    return {
      sendRequest: null,
    }
  },

  addCommands() {
    return {
      fixSpellingAndGrammar:
        () =>
        ({ editor }) => {
          // Get the current content from the editor
          const content = editor.getHTML()

          // Store the current selection positions
          const { from, to } = editor.state.selection

          // Emit an event that processing has started (can be used to show loading state)
          editor.emit('spellingGrammarFixStart')

          // Perform the API call asynchronously
          this._fixContent(editor, content, from, to)

          // Return true to indicate the command was handled
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: SpellingGrammarKey,
      }),
    ]
  },

  // Helper method to perform the API call and content update
  _fixContent(editor, content, selectionFrom, selectionTo) {
    // Check if sendRequest function is configured
    if (!this.options.sendRequest || typeof this.options.sendRequest !== 'function') {
      console.error('No sendRequest function configured for spellingGrammar extension')
      editor.emit('spellingGrammarFixComplete', {
        success: false,
        error: 'No request handler configured',
      })
      return
    }

    // Use the configured sendRequest function
    this.options
      .sendRequest(content)
      .then((correctedContent) => {
        // Replace the editor content with the corrected content
        editor.commands.setContent(correctedContent)

        // Try to restore the selection if possible
        try {
          editor.commands.setTextSelection({ from: selectionFrom, to: selectionTo })
        } catch (e) {
          // Selection might not be valid in the new content
          console.warn('Could not restore selection after spelling and grammar fix')
        }

        // Emit an event that processing has completed successfully
        editor.emit('spellingGrammarFixComplete', { success: true })
      })
      .catch((error) => {
        console.error('Error fixing spelling and grammar:', error)

        // Emit an event with the error
        editor.emit('spellingGrammarFixComplete', {
          success: false,
          error: error.message || 'Unknown error',
        })
      })
  },
})
