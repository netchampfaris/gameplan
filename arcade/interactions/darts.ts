import { Dartboard } from '../objects/Dartboard'
import type { Interactable } from '../world/interactables'
import type { InteractionHandler } from './registry'

/**
 * The darts line in the Common Room. The game draws the line and the board on the wall
 * ahead of it (`objects/Dartboard.ts`); using the line opens the darts dialog
 * (`hud/Darts.vue`), which aims, scores and records each dart.
 *
 * Once the server has taken a dart, the HUD says so through the bridge. The game then
 * shows the dart flying from the player to the board and tells the Room its score, so
 * everyone else sees it land too, and their HUD says who scored what.
 */

const boards = new WeakMap<Interactable, Dartboard>()

export const darts: InteractionHandler = {
  label: 'Throw darts',
  setup(target, { scene, map, bridge, net, player }) {
    const board = new Dartboard(scene, map, target)
    boards.set(target, board)
    const off = bridge.commands.on('darts', ({ target: line, score }) => {
      if (line !== target.id) return
      board.throw(player.avatar.sprite, score)
      net.use(target.id, score)
    })
    return {
      destroy() {
        off()
        board.destroy()
        if (bridge.state.darts === target.id) bridge.state.darts = null
      },
    }
  },
  interact(target, { bridge }) {
    bridge.state.darts = target.id
  },
  observe(target, { actor, fullName, value }, { bridge }) {
    // Every dart carries its score; a use without one is not a dart.
    if (value === null) return
    if (actor) boards.get(target)?.throw(actor.sprite, value)
    bridge.state.lastDart = { fullName: fullName ?? 'Someone', score: value }
  },
}
