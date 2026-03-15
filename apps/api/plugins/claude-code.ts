import { readFile } from "fs/promises"
import { join } from "path"
import type { TokenPlugin, PluginResult } from "../core/types"

export const claudeCodePlugin: TokenPlugin = {
  name: "claude-code",
  async poll(): Promise<PluginResult> {
    const usagePath = join(process.env.HOME || "", ".claude", "stats-cache.json")
    try {
      const raw = await readFile(usagePath, "utf-8")
      const data = JSON.parse(raw)

      let totalInput = 0
      let totalOutput = 0

      if (data.modelUsage) {
        for (const model of Object.values(data.modelUsage) as any[]) {
          totalInput += model.inputTokens || 0
          totalOutput += model.outputTokens || 0
        }
      }

      const used = totalInput + totalOutput
      const lastDate = data.dailyModelTokens?.[data.dailyModelTokens.length - 1]?.date

      return {
        plugin: "claude-code",
        used,
        limit: null,
        remaining: null,
        resetAt: lastDate ? new Date(lastDate + "T00:00:00Z") : null,
        raw: data,
      }
    } catch {
      return {
        plugin: "claude-code",
        used: 0,
        limit: null,
        remaining: null,
        resetAt: null,
      }
    }
  },
}
