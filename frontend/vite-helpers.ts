import path from 'path'
import { existsSync } from 'node:fs'
import type { Plugin, PluginOption } from 'vite'

interface LocalFrappeUIDevConfigParams {
  mode: string
  rootDir: string
}

interface LocalFrappeUIDevConfig {
  useLocalFrappeUI: boolean
  localFrappeUIPath: string
  localFrappeUIAliases: Record<string, string>
}

interface ResolveTiptapPluginParams {
  useLocalFrappeUI: boolean
  localFrappeUIPath: string
}

interface ImportFrappeUIPluginParams {
  useLocalFrappeUI: boolean
}

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
        'frappe-ui/tailwind': path.resolve(localFrappeUIPath, 'tailwind', 'index.js'),
        'frappe-ui/style.css': path.resolve(localFrappeUIPath, 'src', 'style.css'),
        'frappe-ui': localFrappeUIPath,
      }
    : {}

  return {
    useLocalFrappeUI,
    localFrappeUIPath,
    localFrappeUIAliases,
  }
}

export function createResolveTiptapPlugin({
  useLocalFrappeUI,
  localFrappeUIPath,
}: ResolveTiptapPluginParams): Plugin {
  return {
    name: 'resolve-tiptap',
    enforce: 'pre',
    async resolveId(source) {
      if (useLocalFrappeUI && source.startsWith('@tiptap')) {
        return this.resolve(source, path.join(localFrappeUIPath, 'package.json'), {
          skipSelf: true,
        })
      }
    },
  }
}

export async function importFrappeUIPlugin({
  useLocalFrappeUI,
}: ImportFrappeUIPluginParams): Promise<FrappeUIPluginFactory> {
  const npmModulePath = 'frappe-ui/vite'
  const modulePath = useLocalFrappeUI ? '../frappe-ui/vite/index.js' : npmModulePath

  try {
    const module = await loadFrappeUIPluginModule(modulePath)
    return module.default as FrappeUIPluginFactory
  } catch (error) {
    if (useLocalFrappeUI) {
      console.warn('⚠️  Failed to import local frappe-ui plugin, falling back to npm package')
      console.warn('   Error:', error instanceof Error ? error.message : String(error))
      const fallbackModule = await loadFrappeUIPluginModule(npmModulePath)
      return fallbackModule.default as FrappeUIPluginFactory
    }
    throw error
  }
}
