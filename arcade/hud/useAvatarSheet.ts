import { shallowRef, watch, type Ref } from 'vue'
import type { AvatarAppearance } from '../avatar/catalog'
import { composeAvatarSheet } from '../avatar/compositor'

/** The composite sheet for an appearance, kept current as the appearance changes. */
export function useAvatarSheet(appearance: () => AvatarAppearance): Ref<HTMLCanvasElement | null> {
  const sheet = shallowRef<HTMLCanvasElement | null>(null)
  let request = 0
  watch(
    appearance,
    (value) => {
      const current = ++request
      composeAvatarSheet(value)
        .then((composed) => {
          // Only the newest look may land, however the requests finish.
          if (current === request) sheet.value = composed
        })
        .catch((error: unknown) => console.error(error))
    },
    { immediate: true, deep: true },
  )
  return sheet
}
