import fastify from "fastify"
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod"
import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"
import cors from "@fastify/cors"
import type { PluginResult, MetricsResponse } from "../core/types"
import { getCumulative } from "../core/store"

const app = fastify({
    logger: true,
})

const PORT = Number(process.env.PORT) || 7850

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
})

await app.register(swagger, {
    openapi: {
        info: { title: "TokWatch API", version: "1.0.0", description: "Token monitoring API for IDEs" },
        servers: [{ url: `http://localhost:${PORT}` }],
    },
    transform: jsonSchemaTransform,
})

await app.register(swaggerUi, { routePrefix: "/docs" })

let latestResults: PluginResult[] = []

export function updateResults(results: PluginResult[]) {
    latestResults = results
}

app.get("/metrics", async () => {
    const cumulative = getCumulative()
    const response = {
        plugins: latestResults.map(p => ({
            ...p,
            resetAt: p.resetAt?.toISOString() ?? null,
        })),
        cumulative,
        timestamp: new Date().toISOString(),
    }
    return response
})

app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() }
})

export async function startHttpServer(port: number) {
    try {
        await app.listen({ port, host: "0.0.0.0" })
        console.log(`tokwatch HTTP server running at http://localhost:${port}`)
        console.log(`Swagger docs available at http://localhost:${port}/docs`)
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}

export { app }
