import frappeUIPreset from 'frappe-ui/tailwind'
import localFrappeUIPreset from '../frappe-ui/tailwind/index.js'
import containerQueries from '@tailwindcss/container-queries'

function getFrappeUIPreset() {
  const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development'
  return isDev ? localFrappeUIPreset : frappeUIPreset
}

export default {
  presets: [getFrappeUIPreset()],
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}',
    '../node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}',
    '../frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '2rem',
        xl: '4rem',
        '2xl': '4rem',
      },
    },
    extend: {
      maxWidth: {
        'main-content': '768px',
      },
      screens: {
        standalone: {
          raw: '(display-mode: standalone)',
        },
      },
    },
  },
  plugins: [containerQueries],
}
