import type { NoteBoard } from '../bridge'
import type { Interactable } from '../world/interactables'
import type { InteractionContext, InteractionHandler } from './registry'

/**
 * Boards of notes: the Notice Board in the Common Room and the Guestbook in each Home.
 * The HUD shows the notes (`hud/NoteBoard.vue`); these handlers open it, and pass on
 * that someone pinned or removed a note, so everyone with the board open refreshes it.
 */

function boardHandler(
  label: string,
  open: (target: Interactable, context: InteractionContext) => NoteBoard | null,
) {
  return {
    label,
    setup(target, { bridge, net }) {
      const off = bridge.commands.on('notes', (change) => {
        if (change.target === target.id) net.use(target.id)
      })
      return { destroy: off }
    },
    interact(target, context) {
      const board = open(target, context)
      if (board) context.bridge.state.board = board
    },
    observe(_target, _actor, { bridge }) {
      bridge.state.boardRevision++
    },
  } satisfies InteractionHandler
}

export const noticeboard = boardHandler('Read notes', (target) => ({
  target: target.id,
  board: 'Notice Board',
}))

/** A Guestbook belongs to the Home it is in. */
export const guestbook = boardHandler('Read the guestbook', (target, { bridge }) => {
  const home = bridge.state.home
  if (!home) return null
  return { target: target.id, board: 'Guestbook', home: home.owner, ownerName: home.ownerName }
})
