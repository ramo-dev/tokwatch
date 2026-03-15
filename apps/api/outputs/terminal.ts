import type { PluginResult } from "../core/types"

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toString()
}

export function renderTerminal(results: PluginResult[]) {
  console.clear()
  console.log("┌─ tokwatch ──────────────────────────────┐")
  for (const r of results) {
    const pct = r.limit ? Math.round((r.used / r.limit) * 100) : null
    const bar = pct ? `[${"█".repeat(Math.min(pct / 5, 20))}${" ".repeat(Math.max(0, 20 - pct / 5))}]` : ""
    console.log(`│ ${r.plugin.padEnd(14)} ${formatNumber(r.used).padStart(10)} ${pct !== null ? bar + " " + pct + "%" : "∞"}`)
    if (r.resetAt) console.log(`│   resets: ${r.resetAt.toLocaleString()}`)
  }
  console.log("└────────────────────────────────────────┘")
}

export function renderCumulative(results: PluginResult[], cumulative: Array<{ plugin: string; total_used: number }>) {
  console.log("\n┌─ cumulative ──────────────────────────────┐")
  for (const c of cumulative) {
    console.log(`│ ${c.plugin.padEnd(14)} ${formatNumber(c.total_used).padStart(10)}`)
  }
  console.log("└────────────────────────────────────────┘")
}
