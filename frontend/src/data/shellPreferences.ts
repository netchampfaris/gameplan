import { useLocalStorage } from '@vueuse/core'

export type ShellIconStyle = 'category' | 'logo'

// Where the category icon vs. product logo lives in the shell:
//  - 'category': category icon at top of rail; sidebar header shows title only.
//  - 'logo':     product logo at top of rail; sidebar header shows category icon + title.
export const shellIconStyle = useLocalStorage<ShellIconStyle>(
  'gameplan:shellIconStyle',
  'category',
)

export function toggleShellIconStyle() {
  shellIconStyle.value = shellIconStyle.value === 'category' ? 'logo' : 'category'
}
