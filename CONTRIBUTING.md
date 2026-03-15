# Contributing to TokWatch

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/tokwatch.git
cd tokwatch

# Install dependencies (monorepo)
bun install
```

## Project Structure

- `apps/api/core/` - Core logic (runner, store, types, config)
- `apps/api/outputs/` - Output formatters (terminal, HTTP)
- `apps/api/plugins/` - Tool plugins
- `apps/cli/` - CLI application (blessed)
- `apps/web/` - Web dashboard (Vite + React)

## Adding a New Plugin

1. Create `apps/api/plugins/my-tool.ts`:

```typescript
import type { TokenPlugin, PluginResult } from "../core/types"

export const myToolPlugin: TokenPlugin = {
  name: "my-tool",
  async poll(): Promise<PluginResult> {
    return {
      plugin: "my-tool",
      used: 0,
      limit: null,
      remaining: null,
      resetAt: null,
    }
  },
}
```

2. Register in `apps/api/plugins/index.ts`:

```typescript
export { myToolPlugin } from "./my-tool"
```

3. Test:

```bash
bun run index.ts --list  # Should show your plugin
```

## Running Apps

```bash
# All apps
bun run dev

# Specific app (uses Bun filter)
bun run --filter cli dev
bun run --filter web dev
bun run --filter api dev

# From root
bun run index.ts --http
bun run index.ts --web
```

## Code Style

- Use TypeScript throughout
- Follow existing conventions
- Test your changes

## Issues

Found a bug or have a feature request? Please open an issue.
