export type ProfileCardType = 'Text' | 'Image' | 'Blank'
export type ProfileCardSize = '1x1' | '2x1' | '2x2' | '4x1' | '4x2'
export type ProfileImageRendering = 'Cover' | 'Natural' | 'Fit'

export interface ProfileBentoCard {
  id: string
  type: ProfileCardType
  size: ProfileCardSize
  title: string
  text?: string
  url?: string
  image?: string
  imageRendering?: ProfileImageRendering
  imagePosition?: number
}

export const profileCardSizes: ProfileCardSize[] = ['1x1', '2x1', '2x2', '4x1', '4x2']
export const profileImageRenderingOptions: Array<{
  label: string
  value: ProfileImageRendering
}> = [
  { label: 'Cover', value: 'Cover' },
  { label: 'Natural', value: 'Natural' },
  { label: 'Fit', value: 'Fit' },
]
export const profileTextLimit = 140

export const profileCardTypeOptions: Array<{ type: ProfileCardType; label: string; icon: string }> =
  [
    { type: 'Text', label: 'Text', icon: 'lucide-text' },
    { type: 'Image', label: 'Image', icon: 'lucide-image' },
    { type: 'Blank', label: 'Blank', icon: 'lucide-square-dashed' },
  ]
