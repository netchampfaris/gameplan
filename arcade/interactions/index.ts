import { guestbook, noticeboard } from './boards'
import { coffee } from './coffee'
import { darts } from './darts'
import { jukebox } from './jukebox'
import { party } from './party'
import { pet } from './pet'
import { plant } from './plant'
import { puzzle } from './puzzle'
import { registerInteraction } from './registry'
import { seat } from './seat'
import { door, elevator } from './travel'

/**
 * The Interactables the game knows how to use. Add a kind by writing a handler next to
 * `seat.ts` and registering it here.
 */
registerInteraction('seat', seat)
registerInteraction('coffee', coffee)
registerInteraction('pet', pet)
registerInteraction('jukebox', jukebox)
registerInteraction('noticeboard', noticeboard)
registerInteraction('guestbook', guestbook)
registerInteraction('elevator', elevator)
registerInteraction('door', door)
registerInteraction('plant', plant)
registerInteraction('puzzle', puzzle)
registerInteraction('darts', darts)
registerInteraction('party', party)

export { nearestInteractable, registerInteraction, RoomInteractions } from './registry'
export type { InteractableRuntime, InteractionContext, InteractionHandler, ObservedUse } from './registry'
