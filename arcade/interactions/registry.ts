import type Phaser from 'phaser'
import type { ArcadeBridge } from '../bridge'
import type { ArcadeNet } from '../net/ArcadeNet'
import type { Avatar } from '../objects/Avatar'
import type { LocalPlayer } from '../objects/LocalPlayer'
import type { RoomId } from '../net/protocol'
import type { CelebrationSource } from './party'
import type { CatSource } from './pet'
import type { PlantSource } from './plant'
import type { Interactable, InteractableKind } from '../world/interactables'

/**
 * What pressing E does next to each kind of Interactable.
 *
 * The map marks Interactables and says what kind each one is; a handler registered here
 * for that kind decides what using one does. A kind with no handler is ignored: the game
 * shows no prompt for it. Register handlers before a Room is created (see `./index.ts`).
 *
 * Using something the whole Room should see (petting the cat, starting the jukebox,
 * pinning a note) goes out as `net.use(target.id)`, or `net.use(target.id, value)` with a
 * whole number such as a dart's score. Everyone else's game then calls the handler's
 * `observe` for the same Interactable in their copy of the map.
 */

export interface InteractionContext {
  scene: Phaser.Scene
  map: Phaser.Tilemaps.Tilemap
  /** The Room the map belongs to. */
  room: RoomId
  /** Every Interactable in the map. */
  interactables: readonly Interactable[]
  player: LocalPlayer
  bridge: ArcadeBridge
  net: ArcadeNet
  plants: PlantSource
  celebrations: CelebrationSource
  cats: CatSource
  /** Everyone in the Room as the game draws them now, the player first. Empty until the Room is joined. */
  people(): RoomPerson[]
}

/** Someone in the Room, where the game draws them now. */
export interface RoomPerson {
  user: string
  /** Their feet, in map pixels. */
  x: number
  y: number
  sitting: boolean
}

/** Someone else's use of an Interactable, as `observe` gets it. */
export interface ObservedUse {
  /** Their Avatar, or null if it is not drawn yet. */
  actor: Avatar | null
  /** Their name, or null if they are not drawn yet. */
  fullName: string | null
  /** The whole number the use carried, or null if it carried none. */
  value: number | null
}

/** What an Interactable keeps running while its Room is open, like the cat. */
export interface InteractableRuntime {
  update?(time: number, delta: number): void
  destroy(): void
}

export interface InteractionHandler {
  /** The prompt shown in reach, e.g. "Sit". An Interactable's own `label` wins over it. */
  label: string
  interact(target: Interactable, context: InteractionContext): void
  /** Someone else used `target`. */
  observe?(target: Interactable, use: ObservedUse, context: InteractionContext): void
  /** Runs once for each Interactable of this kind when its Room is created. */
  setup?(target: Interactable, context: InteractionContext): InteractableRuntime
}

const handlers = new Map<InteractableKind, InteractionHandler>()

export function registerInteraction(kind: InteractableKind, handler: InteractionHandler) {
  handlers.set(kind, handler)
}

/** How far from the feet, in pixels, an Interactable can be used. */
export const REACH = 40

/**
 * The closest usable Interactable within reach of a point, measured to the nearest edge
 * of its footprint.
 */
export function nearestInteractable(
  interactables: readonly Interactable[],
  x: number,
  y: number,
): { target: Interactable; handler: InteractionHandler } | null {
  let best: { target: Interactable; handler: InteractionHandler } | null = null
  let bestDistance = REACH
  for (const target of interactables) {
    const handler = handlers.get(target.kind)
    if (!handler) continue
    const dx = Math.max(target.x - x, 0, x - (target.x + target.width))
    const dy = Math.max(target.y - y, 0, y - (target.y + target.height))
    const distance = Math.hypot(dx, dy)
    if (distance <= bestDistance) {
      best = { target, handler }
      bestDistance = distance
    }
  }
  return best
}

/**
 * The Interactables of one Room while it is open: starts what they keep running and
 * passes on what others in the Room do with them.
 */
export class RoomInteractions {
  private readonly runtimes: InteractableRuntime[] = []
  private readonly interactables: readonly Interactable[]
  private readonly context: InteractionContext

  constructor(interactables: readonly Interactable[], context: InteractionContext) {
    this.interactables = interactables
    this.context = context
    for (const target of interactables) {
      const runtime = handlers.get(target.kind)?.setup?.(target, context)
      if (runtime) this.runtimes.push(runtime)
    }
  }

  update(time: number, delta: number) {
    for (const runtime of this.runtimes) runtime.update?.(time, delta)
  }

  /** Someone else used the Interactable with this id. Ids this map lacks are ignored. */
  observe(targetId: string, use: ObservedUse) {
    const target = this.interactables.find((candidate) => candidate.id === targetId)
    if (target) handlers.get(target.kind)?.observe?.(target, use, this.context)
  }

  destroy() {
    for (const runtime of this.runtimes.splice(0)) runtime.destroy()
  }
}
