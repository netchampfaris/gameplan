import { Cat } from '../objects/Cat'
import type { Interactable } from '../world/interactables'
import type { InteractionContext, InteractionHandler, ObservedUse } from './registry'

/**
 * The cat that lives at a `pet` Interactable, which marks its bed. The Interactable
 * follows the cat around, so "Pet the cat" shows wherever it is. The cat has no body, so
 * it never blocks anyone.
 *
 * The cat in the Common Room is the team cat. The server keeps its name and its favourite
 * person (`gp_arcade_cat_day.py`): the name the team gave it replaces "the cat" in the
 * prompt, and a card shows who named it and who its favourite is. Like the shared plant,
 * it loads when the Room opens and again whenever the player walks up to it. A cat in a
 * Home is just a cat.
 */

export interface CatPerson {
  user: string
  fullName: string
}

export interface CatStatus {
  /** Null until someone names it; until then it is "the cat". */
  name: string | null
  namedBy: CatPerson | null
  /** The player named it today, so they can rename it again tomorrow. */
  namedToday: boolean
  /** Who petted it on the most days, or null before anyone has. */
  favourite: CatPerson | null
  /** The player's petting today already counted. */
  pettedToday: boolean
}

/** The server side of the team cat, for the player's local today. Rejects with a message for the player. */
export interface CatSource {
  load(): Promise<CatStatus>
  pet(): Promise<CatStatus>
  rename(name: string): Promise<CatStatus>
}

/**
 * What a `use` of the team cat carries, so the other games know what changed. A pet that
 * changed nothing on the server carries no value.
 */
const CatUse = {
  /** The first pet of the player's day: the favourite person may have changed. */
  counted: 1,
  /** Someone renamed the cat. */
  renamed: 2,
} as const

/** The player waits this long between pets; the server passes on one `use` a second. */
const PET_COOLDOWN_MS = 1200
let lastPetAt = 0

/** A cat while its Room is open, and for the team cat, what the server knows about it. */
class CatKeeper {
  private readonly target: Interactable
  private readonly context: InteractionContext
  private readonly cat: Cat
  /** The Common Room's cat, which the team names. */
  private readonly team: boolean
  private status: CatStatus | null = null
  private loading = false
  /** Someone changed the cat while it was loading: load it once more after. */
  private stale = false
  private counting = false
  private inReach = false
  private destroyed = false
  private readonly off: () => void

  constructor(target: Interactable, context: InteractionContext) {
    this.target = target
    this.context = context
    this.team = context.room === 'common'
    const bed = { x: target.x + target.width / 2, y: target.y + target.height - 6 }
    this.cat = new Cat(context.scene, context.map, bed, target.id, {
      seats: context.interactables.filter((candidate) => candidate.kind === 'seat'),
      people: () => context.people(),
      favourite: () => this.status?.favourite?.user ?? null,
    })
    this.follow()
    this.off = context.bridge.commands.on('cat', ({ target: id, status }) => {
      if (id !== this.target.id) return
      this.apply(status)
      context.net.use(this.target.id, CatUse.renamed)
    })
    if (this.team) void this.load()
  }

  /** Loads the team cat, or, if a load is under way, one more time after it. */
  async load() {
    if (!this.team) return
    if (this.loading) {
      this.stale = true
      return
    }
    this.loading = true
    try {
      do {
        this.stale = false
        const status = await this.context.cats.load()
        if (this.destroyed) return
        this.apply(status)
      } while (this.stale)
    } catch (error) {
      // The card keeps its last state; walking up to the cat tries again.
      console.warn('Could not load the cat', error)
    } finally {
      this.loading = false
    }
  }

  async pet() {
    const { player, net, cats } = this.context
    const now = Date.now()
    if (now - lastPetAt < PET_COOLDOWN_MS) return
    lastPetAt = now
    this.cat.pet()
    player.avatar.emote('heart')
    if (!this.team || this.status?.pettedToday || this.counting) {
      net.use(this.target.id)
      return
    }
    // The first pet of the day counts toward the favourite person.
    this.counting = true
    try {
      const status = await cats.pet()
      if (this.destroyed) return
      this.apply(status)
      net.use(this.target.id, CatUse.counted)
    } catch (error) {
      console.warn('Could not count the pet', error)
      net.use(this.target.id)
    } finally {
      this.counting = false
    }
  }

  observe({ actor, value }: ObservedUse) {
    if (value !== CatUse.renamed) {
      this.cat.pet()
      actor?.emote('heart')
    }
    if (value === CatUse.counted || value === CatUse.renamed) void this.load()
  }

  update() {
    this.cat.update(Date.now())
    this.follow()
    const inReach = this.context.bridge.state.prompt?.target === this.target.id
    if (inReach && !this.inReach) void this.load()
    this.inReach = inReach
  }

  destroy() {
    this.destroyed = true
    this.off()
    this.cat.destroy()
    if (this.context.bridge.state.cat?.target === this.target.id) this.context.bridge.state.cat = null
  }

  /** Moves the Interactable to the cat, so it can be petted where it is. */
  private follow() {
    // A cat napping on a seat gives way: out of everyone's reach, so "Sit" shows there,
    // and sitting down sends the cat off.
    if (this.cat.onSeat) {
      this.target.x = -Infinity
      return
    }
    const { x, y } = this.cat.position
    this.target.x = x - this.target.width / 2
    this.target.y = y + 6 - this.target.height
  }

  private apply(status: CatStatus) {
    this.status = status
    this.target.label = status.name ? `Pet ${status.name}` : undefined
    this.context.bridge.state.cat = { target: this.target.id, status }
  }
}

const keepers = new WeakMap<Interactable, CatKeeper>()

export const pet: InteractionHandler = {
  label: 'Pet the cat',
  setup(target, context) {
    const keeper = new CatKeeper(target, context)
    keepers.set(target, keeper)
    return { update: () => keeper.update(), destroy: () => keeper.destroy() }
  },
  interact(target) {
    void keepers.get(target)?.pet()
  },
  observe(target, use) {
    keepers.get(target)?.observe(use)
  },
}
