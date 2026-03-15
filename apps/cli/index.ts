import { availablePlugins, loadConfig, getPluginsFromConfig } from "../api/core/config"
import { runPlugins } from "../api/core/runner"
import { getCumulative } from "../api/core/store"
import type { PluginResult, Cumulative } from "../api/core/types"

// ─── ANSI ────────────────────────────────────────────────────────────────────

const A = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    white: "\x1b[97m",
    cyan: "\x1b[96m",
    green: "\x1b[92m",
    yellow: "\x1b[93m",
    red: "\x1b[91m",
    magenta: "\x1b[95m",
    hide: "\x1b[?25l",
    show: "\x1b[?25h",
    home: "\x1b[H",
    clear: "\x1b[2J",
} as const

const c = (col: keyof typeof A, t: string) => `${A[col]}${t}${A.reset}`
const dim = (t: string) => `${A.dim}${t}${A.reset}`
const bold = (t: string) => `${A.bold}${t}${A.reset}`

// ─── SPINNER ─────────────────────────────────────────────────────────────────

const SPIN_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
let spinFrame = 0

function nextSpin(): string {
    return c("cyan", SPIN_FRAMES[spinFrame++ % SPIN_FRAMES.length]!)
}

// ─── FORMATTING ──────────────────────────────────────────────────────────────

function fmt(n: number): string {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B"
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M"
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
    return n.toString()
}

function fmtDelta(delta: number): string {
    if (delta === 0) return dim("  ──")
    if (delta > 0) return c("green", `↑ +${fmt(delta)}`)
    return c("red", `↓ ${fmt(delta)}`)
}

function fmtReset(date: Date): string {
    const diff = date.getTime() - Date.now()
    if (diff <= 0) return c("green", "resetting…")
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    return dim(h > 0 ? `resets in ${h}h ${m}m` : `resets in ${m}m`)
}

// ─── VISIBLE LENGTH ──────────────────────────────────────────────────────────

