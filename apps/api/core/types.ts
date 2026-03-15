export interface TokenPlugin {
  name: string
  poll(): Promise<PluginResult>
}

export interface PluginResult {
  plugin: string
  used: number
  limit: number | null
  remaining: number | null
  resetAt: Date | null
  raw?: Record<string, unknown>
}

export interface Snapshot {
  id: number
  plugin: string
  used: number
  limit_total: number | null
  remaining: number | null
  reset_at: string | null
  captured_at: string
}

export interface Cumulative {
  plugin: string
  total_used: number
  last_seen: string
}

export interface MetricsResponse {
  plugins: PluginResult[]
  cumulative: Cumulative[]
  timestamp: string
}
