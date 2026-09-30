import { SharedPlant } from '../objects/SharedPlant'
import type { Interactable } from '../world/interactables'
import type { InteractionContext, InteractionHandler } from './registry'

/**
 * The shared plant in the Common Room. Everyone grows it by watering it, once a day each;
 * the server keeps its state and decides how far it has grown (`gp_arcade_plant.py`).
 *
 * The plant loads when the Room opens and again whenever the player walks up to it, so
 * the stage and who watered it today are fresh when they read them. Watering it shows
 * falling drops to everyone in the Room, and their games load it again.
 */

export interface PlantSpecies {
  /** From `data/plants.json`. */
  id: string
  name: string
  /** The Home item a cutting of it unlocks. */
  item: string
}

export interface PlantStatus {
  cycle: number
  species: PlantSpecies
  /** From 1, a sprout, to `stages`, in bloom. */
  stage: number
  stages: number
  drooping: boolean
  /** Full grown today. A new plant sprouts tomorrow. */
  bloomed: boolean
  wateredToday: { user: string; fullName: string }[]
  wateredByMe: boolean
}

/** The server side of the plant, for the player's local today. Rejects with a message for the player. */
export interface PlantSource {
  load(): Promise<PlantStatus>
  water(): Promise<PlantStatus>
}

/** One plant while its Room is open. */
class PlantKeeper {
  private readonly target: Interactable
  private readonly context: InteractionContext
  private readonly drawing: SharedPlant
  private status: PlantStatus | null = null
  private loading = false
  /** Someone changed the plant while it was loading: load it once more after. */
  private stale = false
  private watering = false
  private inReach = false
  private destroyed = false

  constructor(target: Interactable, context: InteractionContext) {
    this.target = target
    this.context = context
    this.drawing = new SharedPlant(context.scene, target.x + target.width / 2, target.y + target.height)
    void this.load()
  }

  /** Loads the plant, or, if a load is under way, one more time after it. */
  async load() {
    if (this.loading) {
      this.stale = true
      return
    }
    this.loading = true
    try {
      do {
        this.stale = false
        const status = await this.context.plants.load()
        if (this.destroyed) return
        this.apply(status)
      } while (this.stale)
    } catch (error) {
      // The plant keeps its last look; walking up to it tries again.
      console.warn('Could not load the shared plant', error)
    } finally {
      this.loading = false
    }
  }

  async water() {
    const { bridge, net, plants } = this.context
    if (this.watering) return
    if (this.status && (this.status.bloomed || this.status.wateredByMe)) {
      void this.load()
      return
    }
    this.watering = true
    try {
      const status = await plants.water()
      if (this.destroyed) return
      this.apply(status)
      this.drawing.water()
      net.use(this.target.id)
    } catch (error) {
      bridge.state.notice = error instanceof Error ? error.message : 'Could not water the plant'
      void this.load()
    } finally {
      this.watering = false
    }
  }

  /** Someone else in the Room watered it. */
  observe() {
    this.drawing.water()
    void this.load()
  }

  update() {
    const inReach = this.context.bridge.state.prompt?.target === this.target.id
    if (inReach && !this.inReach) void this.load()
    this.inReach = inReach
  }

  destroy() {
    this.destroyed = true
    this.drawing.destroy()
    if (this.context.bridge.state.plant?.target === this.target.id) this.context.bridge.state.plant = null
  }

  private apply(status: PlantStatus) {
    this.status = status
    this.drawing.show({ stage: status.stage, stages: status.stages, species: status.species.id, drooping: status.drooping })
    this.target.label = status.bloomed ? 'In bloom' : status.wateredByMe ? 'Watered today' : undefined
    this.context.bridge.state.plant = { target: this.target.id, status }
  }
}

const keepers = new WeakMap<Interactable, PlantKeeper>()

export const plant: InteractionHandler = {
  label: 'Water the plant',
  setup(target, context) {
    const keeper = new PlantKeeper(target, context)
    keepers.set(target, keeper)
    return { update: () => keeper.update(), destroy: () => keeper.destroy() }
  },
  interact(target) {
    void keepers.get(target)?.water()
  },
  observe(target) {
    keepers.get(target)?.observe()
  },
}
