import type Phaser from 'phaser'
import { HOLD_MS } from '../net/protocol'
import type { LocalPlayer } from '../objects/LocalPlayer'
import type { InteractionHandler } from './registry'

/** When each player puts their cup down. Getting another coffee starts the time again. */
const drops = new WeakMap<LocalPlayer, Phaser.Time.TimerEvent>()

/**
 * Puts a steaming cup in the player's hand for a minute. Everyone in the Room sees it,
 * including people who arrive while it lasts: the server keeps it on the Occupant.
 */
export const coffee: InteractionHandler = {
  label: 'Get coffee',
  interact(_target, { scene, player, net }) {
    player.avatar.hold('coffee')
    net.hold('coffee')
    drops.get(player)?.remove()
    drops.set(
      player,
      scene.time.delayedCall(HOLD_MS, () => {
        drops.delete(player)
        player.avatar.hold(null)
        net.hold(null)
      }),
    )
  },
}
