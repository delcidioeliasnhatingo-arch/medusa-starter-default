import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const vercelAdminOrigin = "/^https:\\/\\/medusa-starter-default.*\\.vercel\\.app$/"
const withVercelAdminOrigin = (value: string | undefined) =>
  [value, vercelAdminOrigin].filter(Boolean).join(",")

module.exports = defineConfig({
  admin: {
    // Build the static Admin UI on Vercel; keep it disabled in the Render API service.
    disable: process.env.VERCEL !== "1",
    path: process.env.VERCEL === "1" ? "/" : "/app",
    backendUrl:
      process.env.MEDUSA_BACKEND_URL ||
      process.env.RENDER_EXTERNAL_URL,
  },
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/debitopay",
            id: "debitopay",
            options: {
              apiKey: process.env.DEBITOPAY_API_KEY,
              merchantId: process.env.DEBITOPAY_MERCHANT_ID,
              walletCode: process.env.DEBITOPAY_WALLET_CODE,
              apiBaseUrl: process.env.DEBITOPAY_API_BASE_URL,
              currency: process.env.DEBITOPAY_CURRENCY || "ZAR",
              paymentMethod: process.env.DEBITOPAY_PAYMENT_METHOD || "payfast",
              returnUrl: process.env.DEBITOPAY_RETURN_URL,
              webhookSecret: process.env.DEBITOPAY_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
  ],
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL?.trim() || undefined,
    workerMode: (process.env.MEDUSA_WORKER_MODE || "shared") as "shared" | "worker" | "server",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: withVercelAdminOrigin(process.env.ADMIN_CORS),
      authCors: withVercelAdminOrigin(process.env.AUTH_CORS),
      jwtSecret: process.env.JWT_SECRET!,
      cookieSecret: process.env.COOKIE_SECRET!,
    }
  }
})
