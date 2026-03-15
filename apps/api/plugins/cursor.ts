import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import type { TokenPlugin, PluginResult } from "../core/types"

export const cursorPlugin: TokenPlugin = {
  name: "cursor",
  async poll(): Promise<PluginResult> {
    const basePath = process.env.HOME || ""
    const dbPath = join(basePath, ".cursor/ai-tracking/ai-code-tracking.db")
    
    try {
      if (!existsSync(dbPath)) {
        return {
          plugin: "cursor",
          used: 0,
          limit: null,
          remaining: null,
          resetAt: null,
          raw: { error: "No tracking database found" },
        }
      }

      const { Database } = await import("bun:sqlite")
      const db = new Database(dbPath, { readonly: true })
      
      const conversations = db.query(
        `SELECT COUNT(*) as count FROM conversation_summaries`
      ).get() as { count: number } | null
      
      const files = db.query(
        `SELECT COUNT(*) as count FROM ai_code_hashes`
      ).get() as { count: number } | null
      
      db.close()

      const activityScore = (conversations?.count || 0) * 1000 + (files?.count || 0)

      return {
        plugin: "cursor",
        used: activityScore,
        limit: null,
        remaining: null,
        resetAt: null,
        raw: { 
          conversations: conversations?.count || 0,
          filesTracked: files?.count || 0,
        },
      }
    } catch {
      return {
        plugin: "cursor",
        used: 0,
        limit: null,
        remaining: null,
        resetAt: null,
      }
    }
  },
}
