import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const vercelAdminOrigin = "/^https:\\/\\/medusa-starter-default.*\\.vercel\\.app$/"
const withVercelAdminOrigin = (value: string | undefined) =>
  [value, vercelAdminOrigin].filter(Boolean).join(",")

module.exports = defineConfig({
  admin: {
    // The Admin UI is built and hosted separately on Vercel; do not serve it from the API container.
    disable: true,
    // Vercel hosts the static Admin. Configure MEDUSA_BACKEND_URL only when a separate API exists.
    path: process.env.VERCEL === "1" ? "/" : "/app",
    backendUrl:
      process.env.MEDUSA_BACKEND_URL ||
      process.env.RENDER_EXTERNAL_URL,
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL?.trim() || undefined,
    workerMode: (process.env.MEDUSA_WORKER_MODE || "shared") as "shared" | "worker" | "server",
    http: {
      storeCors: process.env.STORE_CORS!,
      // Allow the separate Vercel Admin domain while preserving existing configured origins.
      adminCors: withVercelAdminOrigin(process.env.ADMIN_CORS),
      authCors: withVercelAdminOrigin(process.env.AUTH_CORS),
      jwtSecret: process.env.JWT_SECRET!,
      cookieSecret: process.env.COOKIE_SECRET!,
    }
  }
})
