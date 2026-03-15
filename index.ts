import { availablePlugins, loadConfig, getPluginsFromConfig } from "./apps/api/core/config"
import { runPlugins } from "./apps/api/core/runner"
import { renderTerminal, renderCumulative } from "./apps/api/outputs/terminal"
import { startHttpServer, updateResults } from "./apps/api/outputs/http"
import { getCumulative } from "./apps/api/core/store"

const args = process.argv.slice(2)
const showAllFlag = args.includes("--all") || args.includes("-a")
const httpFlag = args.includes("--http")
const webFlag = args.includes("--web")
const listFlag = args.includes("--list") || args.includes("-l")
const setDefaultFlag = args.find(a => a.startsWith("--set-default="))
const setPluginsFlag = args.find(a => a.startsWith("--plugins="))
const themeFlag = args.find(a => a.startsWith("--theme="))
const intervalArg = args.find((a) => a.startsWith("--interval="))
const interval = intervalArg ? parseInt(intervalArg.split("=")[1]!, 10) : 60000
const portArg = args.find((a) => a.startsWith("--port="))
const port = portArg ? parseInt(portArg.split("=")[1]!, 10) : 7850

async function main() {
    if (listFlag) {
        console.log("Available plugins:")
        for (const p of availablePlugins.all) {
            console.log(`  - ${p.name}`)
        }
        return
    }

    if (setDefaultFlag) {
        const plugins = setDefaultFlag.split("=")[1]!.split(",")
        const { saveConfig } = await import("./apps/api/core/config")
        await saveConfig({ defaultPlugins: plugins })
        console.log("Updated default plugins:", plugins)
        return
    }

    if (setPluginsFlag) {
        const plugins = setPluginsFlag.split("=")[1]!.split(",")
        const { saveConfig } = await import("./apps/api/core/config")
        await saveConfig({ plugins })
        console.log("Updated enabled plugins:", plugins)
        return
    }

    if (themeFlag) {
        const theme = themeFlag.split("=")[1] as "dark" | "light"
        const { saveConfig } = await import("./apps/api/core/config")
        await saveConfig({ theme })
        console.log("Updated theme:", theme)
        return
    }

    const config = await loadConfig()
    config.showAll = showAllFlag

    const plugins = getPluginsFromConfig(config, availablePlugins.all)

    if (plugins.length === 0) {
        console.log("No plugins configured. Use --list to see available plugins.")
        console.log("Example: bun run index.ts --set-default=claude-code,opencode")
        return
    }

    if (webFlag) {
        console.log("Starting HTTP server on port", port)
        startHttpServer(port)
        setInterval(() => runPlugins(plugins, updateResults), interval)
        setTimeout(async () => {
            const { spawn } = await import("child_process")
            spawn("bun", ["run", "apps/web", "--", "--port", "3000", "--open"], {
                cwd: process.cwd(),
                stdio: "inherit",
                shell: true
            })
        }, 1000)
        return
    }

    if (httpFlag) {
        startHttpServer(port)
        setInterval(() => runPlugins(plugins, updateResults), interval)
    } else {
        const results = await runPlugins(plugins)
        const cumulative = getCumulative()
        renderTerminal(results)
        renderCumulative(results, cumulative)
    }
}

main()
