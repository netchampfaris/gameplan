import frappeUIPreset from 'frappe-ui/tailwind'
import containerQueries from '@tailwindcss/container-queries'
import plugin from 'tailwindcss/plugin'

export default {
  presets: [frappeUIPreset],
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    '../arcade/**/*.{vue,js,ts,jsx,tsx}',
    // Tailwind v3 ignores `content` declared in presets, so frappe-ui's source
    // must be scanned here for its components' utilities (notably the editor's
    // string-based lucide-* icon classes). One path covers both modes:
    // node_modules/frappe-ui is the published package, or a symlink to the
    // ../frappe-ui checkout under `yarn dev:local`.
    './node_modules/frappe-ui/src/**/*.{vue,js,ts,jsx,tsx}',
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
    },
  },
  plugins: [
    containerQueries,
    // `standalone` (PWA display mode) as a plugin variant, not a raw screen —
    // any non-min-width entry in `screens` disables Tailwind's max-* variants.
    plugin(({ addVariant }) => {
      addVariant('standalone', '@media (display-mode: standalone)')
    }),
  ],
}
