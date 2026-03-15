import type { TokenPlugin, PluginResult } from "./types"
import { saveSnapshot, updateCumulative } from "./store"

export async function runPlugins(
  plugins: TokenPlugin[],
  onResults?: (results: PluginResult[]) => void
): Promise<PluginResult[]> {
  const results: PluginResult[] = []

  await Promise.all(
    plugins.map(async (plugin) => {
      try {
        const result = await plugin.poll()
        results.push(result)
        saveSnapshot(result)
        if (result.used > 0) {
          updateCumulative(plugin.name, result.used)
        }
      } catch (error) {
        console.error(`Error polling plugin ${plugin.name}:`, error)
        results.push({
          plugin: plugin.name,
          used: 0,
          limit: null,
          remaining: null,
          resetAt: null,
          raw: { error: String(error) },
        })
      }
    })
  )

  if (onResults) {
    onResults(results)
  }

  return results
}

export function startPolling(
  plugins: TokenPlugin[],
  intervalMs: number,
  onResults: (results: PluginResult[]) => void
) {
  runPlugins(plugins, onResults)

  return setInterval(() => {
    runPlugins(plugins, onResults)
  }, intervalMs)
}
