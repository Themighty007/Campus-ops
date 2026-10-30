import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireServiceRole } from '@/lib/env';

let cached: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS — use only in API routes, webhooks, and
 * cron handlers that need elevated access. Never import from client components.
 */
export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRole(),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return cached;
}