function vlen(s: string): number {
    return s.replace(/\x1b\[[0-9;]*m/g, "").length
}

function pad(s: string, width: number, align: "left" | "right" = "left"): string {
    const p = Math.max(0, width - vlen(s))
    return align === "right" ? " ".repeat(p) + s : s + " ".repeat(p)
}

// ─── SPARKLINE ───────────────────────────────────────────────────────────────

const SPARK = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const

function sparkline(hist: number[], width = 10): string {
    if (hist.length === 0) return " ".repeat(width)
    const slice = hist.slice(-width)
    const max = Math.max(...slice)
    const min = Math.min(...slice)
    const range = max - min || 1
    const bars = slice.map((v) => SPARK[Math.round(((v - min) / range) * 7)]!)
    return " ".repeat(width - bars.length) + c("cyan", bars.join(""))
}

// ─── GAUGE ───────────────────────────────────────────────────────────────────

const BAR_W = 16

function gauge(pct: number): string {
    const filled = Math.round((pct / 100) * BAR_W)
    const empty = BAR_W - filled
    const color: keyof typeof A = pct >= 90 ? "red" : pct >= 70 ? "yellow" : "green"
    const pctLabel = pct.toString().padStart(3) + "%"
    return (
        c(color, "█".repeat(filled)) +
        dim("░".repeat(empty)) +
        " " +
        (pct >= 90 ? c("red", bold(pctLabel)) : c(color, pctLabel))
    )
}

// ─── BOX DRAWING ─────────────────────────────────────────────────────────────

function termCols(): number {
    return Math.min(process.stdout.columns ?? 80, 100) - 2
}

function rule(left = "├", right = "┤", fill = "─", w = termCols()): string {
    return dim(left + fill.repeat(w) + right)
}

function row(content: string, w = termCols()): string {
    const p = Math.max(0, w - vlen(content) - 1)
    return dim("│") + " " + content + " ".repeat(p) + dim("│")
}

function blank(w = termCols()): string {
    return dim("│") + " ".repeat(w) + dim("│")
}

// ─── STATE ───────────────────────────────────────────────────────────────────

const prevUsed = new Map<string, number>()
const history = new Map<string, number[]>()

function updateHistory(plugin: string, used: number): void {
    const h = history.get(plugin) ?? []
    h.push(used)
    if (h.length > 40) h.shift()
    history.set(plugin, h)
}

// ─── FRAME BUILDER ───────────────────────────────────────────────────────────

function buildFrame(
    results: PluginResult[],
    cumulative: Cumulative[],
    isPolling: boolean,
    isHttp: boolean,
    port: number,
    error: string | null,
): string {
    const w = termCols()
    const now = new Date().toLocaleTimeString("en-US", {
        hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
    const lines: string[] = []

    // header
    lines.push(rule("┌", "┐", "─", w))
    lines.push(row(
        pad(`  ${bold(c("cyan", "tokwatch"))}  ${dim("token usage monitor")}`, w - 18) +
        (isPolling ? nextSpin() + "  " : "   ") +
        dim("updated ") + c("white", now),
        w,
    ))

    // error
    if (error) {
        lines.push(rule("├", "┤", "─", w))
        lines.push(row(`  ${c("red", bold("error"))}  ${c("red", error)}`, w))
        lines.push(row(`  ${dim("bun run index.ts --http")}`, w))
    }

    // http badge
    if (isHttp) {
        lines.push(rule("├", "┤", "─", w))
        lines.push(row(
            `  ${c("green", bold("http"))}  ${dim(`http://localhost:${port}/metrics`)}`,
            w,
        ))
    }

    // current usage
    lines.push(rule("├", "┤", "─", w))
    lines.push(row(`  ${bold(c("cyan", "current"))}  ${dim("this billing period")}`, w))
    lines.push(rule("├", "┤", "╌", w))
    lines.push(row(
        "  " +
        pad(dim("PLUGIN"), 16) +
        pad(dim("USED"), 10, "right") +
        "  " + pad(dim("DELTA"), 13) +
        "  " + pad(dim("TREND"), 11) +
        "  " + dim("USAGE"),
        w,
    ))
    lines.push(rule("├", "┤", "╌", w))

    if (results.length === 0) {
        lines.push(row(`  ${dim(isPolling ? "polling…" : "no plugins found")}`, w))
    } else {
        for (const r of results) {
            updateHistory(r.plugin, r.used)
            const prev = prevUsed.get(r.plugin) ?? r.used
            const delta = r.used - prev
            const pct = r.limit ? Math.round((r.used / r.limit) * 100) : null

            lines.push(row(
                "  " +
                pad(bold(r.plugin), 16) +
                pad(c("white", fmt(r.used)), 10, "right") +
                "  " + pad(fmtDelta(delta), 13) +
                "  " + pad(sparkline(history.get(r.plugin) ?? []), 11) +
                "  " + (pct !== null ? gauge(pct) : dim("no limit")),
                w,
            ))

            if (r.limit || r.resetAt) {
                const parts: string[] = []
                if (r.limit) parts.push(`${dim("limit")} ${c("white", fmt(r.limit))}`)
                if (r.remaining !== null) parts.push(`${dim("remaining")} ${c("cyan", fmt(r.remaining))}`)
                if (r.resetAt) parts.push(fmtReset(r.resetAt))
                lines.push(row("  " + " ".repeat(16) + "  " + parts.join("   "), w))
            }

            lines.push(blank(w))
        }
    }

    // cumulative
    if (cumulative.length > 0) {
        const total = cumulative.reduce((a, e) => a + e.total_used, 0)

        lines.push(rule("├", "┤", "─", w))
        lines.push(row(`  ${bold(c("magenta", "cumulative"))}  ${dim("all-time totals")}`, w))
        lines.push(rule("├", "┤", "╌", w))

        for (const entry of cumulative) {
            const share = total > 0 ? Math.round((entry.total_used / total) * 100) : 0
            const lastSeen = (() => {
                const d = new Date(entry.last_seen)
                return isNaN(d.getTime()) ? dim("unknown") : dim(
                    d.toLocaleString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit", hour12: false,
                    }),
                )
            })()

            lines.push(row(
                "  " +
                pad(bold(entry.plugin), 16) +
                pad(c("white", fmt(entry.total_used)), 10, "right") +
                "  " + gauge(share) +
                "  " + lastSeen,
                w,
            ))
            lines.push(blank(w))
        }

        lines.push(rule("├", "┤", "╌", w))
        lines.push(row(
            "  " +
            pad(dim("TOTAL"), 16) +
            pad(bold(c("white", fmt(total))), 10, "right"),
            w,
        ))
    }

    // footer
    lines.push(rule("└", "┘", "─", w))
    lines.push(
        "  " + dim("q") + " quit  ·  " + dim("r") + " refresh" +
        (isHttp ? "  ·  " + dim("serving /metrics") : ""),
    )

    return lines.join("\n")
}

// ─── POLL LOOP ───────────────────────────────────────────────────────────────

let isPolling = false
let lastResults: PluginResult[] = []
let lastCumulative: Cumulative[] = []
let lastError: string | null = null
let cfgHttp = false
let cfgPort = 7850

async function poll(): Promise<void> {
    isPolling = true
    try {
        const config = await loadConfig()
        const plugins = getPluginsFromConfig(config, availablePlugins.all)
        const results = await runPlugins(plugins)
        const cumulative = getCumulative()

        for (const r of results) {
            prevUsed.set(r.plugin, lastResults.find((p) => p.plugin === r.plugin)?.used ?? r.used)
        }

        lastResults = results
        lastCumulative = cumulative
        lastError = null
    } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
    } finally {
        isPolling = false
    }
}

