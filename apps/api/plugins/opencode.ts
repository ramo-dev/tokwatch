import { Database } from "bun:sqlite"
import { join } from "path"
import type { TokenPlugin, PluginResult } from "../core/types"

export const opencodePlugin: TokenPlugin = {
  name: "opencode",
  async poll(): Promise<PluginResult> {
    const dbPath = join(
      process.env.HOME || "",
      ".local/share/opencode/opencode.db"
    )

    try {
      const db = new Database(dbPath, { readonly: true })

      const result = db.query(`
        SELECT 
          SUM(json_extract(data, '$.tokens.input')) as input,
          SUM(json_extract(data, '$.tokens.output')) as output
        FROM message
      `).get() as { input: number | null; output: number | null } | null

      db.close()

      const input = result?.input || 0
      const output = result?.output || 0

      return {
        plugin: "opencode",
        used: input + output,
        limit: null,
        remaining: null,
        resetAt: null,
        raw: { input, output },
      }
    } catch {
      return {
        plugin: "opencode",
        used: 0,
        limit: null,
        remaining: null,
        resetAt: null,
      }
    }
  },
}
