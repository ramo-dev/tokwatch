# TokWatch

Your local token accountant - because "how much did I just spend?" shouldn't require a spreadsheet. TokWatch monitors token usage across Claude Code, OpenCode, Ollama, Cursor, Antigravity, and Windsurf, persists it to SQLite, and surfaces it however you like: terminal, HTTP, a proper web dashboard, or an interactive blessed CLI.

## Features

- **Multi-tool support** — Claude Code, OpenCode, Ollama, Cursor, Antigravity, Windsurf
- **Multiple output modes** — Terminal, HTTP server, Web UI, CLI
- **Persistent storage** — SQLite keeps your cumulative totals across sessions
- **Configurable** — pick exactly which tools you care about
- **Web dashboard** — a real visual UI, built with Vite
- **Monorepo** — Bun workspaces, cleanly split into API, CLI, and Web

## Quick Start

```bash
# Install dependencies
bun install

# One-shot terminal output
bun run index.ts

# Or launch a specific app directly
bun run --filter cli dev    # Interactive CLI (blessed)
bun run --filter web dev    # Web dashboard
```

## Monorepo Commands

```bash
# Bring everything up at once
bun run dev

# Or target just what you need
bun run dev:web     # Web UI only
bun run dev:cli     # CLI only

# Run from root with flags
bun run index.ts --http
bun run index.ts --web
```

## CLI Options

| Flag | Description |
|------|-------------|
| `--all`, `-a` | Show all plugins, not just defaults |
| `--http` | Start the HTTP API server |
| `--web` | Start the web UI |
| `--list`, `-l` | List every available plugin |
| `--set-default=<plugins>` | Persist a default plugin set (comma-separated) |
| `--plugins=<plugins>` | Enable specific plugins for this run |
| `--theme=<dark\|light>` | Set your theme preference |
| `--interval=<ms>` | Poll interval in milliseconds (default: 60000) |
| `--port=<port>` | HTTP server port (default: 7850) |

## Examples

```bash
# See what plugins are available
bun run index.ts --list

# Save a default set so you don't repeat yourself
bun run index.ts --set-default=claude-code,opencode,ollama

# Show everything at once
bun run index.ts --all

# HTTP server with a tighter poll interval on a custom port
bun run index.ts --http --interval=30000 --port=9000

# Interactive CLI
bun run --filter cli dev --port=7850

# Web dashboard
bun run --filter web dev
```

## HTTP API

Start with `--http` and hit the metrics endpoint:

```
GET http://localhost:7850/metrics
```

Response:

```json
{
  "plugins": [
    {
      "plugin": "claude-code",
      "used": 19700000,
      "limit": null,
      "remaining": null,
      "resetAt": "..."
    }
  ],
  "cumulative": [
    {
      "plugin": "claude-code",
      "total_used": 59000000,
      "last_seen": "2026-03-15 08:27:05"
    }
  ],
  "timestamp": "2026-03-15T08:30:00.000Z"
}
```

## Web UI

```bash
bun run index.ts --web
# or
bun run --filter web dev
```

## CLI UI (Blessed)

```bash
bun run --filter cli dev --port=7850
```

Keybindings once you're in:

| Key | Action |
|-----|--------|
| `t` | Toggle between current and cumulative view |
| `r` | Force a refresh |
| `q` | Quit |

## Configuration

Config lives at `~/.config/tokwatch/config.json` and is written automatically on first run:

```json
{
  "plugins": ["claude-code", "opencode", "ollama", "cursor", "antigravity", "windsurf"],
  "defaultPlugins": ["claude-code", "opencode", "ollama"],
  "theme": "dark",
  "output": "terminal",
  "interval": 60000,
  "port": 7850,
  "showAll": false
}
```

## Adding Custom Plugins

Drop a new file in `apps/api/plugins/`:

```typescript
// apps/api/plugins/my-tool.ts
import type { TokenPlugin, PluginResult } from "../core/types"

export const myToolPlugin: TokenPlugin = {
  name: "my-tool",
  async poll(): Promise<PluginResult> {
    return {
      plugin: "my-tool",
      used: 1000000,
      limit: null,
      remaining: null,
      resetAt: null,
    }
  },
}
```

Then register it in `apps/api/plugins/index.ts` and it'll show up like any other plugin.

## Project Structure

```
tokwatch/
├── package.json              # Monorepo root
├── index.ts                  # Main entry point
├── apps/
│   ├── api/                  # Core API library
│   │   ├── core/             # Runner, store, types, config
│   │   ├── outputs/          # Terminal, HTTP output
│   │   └── plugins/          # Tool plugins
│   ├── cli/                  # Blessed CLI app
│   └── web/                  # Vite + React web dashboard
```

## Tech Stack

- **Runtime** — Bun
- **Database** — bun:sqlite
- **Web** — Vite + React + Tailwind CSS
- **CLI** — Blessed + TypeScript

## License

[LICENSE]
