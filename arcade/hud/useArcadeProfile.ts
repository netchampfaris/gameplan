import { useList } from 'frappe-ui'
import { computed } from 'vue'
import { defaultAppearance, toAppearance, type AvatarAppearance } from '../avatar/catalog'
import type { Home } from '../maps/home'

interface ArcadeProfileRow {
  name: string
  user: string
  /** A JSON field: the v2 list API sends it as a string. */
  appearance: string | AvatarAppearance | null
  /** Only written here, as JSON. Homes are read through `get_home`. */
  home?: string
  /** The Collection. Only the server adds rows (`grant_item`). */
  unlocks?: { item: string }[]
}

/**
 * The signed-in user's GP Arcade Profile: their saved look and Home, if any, and the
 * items they have unlocked.
 *
 * `appearance` is the saved look, or the user's deterministic default before they save
 * one. `hasSaved` tells the HUD whether this is a first visit. A profile can exist with
 * only a Home saved, so it is the look that counts.
 */
export function useArcadeProfile(user: string) {
  const list = useList<ArcadeProfileRow>({
    doctype: 'GP Arcade Profile',
    filters: { user },
    fields: ['name', 'user', 'appearance', { unlocks: ['item'] }],
    limit: 1,
  })

  const row = computed(() => list.data?.[0] ?? null)
  const fallback = defaultAppearance(user)

  const appearance = computed<AvatarAppearance>(() => {
    const saved = row.value?.appearance
    return toAppearance(typeof saved === 'string' ? parseJson(saved) : saved, fallback)
  })

  /** Ids of the lockable items this user has unlocked. */
  const unlocked = computed<ReadonlySet<string>>(() => new Set(row.value?.unlocks?.map((unlock) => unlock.item)))

  async function save(next: AvatarAppearance) {
    const value = JSON.stringify(next)
    if (row.value) await list.setValue.submit({ name: row.value.name, appearance: value })
    else await list.insert.submit({ user, appearance: value })
  }

  async function saveHome(home: Home) {
    const value = JSON.stringify(home)
    if (row.value) await list.setValue.submit({ name: row.value.name, home: value })
    else await list.insert.submit({ user, home: value })
  }

  return {
    appearance,
    hasSaved: computed(() => Boolean(row.value?.appearance)),
    isReady: computed(() => list.isFinished && list.data !== null),
    error: computed(() => list.error),
    isSaving: computed(() => list.setValue.loading || list.insert.loading),
    unlocked,
    reload: () => list.reload(),
    save,
    saveHome,
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
