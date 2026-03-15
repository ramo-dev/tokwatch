import { Database } from "bun:sqlite"
import type { PluginResult, Snapshot, Cumulative } from "./types"

const db = new Database("tokwatch.db")

db.run(`
  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin TEXT NOT NULL,
    used INTEGER NOT NULL,
    limit_total INTEGER,
    remaining INTEGER,
    reset_at TEXT,
    captured_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS cumulative (
    plugin TEXT PRIMARY KEY,
    total_used INTEGER NOT NULL DEFAULT 0,
    last_seen TEXT DEFAULT (datetime('now'))
  )
`)

export function saveSnapshot(result: PluginResult) {
  db.run(
    `INSERT INTO snapshots (plugin, used, limit_total, remaining, reset_at) VALUES (?, ?, ?, ?, ?)`,
    [
      result.plugin,
      result.used,
      result.limit,
      result.remaining,
      result.resetAt?.toISOString() ?? null,
    ]
  )
}

export function updateCumulative(plugin: string, used: number) {
  db.run(
    `INSERT INTO cumulative (plugin, total_used, last_seen) VALUES (?, ?, datetime('now'))
     ON CONFLICT(plugin) DO UPDATE SET
       total_used = total_used + excluded.total_used,
       last_seen = datetime('now')`,
    [plugin, used]
  )
}

export function getSnapshots(plugin?: string, limit = 100): Snapshot[] {
  if (plugin) {
    return db
      .query(
        `SELECT * FROM snapshots WHERE plugin = ? ORDER BY captured_at DESC LIMIT ?`
      )
      .all(plugin, limit) as Snapshot[]
  }
  return db
    .query(`SELECT * FROM snapshots ORDER BY captured_at DESC LIMIT ?`)
    .all(limit) as Snapshot[]
}

export function getCumulative(): Cumulative[] {
  return db.query(`SELECT * FROM cumulative`).all() as Cumulative[]
}

export function getLatestSnapshots(): Snapshot[] {
  return db
    .query(
      `SELECT * FROM snapshots WHERE id IN (
        SELECT MAX(id) FROM snapshots GROUP BY plugin
      )`
    )
    .all() as Snapshot[]
}

export function getCumulativeForPlugin(plugin: string): Cumulative | null {
  return db
    .query(`SELECT * FROM cumulative WHERE plugin = ?`)
    .get(plugin) as Cumulative | null
}
