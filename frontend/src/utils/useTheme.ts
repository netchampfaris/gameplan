import { onMounted, ref, type Ref } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

const currentTheme: Ref<Theme> = ref('light')
let isInitialized = false

const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (theme: Theme): void => {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.setAttribute('data-theme', resolvedTheme)
}

const handleSystemThemeChange = () => {
  if (currentTheme.value === 'system') {
    applyTheme('system')
  }
}

const initializeTheme = (): void => {
  if (isInitialized) return

  const storedTheme = localStorage.getItem('theme') as Theme | null
  currentTheme.value =
    storedTheme && ['light', 'dark', 'system'].includes(storedTheme) ? storedTheme : 'system'
  applyTheme(currentTheme.value)

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', handleSystemThemeChange)
  isInitialized = true
}

const setTheme = (theme: Theme): void => {
  currentTheme.value = theme
  applyTheme(theme)
  localStorage.setItem('theme', theme)
}

export function useTheme() {
  const toggleTheme = (): void => {
    const theme: Theme = currentTheme.value === 'dark' ? 'light' : 'dark'
    setTheme(theme)
  }

  onMounted(() => {
    initializeTheme()
  })

  return {
    currentTheme,
    toggleTheme,
    setTheme,
    initializeTheme,
    getSystemTheme,
  }
}
