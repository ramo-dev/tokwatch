# TokWatch

A local token/usage monitor for dev tools. Tracks token usage across Claude Code, OpenCode, Ollama, Cursor, Antigravity, and Windsurf.

## Features

- **Multi-tool support**: Claude Code, OpenCode, Ollama, Cursor, Antigravity, Windsurf
- **Multiple outputs**: Terminal, HTTP server, Web UI, CLI (blessed)
- **Persistent storage**: SQLite for cumulative tracking
- **Configurable**: Select which tools to monitor
- **Web dashboard**: Visual UI with Vite
- **Monorepo**: Bun workspaces for API, CLI, Web

## Quick Start

```bash
# Install dependencies
bun install

# Terminal output (one-shot)
bun run index.ts

# Run specific app (monorepo)
bun run --filter cli dev    # CLI with blessed
bun run --filter web dev    # Web UI
```

## Monorepo Commands

```bash
# Run all apps in dev mode
bun run dev

# Run specific app
bun run dev:web     # Web UI only
bun run dev:cli     # CLI only

# Run from root
bun run index.ts --http
bun run index.ts --web
```

## CLI Options

| Flag | Description |
|------|-------------|
| `--all`, `-a` | Show all plugins |
| `--http` | Start HTTP API server |
| `--web` | Start web UI |
| `--list`, `-l` | List available plugins |
| `--set-default=<plugins>` | Set default plugins (comma-separated) |
| `--plugins=<plugins>` | Enable specific plugins |
| `--theme=<dark\|light>` | Set theme preference |
| `--interval=<ms>` | Poll interval (default: 60000) |
| `--port=<port>` | HTTP server port (default: 7842) |

## Examples

```bash
# List all available plugins
bun run index.ts --list

# Set default plugins
bun run index.ts --set-default=claude-code,opencode,ollama

# Show all tools
bun run index.ts --all

# HTTP server with custom interval
bun run index.ts --http --interval=30000 --port=9000

# CLI with blessed UI (interactive)
bun run --filter cli dev --port=7842

# Web UI
bun run --filter web dev
```

## HTTP API

When running with `--http`, the server exposes:

```
GET http://localhost:7842/metrics
```

Response:
```json
{
  "plugins": [
    { "plugin": "claude-code", "used": 19700000, "limit": null, "remaining": null, "resetAt": "..." }
  ],
  "cumulative": [
    { "plugin": "claude-code", "total_used": 59000000, "last_seen": "2026-03-15 08:27:05" }
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
bun run --filter cli dev --port=7842

# Keys:
# t - toggle current/cumulative view
# r - refresh
# q - quit
```

## Configuration

Config is stored at `~/.config/tokwatch/config.json`:

```json
{
  "plugins": ["claude-code", "opencode", "ollama", "cursor", "antigravity", "windsurf"],
  "defaultPlugins": ["claude-code", "opencode", "ollama"],
  "theme": "dark",
  "output": "terminal",
  "interval": 60000,
  "port": 7842,
  "showAll": false
}
```

## Adding Custom Plugins

Create a new plugin file in `apps/api/plugins/`:

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

Register in `apps/api/plugins/index.ts`.

## Project Structure

```
tokwatch/
├── package.json              # Monorepo root
├── index.ts                  # Main entry point
├── apps/
│   ├── api/                 # Core API library
│   │   ├── core/           # Runner, store, types, config
│   │   ├── outputs/        # Terminal, HTTP output
│   │   └── plugins/        # Tool plugins
│   ├── cli/                # CLI app (blessed)
│   └── web/                # Web dashboard (Vite + React)
```

## Tech Stack

- **Runtime**: Bun
- **Database**: bun:sqlite
- **Web**: Vite + React + TailwindCSS
- **CLI**: Blessed + TypeScript

## License

MIT
