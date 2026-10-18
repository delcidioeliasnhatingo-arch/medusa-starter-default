import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const vercelAdminOrigin = "/^https:\\/\\/medusa-starter-default.*\\.vercel\\.app$/"
const withVercelAdminOrigin = (value: string | undefined) =>
  [value, vercelAdminOrigin].filter(Boolean).join(",")

module.exports = defineConfig({
  admin: {
    // The Vercel deployment hosts only the static Admin; the API stays on the existing Railway service.
    path: process.env.VERCEL === "1" ? "/" : "/app",
    backendUrl:
      process.env.MEDUSA_BACKEND_URL ||
      "https://aveart-medusa-backend-production.up.railway.app",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    workerMode: (process.env.MEDUSA_WORKER_MODE || "shared") as "shared" | "worker" | "server",
    http: {
      storeCors: process.env.STORE_CORS!,
      // Allow the separate Vercel Admin domain while preserving existing configured origins.
      adminCors: withVercelAdminOrigin(process.env.ADMIN_CORS),
      authCors: withVercelAdminOrigin(process.env.AUTH_CORS),
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  }
})
