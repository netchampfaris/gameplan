import type { AvatarAppearance } from '../avatar/catalog'
import { PartyCorner } from '../objects/PartyCorner'
import type { Interactable } from '../world/interactables'
import type { InteractionContext, InteractionHandler } from './registry'

/**
 * The party corner in the Common Room. On a player's birthday or work anniversary (the
 * dates they chose to share, `GP Arcade Profile.set_dates`) the table there gets a cake
 * and balloons, with a line for each celebrant. Anyone can add one candle to each
 * celebration; the server keeps the candles (`gp_arcade_candle.py`).
 *
 * Like the shared plant, the party loads when the Room opens and again whenever the
 * player walks up to it. Adding a candle tells the Room, and their games load it again,
 * so a new candle appears on everyone's cake. On a day with no celebration the table is
 * a plain table with no prompt.
 */

export type Occasion = 'birthday' | 'anniversary'

export interface CandleGiver {
  user: string
  fullName: string
  appearance: AvatarAppearance
  addedAt: string
}

export interface Celebration {
  celebrant: string
  fullName: string
  occasion: Occasion
  /** The years of a work anniversary, when the celebrant gave a start year. */
  years: number | null
  candles: number
  /** The player added a candle. */
  candled: boolean
  /** Who added candles, oldest first. Only the celebrant gets this; others get []. */
  candlesFrom: CandleGiver[]
}

/** The server side of the party corner, for the player's local today. Rejects with a message for the player. */
export interface CelebrationSource {
  load(): Promise<Celebration[]>
  addCandle(celebration: Celebration): Promise<Celebration[]>
}

/** What the party corner says for a celebration, e.g. "Happy birthday, Arcade Two!". */
export function celebrationTitle({ occasion, fullName, years }: Celebration): string {
  if (occasion === 'birthday') return `Happy birthday, ${fullName}!`
  if (years) return `${years} ${years === 1 ? 'year' : 'years'} on the team for ${fullName}!`
  return `Happy work anniversary, ${fullName}!`
}

/** The party corner while its Room is open. */
class PartyKeeper {
  private readonly target: Interactable
  private readonly context: InteractionContext
  private readonly drawing: PartyCorner
  private celebrations: Celebration[] = []
  private loading = false
  /** Someone added a candle while the party was loading: load it once more after. */
  private stale = false
  private adding = false
  private inReach = false
  private destroyed = false

  constructor(target: Interactable, context: InteractionContext) {
    this.target = target
    this.context = context
    this.drawing = new PartyCorner(context.scene, target)
    // No prompt until the party has loaded and there is something to celebrate.
    this.target.label = ''
    void this.load()
  }

  /** Loads the party, or, if a load is under way, one more time after it. */
  async load() {
    if (this.loading) {
      this.stale = true
      return
    }
    this.loading = true
    try {
      do {
        this.stale = false
        const celebrations = await this.context.celebrations.load()
        if (this.destroyed) return
        this.apply(celebrations)
      } while (this.stale)
    } catch (error) {
      // The corner keeps its last look; walking up to it tries again.
      console.warn('Could not load the party corner', error)
    } finally {
      this.loading = false
    }
  }

  /** Adds the player's candle to every celebration they have not added one to yet. */
  async addCandles() {
    const { bridge, net, celebrations: source } = this.context
    const open = this.celebrations.filter((celebration) => !celebration.candled)
    if (this.adding) return
    if (!open.length) {
      void this.load()
      return
    }
    this.adding = true
    try {
      for (const celebration of open) {
        const celebrations = await source.addCandle(celebration)
        if (this.destroyed) return
        this.apply(celebrations)
      }
      net.use(this.target.id)
    } catch (error) {
      bridge.state.notice = error instanceof Error ? error.message : 'Could not add a candle'
      void this.load()
    } finally {
      this.adding = false
    }
  }

  update() {
    const inReach = this.context.bridge.state.prompt?.target === this.target.id
    if (inReach && !this.inReach) void this.load()
    this.inReach = inReach
  }

  destroy() {
    this.destroyed = true
    this.drawing.destroy()
    if (this.context.bridge.state.party?.target === this.target.id) this.context.bridge.state.party = null
  }

  private apply(celebrations: Celebration[]) {
    this.celebrations = celebrations
    this.drawing.show({
      titles: celebrations.map(celebrationTitle),
      candles: celebrations.reduce((total, celebration) => total + celebration.candles, 0),
    })
    const open = celebrations.filter((celebration) => !celebration.candled).length
    // An empty label hides the prompt: most days the table is just a table.
    this.target.label = !celebrations.length ? '' : !open ? 'Candle added' : open > 1 ? 'Add candles' : 'Add a candle'
    this.context.bridge.state.party = celebrations.length ? { target: this.target.id, celebrations } : null
  }
}

const keepers = new WeakMap<Interactable, PartyKeeper>()

export const party: InteractionHandler = {
  label: 'Add a candle',
  setup(target, context) {
    const keeper = new PartyKeeper(target, context)
    keepers.set(target, keeper)
    return { update: () => keeper.update(), destroy: () => keeper.destroy() }
  },
  interact(target) {
    void keepers.get(target)?.addCandles()
  },
  /** Someone else in the Room added a candle. */
  observe(target) {
    void keepers.get(target)?.load()
  },
}
