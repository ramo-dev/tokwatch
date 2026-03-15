import { availablePlugins, loadConfig, getPluginsFromConfig } from "../api/core/config"
import { runPlugins } from "../api/core/runner"
import { getCumulative } from "../api/core/store"

function formatNumber(n: number): string {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B"
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
    return n.toString()
}

function createBar(value: number, max: number, width = 20): string {
    const len = max > 0 ? Math.round((value / max) * width) : 0
    return "█".repeat(Math.min(len, width)) + "░".repeat(Math.max(0, width - len))
}

async function render() {
    const config = await loadConfig()
    const plugins = getPluginsFromConfig(config, availablePlugins.all)

    const results = await runPlugins(plugins)
    const cumulative = getCumulative()

    console.clear()

    console.log("\n" + "═".repeat(60))
    console.log("  TOKWATCH - Token Monitor")
    console.log("═".repeat(60))

    console.log("\n📊 Current Usage:")
    console.log("─".repeat(40))

    const maxCurrent = Math.max(...results.map(p => p.used), 1)
    for (const p of results) {
        const bar = createBar(p.used, maxCurrent)
        console.log(`  ${p.plugin.padEnd(12)} ${bar} ${formatNumber(p.used).padStart(8)}`)
    }

    console.log("\n📈 Cumulative:")
    console.log("─".repeat(40))

    const maxCum = Math.max(...cumulative.map(c => c.total_used), 1)
    for (const c of cumulative) {
        const bar = createBar(c.total_used, maxCum)
        console.log(`  ${c.plugin.padEnd(12)} ${bar} ${formatNumber(c.total_used).padStart(8)}`)
    }

    console.log("\n" + "─".repeat(40))
    console.log(`  Total: ${formatNumber(cumulative.reduce((a, c) => a + c.total_used, 0))}`)
    console.log("─".repeat(40))
    console.log("\n  Press Ctrl+C to exit\n")
}

async function main() {
    const args = process.argv.slice(2)

    if (args.includes("--http")) {
        const port = parseInt(args.find(a => a.startsWith("--port="))?.split("=")[1] || "7850")
        const interval = parseInt(args.find(a => a.startsWith("--interval="))?.split("=")[1] || "5000")

        const { startHttpServer, updateResults } = await import("../api/outputs/http")
        const config = await loadConfig()
        const plugins = getPluginsFromConfig(config, availablePlugins.all)

        startHttpServer(port)

        // Run once immediately so HTTP server has data
        const initialResults = await runPlugins(plugins)
        updateResults(initialResults)

        setInterval(() => runPlugins(plugins, updateResults), interval)

        console.log(`HTTP server running on http://localhost:${port}/metrics`)
        console.log("Press Ctrl+C to stop\n")

        await render()

        setInterval(render, 10000)
    } else {
        await render()
    }
}

main().catch(console.error)
