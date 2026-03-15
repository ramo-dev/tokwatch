import type { TokenPlugin, PluginResult } from "../core/types"

export const ollamaPlugin: TokenPlugin = {
  name: "ollama",
  async poll(): Promise<PluginResult> {
    try {
      const res = await fetch("http://localhost:11434/api/ps", {
        signal: AbortSignal.timeout(5000),
      })
      const data = await res.json() as { models?: Array<{ size?: number }> }

      const models = data.models || []
      const totalSize = models.reduce((acc: number, m) => acc + (m.size || 0), 0)

      return {
        plugin: "ollama",
        used: totalSize,
        limit: null,
        remaining: null,
        resetAt: null,
        raw: data,
      }
    } catch {
      return {
        plugin: "ollama",
        used: 0,
        limit: null,
        remaining: null,
        resetAt: null,
      }
    }
  },
}
