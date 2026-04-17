import path from 'path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { normalizePath, type PluginOption } from 'vite'

interface LocalFrappeUIDevConfigParams {
  mode: string
  rootDir: string
}

interface LocalFrappeUIDevConfig {
  useLocalFrappeUI: boolean
  localFrappeUIPath: string
  localFrappeUIAliases: Record<string, string>
}

interface ImportFrappeUIPluginParams {
  useLocalFrappeUI: boolean
  localFrappeUIPath: string
}

export const LOCAL_FRAPPE_UI_DEDUPE_DEPS = [
  'vue',
  'vue-router',
  '@tiptap/core',
  '@tiptap/extension-code',
  '@tiptap/extension-code-block-lowlight',
  '@tiptap/extension-heading',
  '@tiptap/extension-link',
  '@tiptap/extension-list',
  '@tiptap/extension-table',
  '@tiptap/extension-text-align',
  '@tiptap/extension-text-style',
  '@tiptap/extension-typography',
  '@tiptap/extensions',
  '@tiptap/pm',
  '@tiptap/starter-kit',
  '@tiptap/suggestion',
  '@tiptap/vue-3',
]

type FrappeUIPluginFactory = (...args: any[]) => PluginOption
type FrappeUIPluginModule = { default: FrappeUIPluginFactory }

async function loadFrappeUIPluginModule(modulePath: string): Promise<FrappeUIPluginModule> {
  return (await import(modulePath)) as FrappeUIPluginModule
}

export function getLocalFrappeUIDevConfig({
  mode,
  rootDir,
}: LocalFrappeUIDevConfigParams): LocalFrappeUIDevConfig {
  const isDev = mode === 'development'
  const localFrappeUIPath = path.resolve(rootDir, '../frappe-ui')
  const useLocalFrappeUI = isDev && existsSync(path.join(localFrappeUIPath, 'node_modules'))

  if (isDev && existsSync(localFrappeUIPath) && !useLocalFrappeUI) {
    console.warn('⚠️  Local frappe-ui found but dependencies not installed.')
    console.warn('   Run: cd ../frappe-ui && yarn install')
  }

  const localFrappeUIAliases: Record<string, string> = useLocalFrappeUI
    ? {
        'frappe-ui/style.css': path.resolve(localFrappeUIPath, 'src', 'style.css'),
        'frappe-ui/icons': path.resolve(localFrappeUIPath, 'icons', 'index.ts'),
        'frappe-ui/tailwind': path.resolve(localFrappeUIPath, 'tailwind', 'index.js'),
        'frappe-ui/frappe': path.resolve(localFrappeUIPath, 'frappe', 'index.js'),
        'frappe-ui/drive': path.resolve(localFrappeUIPath, 'frappe', 'drive', 'index.js'),
        'frappe-ui/vite': path.resolve(localFrappeUIPath, 'vite', 'index.js'),
        'frappe-ui': path.resolve(localFrappeUIPath, 'src', 'index.ts'),
      }
    : {}

  return {
    useLocalFrappeUI,
    localFrappeUIPath,
    localFrappeUIAliases,
  }
}

export async function importFrappeUIPlugin({
  useLocalFrappeUI,
  localFrappeUIPath,
}: ImportFrappeUIPluginParams): Promise<FrappeUIPluginFactory> {
  const npmModulePath = 'frappe-ui/vite'
  const localModulePath = pathToFileURL(
    path.join(localFrappeUIPath, 'vite', 'index.js'),
  ).href
  const modulePath = useLocalFrappeUI ? localModulePath : npmModulePath

  try {
    const module = await loadFrappeUIPluginModule(modulePath)
    if (useLocalFrappeUI) {
      console.info(`ℹ️  Using local frappe-ui vite plugin: ${localModulePath}`)
    }
    return module.default as FrappeUIPluginFactory
  } catch (error) {
    if (useLocalFrappeUI) {
      console.warn('⚠️  Failed to import local frappe-ui plugin, falling back to npm package')
      console.warn('   Tried:', localModulePath)
      console.warn('   Error:', error instanceof Error ? error.message : String(error))
      const fallbackModule = await loadFrappeUIPluginModule(npmModulePath)
      return fallbackModule.default as FrappeUIPluginFactory
    }
    throw error
  }
}

export function localFrappeUIWatchPlugin(localFrappeUIPath: string): PluginOption {
  const localRoot = normalizePath(localFrappeUIPath)
  const localViteRoot = `${localRoot}/vite/`
  const localPackageJson = `${localRoot}/package.json`

  return {
    name: 'gameplan-local-frappe-ui-watch',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(localRoot)

      const handleChange = async (file: string) => {
        const normalizedFile = normalizePath(file)
        if (!normalizedFile.startsWith(localRoot)) return

        if (
          normalizedFile === localPackageJson ||
          normalizedFile.startsWith(localViteRoot)
        ) {
          server.config.logger.info(
            `\n↻ restarting dev server because local frappe-ui config changed: ${normalizedFile}`,
            { clear: false },
          )
          await server.restart()
          return
        }

        server.config.logger.info(
          `\n↻ reloading app because local frappe-ui changed: ${normalizedFile}`,
          { clear: false },
        )
        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('change', handleChange)
      server.watcher.on('add', handleChange)
      server.watcher.on('unlink', handleChange)
    },
  }
}
