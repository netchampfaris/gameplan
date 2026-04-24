import path from 'path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { PluginOption } from 'vite'

interface ResolveFrappeUIPluginParams {
  mode: string
  rootDir: string
}

interface ResolvedFrappeUIPlugin {
  frappeui: FrappeUIPluginFactory
  aliases: Record<string, string>
}

type FrappeUIPluginFactory = (...args: any[]) => PluginOption
type FrappeUIPluginModule = { default: FrappeUIPluginFactory }

async function loadFrappeUIPluginModule(modulePath: string): Promise<FrappeUIPluginModule> {
  return (await import(modulePath)) as FrappeUIPluginModule
}

export async function resolveFrappeUIPlugin({
  mode,
  rootDir,
}: ResolveFrappeUIPluginParams): Promise<ResolvedFrappeUIPlugin> {
  const isDev = mode === 'development'
  const localFrappeUIPath = path.resolve(rootDir, '../frappe-ui')
  const hasLocalFrappeUI = existsSync(localFrappeUIPath)
  const useLocalFrappeUI = isDev && existsSync(path.join(localFrappeUIPath, 'node_modules'))

  if (isDev && hasLocalFrappeUI && !useLocalFrappeUI) {
    console.warn('⚠️  Local frappe-ui found but dependencies not installed.')
    console.warn('   Run: cd ../frappe-ui && yarn install')
  }

  const aliases: Record<string, string> = useLocalFrappeUI
    ? {
        'frappe-ui/style.css': path.resolve(localFrappeUIPath, 'src', 'style.css'),
        'frappe-ui': localFrappeUIPath,
      }
    : {}
  const npmModulePath = 'frappe-ui/vite'
  const modulePath = useLocalFrappeUI
    ? pathToFileURL(path.resolve(localFrappeUIPath, 'vite', 'index.js')).href
    : npmModulePath

  try {
    const module = await loadFrappeUIPluginModule(modulePath)
    return {
      frappeui: module.default as FrappeUIPluginFactory,
      aliases,
    }
  } catch (error) {
    if (useLocalFrappeUI) {
      console.warn('⚠️  Failed to import local frappe-ui plugin, falling back to npm package')
      console.warn('   Error:', error instanceof Error ? error.message : String(error))
      const fallbackModule = await loadFrappeUIPluginModule(npmModulePath)
      return {
        frappeui: fallbackModule.default as FrappeUIPluginFactory,
        aliases: {},
      }
    }
    throw error
  }
}
