import type { InteractionHandler } from './registry'

/** Sits the player down. Any movement key stands them up again (see `LocalPlayer`). */
export const seat: InteractionHandler = {
  label: 'Sit',
  interact(target, { player }) {
    player.sit(target)
  },
}
