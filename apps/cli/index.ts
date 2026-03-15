import blessed from "blessed"
import { runPlugins } from "../api/core/runner"
import { startHttpServer, updateResults } from "../api/outputs/http"
import { availablePlugins, loadConfig, getPluginsFromConfig } from "../api/core/config"

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toString()
}

function createBar(value: number, max: number, width = 30): string {
  const len = Math.round((value / max) * width)
  return "█".repeat(len) + "░".repeat(width - len)
}

async function main() {
  const args = process.argv.slice(2)
  const port = parseInt(args.find(a => a.startsWith("--port="))?.split("=")[1] || "7842", 10)
  const interval = parseInt(args.find(a => a.startsWith("--interval="))?.split("=")[1] || "5000", 10)
  const httpMode = args.includes("--http")

  const config = await loadConfig()
  const plugins = getPluginsFromConfig(config, availablePlugins.all)

  if (httpMode) {
    startHttpServer(port)
    setInterval(() => runPlugins(plugins, updateResults), interval)
    console.log(`HTTP server running on port ${port}`)
    return
  }

  const screen = blessed.screen({ smartCSR: true, title: "TokWatch" })

  const container = blessed.box({
    top: "center",
    left: "center",
    width: "80%",
    height: "80%",
    border: { type: "line", fg: "cyan" },
    style: { border: { fg: "cyan" } }
  })

  const title = blessed.box({
    top: 0,
    left: "center",
    content: "{bold}{cyan}TOKWATCH{/cyan}{/bold}",
    tags: true
  })

  const currentBox = blessed.box({
    top: 3,
    left: 2,
    width: "45%",
    height: "70%",
    border: { type: "line", fg: "magenta" },
    title: "Current Usage"
  })

  const cumulativeBox = blessed.box({
    top: 3,
    right: 2,
    width: "45%",
    height: "70%",
    border: { type: "line", fg: "blue" },
    title: "Cumulative"
  })

  const helpBox = blessed.box({
    bottom: 0,
    left: "center",
    content: "{yellow}t{/yellow}: toggle | {yellow}r{/yellow}: refresh | {yellow}q{/yellow}: quit",
    tags: true
  })

  screen.append(container)
  container.append(title)
  container.append(currentBox)
  container.append(cumulativeBox)
  container.append(helpBox)

  let viewMode: "current" | "cumulative" = "current"

  const render = async () => {
    const results = await runPlugins(plugins)
    const { getCumulative } = await import("../api/core/store")
    const cumulative = getCumulative()

    const data = viewMode === "current" 
      ? results.map(p => ({ label: p.plugin, value: p.used }))
      : cumulative.map(c => ({ label: c.plugin, value: c.total_used }))

    const maxVal = Math.max(...data.map(d => d.value), 1)

    currentBox.setContent(
      data.map(d => 
        `{magenta}${d.label.padEnd(12)}{/magenta} ${createBar(d.value, maxVal)} {cyan}${formatNumber(d.value)}{/cyan}`
      ).join("\n")
    )

    cumulativeBox.setContent(
      cumulative.map(c => 
        `{blue}${c.plugin.padEnd(12)}{/blue} {green}${formatNumber(c.total_used)}{/green}`
      ).join("\n")
    )

    screen.render()
  }

  screen.key(["t"], () => {
    viewMode = viewMode === "current" ? "cumulative" : "current"
    render()
  })

  screen.key(["r"], () => {
    render()
  })

  screen.key(["q"], () => {
    process.exit(0)
  })

  await render()

  setInterval(render, 10000)
}

main()
