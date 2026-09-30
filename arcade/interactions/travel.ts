import type { InteractionHandler } from './registry'

/**
 * Getting between Rooms. The elevator in the Common Room opens the Home directory, where
 * the player picks whose Home to visit; the door of every Home leads back to the Common
 * Room, arriving by the elevator.
 */

export const elevator: InteractionHandler = {
  label: 'Visit homes',
  interact(_target, { bridge }) {
    bridge.state.directoryOpen = true
  },
}

export const door: InteractionHandler = {
  label: 'Back to the Common Room',
  interact(_target, { bridge }) {
    bridge.travel({ kind: 'common', spawn: 'elevator' })
  },
}
