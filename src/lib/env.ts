import { z } from 'zod';

/**
 * Environment is parsed lazily so that importing a pure module (the planner,
 * the invariants, a unit test) never requires a configured deployment.
 */
const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().default(''),

  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_API_KEY: z.string().default(''),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_WHATSAPP_FROM: z.string().default(''),
  TWILIO_LIVE: z.enum(['true', 'false']).default('false'),

  RESEND_API_KEY: z.string().default(''),
  MAIL_FROM: z.string().default('Aegis <aegis@example.com>'),
  MAIL_LIVE: z.enum(['true', 'false']).default('false'),

  SIMULATOR_WEBHOOK_SECRET: z.string().default('dev-simulator-secret'),
  CRON_SECRET: z.string().default('dev-cron-secret'),

  DEMO_MODE: z.enum(['true', 'false']).default('true'),
});

export type Env = z.infer<typeof EnvSchema> & {
  aiEnabled: boolean;
  twilioLive: boolean;
  mailLive: boolean;
  demoMode: boolean;
};

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment. Copy .env.example to .env.local.\n${issues}`);
  }

  cached = {
    ...parsed.data,
    aiEnabled: parsed.data.AI_API_KEY.length > 0,
    twilioLive: parsed.data.TWILIO_LIVE === 'true',
    mailLive: parsed.data.MAIL_LIVE === 'true',
    demoMode: parsed.data.DEMO_MODE === 'true',
  };

  return cached;
}

/** Used by scripts and webhook handlers that must never fall back to anon. */
export function requireServiceRole(): string {
  const key = getEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for this operation (webhooks, cron, seeding).',
    );
  }
  return key;
}

/** Test-only: forget the cached env so a different process.env can be parsed. */
export function resetEnvCache() {
  cached = null;
}
