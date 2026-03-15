export { claudeCodePlugin } from "./claude-code"
export { opencodePlugin } from "./opencode"
export { ollamaPlugin } from "./ollama"
export { cursorPlugin } from "./cursor"
export { antigravityPlugin } from "./antigravity"
export { windsurfPlugin } from "./windsurf"

import type { TokenPlugin } from "../core/types"

export const allPlugins: TokenPlugin[] = [
  require("./claude-code").claudeCodePlugin,
  require("./opencode").opencodePlugin,
  require("./ollama").ollamaPlugin,
  require("./cursor").cursorPlugin,
  require("./antigravity").antigravityPlugin,
  require("./windsurf").windsurfPlugin,
]

export const defaultPlugins: TokenPlugin[] = [
  require("./claude-code").claudeCodePlugin,
  require("./opencode").opencodePlugin,
  require("./ollama").ollamaPlugin,
]
