import type { PluginResult, Cumulative } from "../core/types"

// ─── ANSI ────────────────────────────────────────────────────────────────────

const A = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    // fg
    white: "\x1b[97m",
    gray: "\x1b[90m",
    cyan: "\x1b[96m",
    green: "\x1b[92m",
    yellow: "\x1b[93m",
    red: "\x1b[91m",
    blue: "\x1b[94m",
    magenta: "\x1b[95m",
    // bg
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgRed: "\x1b[41m",
} as const

const c = (color: keyof typeof A, text: string) =>
    `${A[color]}${text}${A.reset}`

const dim = (t: string) => `${A.dim}${t}${A.reset}`
const bold = (t: string) => `${A.bold}${t}${A.reset}`

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
    if (h > 0) return dim(`resets in ${h}h ${m}m`)
    return dim(`resets in ${m}m`)
}

// ─── SPARKLINE ───────────────────────────────────────────────────────────────

const SPARK = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const

function sparkline(history: number[], width = 10): string {
    if (history.length === 0) return " ".repeat(width)
    const slice = history.slice(-width)
    const max = Math.max(...slice)
    const min = Math.min(...slice)
    const range = max - min || 1
    const bars = slice.map((v) => SPARK[Math.round(((v - min) / range) * 7)])
    // pad left if shorter than width
    const pad = " ".repeat(width - bars.length)
    return pad + c("cyan", bars.join(""))
}

// ─── GAUGE BAR ───────────────────────────────────────────────────────────────

const BAR_WIDTH = 18

function gauge(pct: number): string {
    const filled = Math.round((pct / 100) * BAR_WIDTH)
    const empty = BAR_WIDTH - filled
    const fill = "█".repeat(filled)
    const space = "░".repeat(empty)
    const color: keyof typeof A =
        pct >= 90 ? "red" : pct >= 70 ? "yellow" : "green"
    return `${c(color, fill)}${dim(space)}`
}

function pctLabel(pct: number): string {
    const label = `${pct.toString().padStart(3)}%`
    if (pct >= 90) return c("red", bold(label))
    if (pct >= 70) return c("yellow", label)
    return c("green", label)
}

// ─── BOX HELPERS ─────────────────────────────────────────────────────────────

// Width of the visible content area (excluding the two │ border chars)
const W = 64

function hRule(left: string, mid: string, right: string, fill = "─"): string {
    return left + fill.repeat(W) + right
}

function row(content: string): string {
    // Strip ANSI for length measurement
    const visible = content.replace(/\x1b\[[0-9;]*m/g, "")
    const pad = Math.max(0, W - visible.length)
    return `│ ${content}${" ".repeat(pad - 1)}│`
}

function blank(): string {
    return `│${" ".repeat(W)}│`
}

// ─── STATE (for delta tracking) ──────────────────────────────────────────────

const prevSnapshot = new Map<string, number>()
const history = new Map<string, number[]>()

const HISTORY_LEN = 40

function updateHistory(plugin: string, used: number) {
    const h = history.get(plugin) ?? []
    h.push(used)
    if (h.length > HISTORY_LEN) h.shift()
    history.set(plugin, h)
}

// ─── MAIN RENDER ─────────────────────────────────────────────────────────────

export function renderTerminal(results: PluginResult[]): void {
    console.clear()

    const now = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })

    const lines: string[] = []

    // ── Header ──
    lines.push(hRule("┌", "─", "┐"))
    lines.push(row(
        `  ${bold(c("cyan", "tokwatch"))}  ${dim("token usage monitor")}` +
        " ".repeat(20) +
        `${dim("as of")} ${c("white", now)}`
    ))
    lines.push(hRule("├", "─", "┤"))

    // ── Column headers ──
    lines.push(row(
        `  ${dim("PLUGIN".padEnd(16))}` +
        `${dim("USED".padStart(10))}` +
        `  ${dim("DELTA".padEnd(13))}` +
        `  ${dim("SPARK".padEnd(11))}` +
        `  ${dim("USAGE".padEnd(BAR_WIDTH + 6))}`
    ))
    lines.push(hRule("├", "─", "┤", "╌"))

    // ── Plugin rows ──
    for (const r of results) {
        updateHistory(r.plugin, r.used)

        const prev = prevSnapshot.get(r.plugin) ?? r.used
        const delta = r.used - prev
        prevSnapshot.set(r.plugin, r.used)

        const spark = sparkline(history.get(r.plugin) ?? [], 10)
        const pct = r.limit ? Math.round((r.used / r.limit) * 100) : null

        const nameCol = bold(r.plugin.padEnd(16))
        const usedCol = c("white", fmt(r.used).padStart(10))
        const deltaCol = fmtDelta(delta).padEnd(13)

        const usageCol = pct !== null
            ? `${gauge(pct)} ${pctLabel(pct)}`
            : dim("  no limit   ")

        lines.push(row(`  ${nameCol}${usedCol}  ${deltaCol}  ${spark}  ${usageCol}`))

        // Sub-row: limit + reset info
        if (r.limit || r.resetAt) {
            const limitStr = r.limit
                ? `${dim("limit")} ${c("white", fmt(r.limit))}`
                : ""
            const resetStr = r.resetAt
                ? `   ${fmtReset(r.resetAt)}`
                : ""
            const remaining = r.remaining !== null
                ? `   ${dim("remaining")} ${c("cyan", fmt(r.remaining))}`
                : ""
            lines.push(row(`  ${" ".repeat(16)}  ${limitStr}${remaining}${resetStr}`))
        }

        lines.push(blank())
    }

    // ── Footer ──
    lines.push(hRule("└", "─", "┘"))

    console.log(lines.join("\n"))
}

// ─── CUMULATIVE RENDER ───────────────────────────────────────────────────────

export function renderCumulative(
    _results: PluginResult[],
    cumulative: Cumulative[]
): void {
    if (cumulative.length === 0) return

    const total = cumulative.reduce((s, c) => s + c.total_used, 0)

    const lines: string[] = []

    lines.push(hRule("┌", "─", "┐"))
    lines.push(row(`  ${bold(c("magenta", "cumulative"))}  ${dim("all-time totals")}`))
    lines.push(hRule("├", "─", "┤"))

    lines.push(row(
        `  ${dim("PLUGIN".padEnd(16))}` +
        `${dim("TOTAL".padStart(10))}` +
        `  ${dim("SHARE".padEnd(BAR_WIDTH + 6))}` +
        `  ${dim("LAST SEEN")}`
    ))
    lines.push(hRule("├", "─", "┤", "╌"))

    for (const entry of cumulative) {
        const share = total > 0 ? Math.round((entry.total_used / total) * 100) : 0

        const lastSeen = (() => {
            const d = new Date(entry.last_seen)
            return isNaN(d.getTime())
                ? dim("unknown")
                : dim(d.toLocaleString("en-US", {
                    month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit", hour12: false,
                }))
        })()

        lines.push(row(
            `  ${bold(entry.plugin.padEnd(16))}` +
            `${c("white", fmt(entry.total_used).padStart(10))}` +
            `  ${gauge(share)} ${pctLabel(share)}` +
            `  ${lastSeen}`
        ))
        lines.push(blank())
    }

    // Total row
    lines.push(hRule("├", "─", "┤", "╌"))
    lines.push(row(
        `  ${dim("TOTAL".padEnd(16))}` +
        `${bold(c("white", fmt(total).padStart(10)))}`
    ))
    lines.push(hRule("└", "─", "┘"))

    console.log(lines.join("\n"))
}
