import { readFile, writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"
import type { TokenPlugin } from "./types"
import { allPlugins, defaultPlugins } from "../plugins"

export const availablePlugins = {
  all: allPlugins,
  default: defaultPlugins,
}

export interface TokWatchConfig {
  plugins: string[]
  defaultPlugins: string[]
  theme: "dark" | "light"
  output: "terminal" | "http"
  interval: number
  port: number
  showAll: boolean
}

const defaultConfig: TokWatchConfig = {
  plugins: ["claude-code", "opencode", "ollama", "cursor", "antigravity", "windsurf"],
  defaultPlugins: ["claude-code", "opencode", "ollama"],
  theme: "dark",
  output: "terminal",
  interval: 60000,
  port: 7842,
  showAll: false,
}

const configPath = join(process.env.HOME || "", ".config/tokwatch/config.json")

export async function loadConfig(): Promise<TokWatchConfig> {
  try {
    if (existsSync(configPath)) {
      const content = await readFile(configPath, "utf-8")
      return { ...defaultConfig, ...JSON.parse(content) }
    }
  } catch {}
  return defaultConfig
}

export async function saveConfig(config: Partial<TokWatchConfig>): Promise<TokWatchConfig> {
  const current = await loadConfig()
  const updated = { ...current, ...config }
  
  const configDir = join(process.env.HOME || "", ".config/tokwatch")
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true })
  }
  
  await writeFile(configPath, JSON.stringify(updated, null, 2))
  return updated
}

export function getPluginByName(name: string, availablePlugins: TokenPlugin[]): TokenPlugin | undefined {
  return availablePlugins.find(p => p.name === name)
}

export function getPluginsFromConfig(config: TokWatchConfig, availablePlugins: TokenPlugin[]): TokenPlugin[] {
  if (config.showAll) {
    return availablePlugins
  }
  return config.defaultPlugins
    .map(name => getPluginByName(name, availablePlugins))
    .filter((p): p is TokenPlugin => p !== undefined)
}
