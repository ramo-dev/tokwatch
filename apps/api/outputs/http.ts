import type { PluginResult, MetricsResponse, Cumulative } from "../core/types"
import { getCumulative } from "../core/store"

let latestResults: PluginResult[] = []

export function updateResults(results: PluginResult[]) {
  latestResults = results
}

export function startHttpServer(port: number) {
  const server = Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url)
      
      if (url.pathname === "/metrics" || url.pathname === "/") {
        const cumulative = getCumulative()
        const response: MetricsResponse = {
          plugins: latestResults,
          cumulative,
          timestamp: new Date().toISOString(),
        }
        return new Response(JSON.stringify(response, null, 2), {
          headers: { "Content-Type": "application/json" },
        })
      }

      return new Response("Not Found", { status: 404 })
    },
  })

  console.log(`tokwatch HTTP server running at http://localhost:${server.port}`)
  return server
}
