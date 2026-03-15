import { readFile, readdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import type { TokenPlugin, PluginResult } from "../core/types"

export const antigravityPlugin: TokenPlugin = {
  name: "antigravity",
  async poll(): Promise<PluginResult> {
    const basePath = process.env.HOME || ""
    const antigravityPath = join(basePath, ".antigravity/antigravity")
    
    try {
      if (!existsSync(antigravityPath)) {
        return {
          plugin: "antigravity",
          used: 0,
          limit: null,
          remaining: null,
          resetAt: null,
          raw: { error: "Antigravity not installed" },
        }
      }

      const binPath = join(antigravityPath, "bin")
      if (!existsSync(binPath)) {
        return {
          plugin: "antigravity",
          used: 0,
          limit: null,
          remaining: null,
          resetAt: null,
          raw: { error: "No bin directory found" },
        }
      }

      const files = await readdir(binPath)
      const binaryCount = files.filter(f => !f.startsWith(".")).length

      return {
        plugin: "antigravity",
        used: binaryCount * 100,
        limit: null,
        remaining: null,
        resetAt: null,
        raw: { binaries: binaryCount },
      }
    } catch {
      return {
        plugin: "antigravity",
        used: 0,
        limit: null,
        remaining: null,
        resetAt: null,
      }
    }
  },
}
