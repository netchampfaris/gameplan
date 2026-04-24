import { defineConfig, type PluginOption, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolveFrappeUIPlugin } from './vite-helpers'

export default defineConfig(async ({ mode }): Promise<UserConfig> => {
  const { frappeui, aliases: localFrappeUIAliases } = await resolveFrappeUIPlugin({
    mode,
    rootDir: __dirname,
  })

  const baseAliases = {
    '@': path.resolve(__dirname, 'src'),
  }

  return {
    define: {
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    plugins: [
      frappeui({
        frontendRoute: '/g',
        frappeTypes: {
          backend: 'frappe',
          site: 'gameplan.frappe.test',
        },
      }),
      vue(),
      vueJsx(),
      visualizer({ emitFile: true }) as PluginOption,
    ],
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        allow: ['..', 'node_modules', '../frappe-ui'],
      },
    },
    resolve: {
      alias: {
        ...localFrappeUIAliases,
        ...baseAliases,
      },
    },
    optimizeDeps: {
      include: ['feather-icons'],
    },
  }
})