function repaint(): void {
    process.stdout.write(
        A.home + buildFrame(lastResults, lastCumulative, isPolling, cfgHttp, cfgPort, lastError),
    )
}

// ─── INPUT ───────────────────────────────────────────────────────────────────

function setupInput(): void {
    if (!process.stdin.isTTY) return
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", async (key: string) => {
        if (key === "q" || key === "\x03") gracefulExit()
        if (key === "r") { await poll(); repaint() }
    })
}

function gracefulExit(): void {
    process.stdout.write(A.show + "\n  " + dim("bye.") + "\n\n")
    process.exit(0)
}

// ─── ARG PARSING ─────────────────────────────────────────────────────────────

interface CliArgs {
    http: boolean
    port: number
    interval: number
    once: boolean
    help: boolean
}

function parseArgs(argv: string[]): CliArgs {
    const args = argv.slice(2)
    const flag = (f: string) => args.includes(f)
    const param = (k: string, fb: string) =>
        args.find((a) => a.startsWith(`${k}=`))?.split("=")[1] ?? fb
    return {
        http: flag("--http"),
        port: parseInt(param("--port", "7850"), 10),
        interval: parseInt(param("--interval", "5000"), 10),
        once: flag("--once"),
        help: flag("--help") || flag("-h"),
    }
}

// ─── HELP ────────────────────────────────────────────────────────────────────

function printHelp(): void {
    console.log(`
  ${bold("tokwatch")}  ${dim("token usage monitor")}

  ${bold("usage")}
    bun run index.ts [options]

  ${bold("options")}
    ${c("cyan", "--http")}                    ${dim("start HTTP metrics server")}
    ${c("cyan", "--port=<n>")}                ${dim("HTTP server port  (default: 7850)")}
    ${c("cyan", "--interval=<ms>")}           ${dim("poll interval in ms  (default: 5000)")}
    ${c("cyan", "--once")}                    ${dim("render once and exit")}
    ${c("cyan", "--help, -h")}                ${dim("show this message")}
  `)
}

// ─── ENTRY ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const args = parseArgs(process.argv)

    if (args.help) { printHelp(); process.exit(0) }

    cfgHttp = args.http
    cfgPort = args.port

    if (args.http) {
        const { startHttpServer, updateResults } = await import("../api/outputs/http")
        startHttpServer(args.port)
        const httpPoll = async () => {
            const config = await loadConfig()
            const plugins = getPluginsFromConfig(config, availablePlugins.all)
            updateResults(await runPlugins(plugins))
        }
        await httpPoll()
        setInterval(httpPoll, args.interval)
    }

    process.stdout.write(A.clear + A.hide)
    process.on("SIGINT", gracefulExit)
    process.on("SIGTERM", gracefulExit)

    if (args.once) {
        await poll()
        process.stdout.write(
            buildFrame(lastResults, lastCumulative, false, false, 0, lastError) + "\n",
        )
        process.stdout.write(A.show)
        process.exit(0)
    }

    setupInput()

    await poll()
    repaint()

    // spinner animates at 100ms; data polls on its own interval
    setInterval(repaint, 100)
    setInterval(async () => { await poll(); repaint() }, args.interval)
}

main().catch((err) => {
    process.stdout.write(A.show)
    console.error(`\n  ${c("yellow", "error")}  ${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
})
