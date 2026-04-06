import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  RAZORPAY_KEY_ID: z.string().optional().default("mock"),
  RAZORPAY_KEY_SECRET: z.string().optional().default("mock"),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  MOCK_PAYMENT: z.enum(["true", "false"]).default("true"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_BUCKET_NAME: z.string().default("ticketflow"),
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string().email().default("noreply@ticketflow.dev"),
  MEILISEARCH_URL: z.string().url().optional(),
  MEILISEARCH_API_KEY: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  API_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
