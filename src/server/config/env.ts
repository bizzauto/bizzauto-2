import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ENCRYPTION_KEY: z.string().min(32).default('default-encryption-key-change-in-production'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().optional(),
  GROK_API_KEY: z.string().optional(),
  REPLICATE_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  WHATSAPP_API_URL: z.string().optional(),
  WHATSAPP_API_KEY: z.string().optional(),
  FB_APP_ID: z.string().optional(),
  FB_APP_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  BASE_URL: z.string().default('http://localhost:4000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
})

export type Env = z.infer<typeof envSchema>

let env: Env

try {
  env = envSchema.parse(process.env)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:')
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`)
    })
    console.error('\nPlease check your .env file')
    process.exit(1)
  }
  throw error
}

export default env
