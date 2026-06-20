import { computed, useTemplateRef } from 'vue'
import { useElementBounding, useElementSize } from '@vueuse/core'
import { activeCommunities } from '@/data/communities'
import type { Community } from '@/data/communities'
import { communityState } from '@/data/communityState'

// Fallback before the rail has been measured (SSR / first paint).
const DEFAULT_SLOT_COUNT = 5

// Layout constants, in px, matching the Tailwind classes on the rail.
const COMMUNITY_ITEM_HEIGHT = 28 // size-7
const COMMUNITY_GAP = 12 // gap-3
const COMMUNITY_ITEM_PITCH = COMMUNITY_ITEM_HEIGHT + COMMUNITY_GAP
// Chrome inside the community list that isn't a community button: the top
// border (1) + pt-3 (12) + the always-present "more" trigger (28).
const COMMUNITY_LIST_CHROME = 1 + 12 + COMMUNITY_ITEM_HEIGHT
// Chrome wrapping the main-shortcuts block above its measured content height:
// mt-3 (12) + top border (1) + pt-3 (12).
const MAIN_SHORTCUTS_CHROME = 12 + 1 + 12

/**
 * Pick the communities to render in the rail's fixed slots.
 *
 * The list is sorted, so a community that sorts beyond the available slots
 * would never appear in the rail (only in the overflow combobox). To keep the
 * active community visible, the window slides forward so it ends on the active
 * community — hiding the necessary number of leading communities.
 */
export function selectVisibleCommunities(
  communities: Community[],
  slotCount: number,
  activeName: string | null,
): Community[] {
  if (communities.length <= slotCount) {
    return communities
  }

  const activeIndex = communities.findIndex((community) => community.name === activeName)
  if (activeIndex < slotCount) {
    return communities.slice(0, slotCount)
  }

  return communities.slice(activeIndex - slotCount + 1, activeIndex + 1)
}

/**
 * Measures the rail to decide how many community buttons physically fit, and
 * derives the visible window from that. Expects the consuming component's
 * template to expose three refs: `communityListEl`, `mainShortcutsEl`, and
 * `bottomGroupEl`.
 *
 * The slot count is derived from two *stable* anchors — the top of the
 * community list and the top of the bottom-pinned shortcuts — neither of which
 * moves when the community count changes, so the measurement can't feed back
 * into a ResizeObserver loop.
 */
export function useCommunitySlots() {
  const communityListEl = useTemplateRef<HTMLElement>('communityListEl')
  const mainShortcutsEl = useTemplateRef<HTMLElement>('mainShortcutsEl')
  const bottomGroupEl = useTemplateRef<HTMLElement>('bottomGroupEl')

  const { top: communityListTop } = useElementBounding(communityListEl)
  const { top: bottomGroupTop } = useElementBounding(bottomGroupEl)
  const { height: mainShortcutsHeight } = useElementSize(mainShortcutsEl)

  const slotCount = computed(() => {
    const top = communityListTop.value
    const bottom = bottomGroupTop.value
    if (!top || !bottom || bottom <= top) return DEFAULT_SLOT_COUNT

    const mainBlock = MAIN_SHORTCUTS_CHROME + mainShortcutsHeight.value
    const availableForList = bottom - top - mainBlock
    const slots = Math.floor((availableForList - COMMUNITY_LIST_CHROME) / COMMUNITY_ITEM_PITCH)
    return Math.max(1, slots)
  })

  const visibleCommunities = computed(() =>
    selectVisibleCommunities(activeCommunities.value, slotCount.value, communityState.id),
  )

  return { slotCount, visibleCommunities }
}
