import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'path'
import { existsSync } from 'node:fs'
import { visualizer } from 'rollup-plugin-visualizer'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(async ({ mode }) => {
  const isDev = mode === 'development'

  // Setup local frappe-ui for development
  const localFrappeUIPath = path.resolve(__dirname, '../frappe-ui')
  const useLocalFrappeUI = isDev && existsSync(path.join(localFrappeUIPath, 'node_modules'))

  if (isDev && existsSync(localFrappeUIPath) && !useLocalFrappeUI) {
    console.warn('⚠️  Local frappe-ui found but dependencies not installed.')
    console.warn('   Run: cd ../frappe-ui && yarn install')
  }

  const frappeui = await importFrappeUIPlugin(useLocalFrappeUI)

  // Base aliases shared across all modes
  const baseAliases = {
    '@': path.resolve(__dirname, 'src'),
    // 'tailwind.config.js': path.resolve(__dirname, 'tailwind.config.js'),
  }

  // Local frappe-ui aliases for development
  const localFrappeUIAliases = useLocalFrappeUI
    ? {
        // CSS alias must come before general alias for proper resolution
        'frappe-ui/style.css': path.resolve(localFrappeUIPath, 'src', 'style.css'),
        'frappe-ui/tailwind/v4.css': path.resolve(localFrappeUIPath, 'tailwind', 'v4.css'),
        'frappe-ui': localFrappeUIPath,
      }
    : {}

  return {
    define: {
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    plugins: [
      tailwindcss(),
      frappeui({
        frappeProxy: true,
        lucideIcons: true,
        jinjaBootData: true,
        frappeTypes: {
          input: {
            gameplan: [
              'gp_project',
              'gp_member',
              'gp_team',
              'gp_comment',
              'gp_discussion',
              'gp_page',
              'gp_task',
              'gp_poll',
              'gp_guest_access',
              'gp_invitation',
              'gp_user_profile',
              'gp_notification',
              'gp_activity',
              'gp_search_feedback',
              'gp_draft',
              'gp_tag',
              'gp_pinned_project',
            ],
          },
        },
        buildConfig: {
          indexHtmlPath: '../gameplan/www/g.html',
        },
      }),
      {
        name: 'resolve-tiptap',
        enforce: 'pre',
        async resolveId(source) {
          if (useLocalFrappeUI && source.startsWith('@tiptap')) {
            return this.resolve(source, path.join(localFrappeUIPath, 'package.json'), {
              skipSelf: true,
            })
          }
        },
      },
      vue(),
      vueJsx(),
      visualizer({ emitFile: true }),
    ],
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        allow: [
          // Allow serving files from project root, node_modules, and frappe-ui. To fix the error:
          // The request url "~/frappe-bench/apps/gameplan/frappe-ui/src/fonts/Inter/Inter-Medium.woff2" is outside of Vite serving allow list.
          '..',
          'node_modules',
          '../frappe-ui',
        ],
      },
    },
    resolve: {
      alias: {
        ...localFrappeUIAliases,
        ...baseAliases,
      },
    },
    optimizeDeps: {
      include: ['feather-icons', 'tailwind.config.js'],
    },
  }
})

/**
 * Import frappe-ui Vite plugin from local copy or npm package
 */
async function importFrappeUIPlugin(useLocal) {
  const modulePath = useLocal ? '../frappe-ui/vite/index.js' : 'frappe-ui/vite'

  try {
    return (await import(modulePath)).default
  } catch (error) {
    if (useLocal) {
      console.warn('⚠️  Failed to import local frappe-ui plugin, falling back to npm package')
      console.warn('   Error:', error.message)
      return (await import('frappe-ui/vite')).default
    }
    throw error
  }
}
