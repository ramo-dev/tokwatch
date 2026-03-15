import { readdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import type { TokenPlugin, PluginResult } from "../core/types"

export const windsurfPlugin: TokenPlugin = {
  name: "windsurf",
  async poll(): Promise<PluginResult> {
    const basePath = process.env.HOME || ""
    const windsurfPath = join(basePath, ".windsurf")
    
    try {
      if (!existsSync(windsurfPath)) {
        return {
          plugin: "windsurf",
          used: 0,
          limit: null,
          remaining: null,
          resetAt: null,
          raw: { error: "Windsurf not installed" },
        }
      }

      const projectsPath = join(windsurfPath, "projects")
      let projectCount = 0
      if (existsSync(projectsPath)) {
        const projects = await readdir(projectsPath)
        projectCount = projects.filter(p => !p.startsWith(".")).length
      }

      const extensionsPath = join(windsurfPath, "extensions")
      let extensionCount = 0
      if (existsSync(extensionsPath)) {
        const files = await readdir(extensionsPath)
        extensionCount = files.filter(f => !f.startsWith(".") && f !== ".obsolete").length
      }

      const activityScore = projectCount * 500 + extensionCount * 100

      return {
        plugin: "windsurf",
        used: activityScore,
        limit: null,
        remaining: null,
        resetAt: null,
        raw: { 
          projects: projectCount,
          extensions: extensionCount,
        },
      }
    } catch {
      return {
        plugin: "windsurf",
        used: 0,
        limit: null,
        remaining: null,
        resetAt: null,
      }
    }
  },
}
