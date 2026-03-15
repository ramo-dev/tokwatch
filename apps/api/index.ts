export * from "./core/types"
export * from "./core/store"
export * from "./core/runner"
export * from "./core/config"

export * from "./plugins/claude-code"
export * from "./plugins/opencode"
export * from "./plugins/ollama"
export * from "./plugins/cursor"
export * from "./plugins/antigravity"
export * from "./plugins/windsurf"
export * from "./plugins"

import { allPlugins, defaultPlugins } from "./plugins"

export const availablePlugins = {
  all: allPlugins,
  default: defaultPlugins,
}
