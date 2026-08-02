// PROTOTYPE — throwaway. Answers: "what should the merged Profile + About page look like?"
//
// Synthesises the "bound card" idea client-side so the variants can be judged
// without touching the schema. A bound card reads its content from the profile
// doc at render time instead of storing a frozen copy the way the real
// `bento_cards` rows do today.
import type { ProfileBentoCard } from '@/components/ProfileBento/types'
import type { GPUserProfile } from '@/types/doctypes'

export type BoundField = 'cover_image' | 'image' | 'full_name' | 'bio' | 'readme'

export interface PrototypeCard extends ProfileBentoCard {
  /** Set when the card renders live profile data rather than stored card content. */
  bound?: BoundField
}

const boundCardIds = new Set(['cover', 'avatar', 'full-name', 'bio', 'about'])

/**
 * Build the default set of bound cards for a profile. Cards whose underlying
 * field is empty are dropped entirely — the real design question of "what does
 * a stranger see when the bio is blank" is answered by omission, not by a
 * "No bio yet." placeholder.
 */
export function getBoundCards(
  profile: GPUserProfile | null | undefined,
  options: { includeAbout?: boolean } = {},
): PrototypeCard[] {
  if (!profile) return []

  let cards: PrototypeCard[] = []

  if (profile.cover_image) {
    cards.push({
      id: 'cover',
      bound: 'cover_image',
      type: 'Card',
      size: '4x1',
      title: 'Cover',
      image: profile.cover_image,
      imageRendering: 'Cover',
      imagePosition: profile.cover_image_position ?? 50,
    })
  }

  if (profile.image) {
    cards.push({
      id: 'avatar',
      bound: 'image',
      type: 'Card',
      size: '1x1',
      title: 'Avatar',
      image: profile.image,
      imageRendering: 'Cover',
      imagePosition: 50,
    })
  }

  if (profile.full_name) {
    cards.push({
      id: 'full-name',
      bound: 'full_name',
      type: 'Card',
      size: '1x1',
      title: 'Name',
      text: profile.full_name,
    })
  }

  if (profile.bio) {
    cards.push({
      id: 'bio',
      bound: 'bio',
      type: 'Card',
      size: '2x1',
      title: 'Bio',
      text: profile.bio,
    })
  }

  if (options.includeAbout && profile.readme) {
    cards.push({
      id: 'about',
      bound: 'readme',
      type: 'Card',
      size: '4x2',
      title: 'About',
    })
  }

  return cards
}

/** Saved cards the author actually authored, i.e. everything that isn't a seeded bound card. */
export function getCustomCards(cards: ProfileBentoCard[]): PrototypeCard[] {
  return cards.filter((card) => !boundCardIds.has(card.id))
}

/**
 * Stand-in custom cards. Most profiles have none, so without these every variant
 * renders the same default page and the comparison says nothing about how
 * author-made cards sit next to bound ones.
 */
export function getSampleCustomCards(profile: GPUserProfile | null | undefined): PrototypeCard[] {
  return [
    {
      id: 'sample-now',
      type: 'Card',
      size: '2x1',
      title: 'Currently',
      text: 'Rebuilding the profile page. Reading Piranesi. Learning to make espresso.',
    },
    {
      id: 'sample-link',
      type: 'Card',
      size: '1x1',
      title: 'Website',
      text: 'netchampfaris.in',
      url: 'https://netchampfaris.in',
    },
    {
      id: 'sample-photo',
      type: 'Card',
      size: '1x2',
      title: 'Desk',
      image: profile?.cover_image || undefined,
      imageRendering: 'Cover',
      imagePosition: 40,
    },
    {
      id: 'sample-quote',
      type: 'Card',
      size: '2x1',
      title: 'Motto',
      text: 'Make it work, make it right, make it fast.',
    },
  ]
}
