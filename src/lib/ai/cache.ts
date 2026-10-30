import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEnv } from '@/lib/env';
import { ExtractionSchema, type ExtractionPayload } from './schema';

/**
 * Extraction cache.
 *
 * Two purposes:
 *   1. remove model latency from the critical demo path on repeat runs;
 *   2. make the same report produce the same extraction every time.
 *
 * A cache miss is never fatal — every read and write is best-effort.
 */
export const EXTRACTION_CACHE_VERSION = 'v1';

export function extractionCacheKey(text: string): string {
  const normalised = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const hash = createHash('sha256').update(normalised).digest('hex').slice(0, 32);
  return `extract:${EXTRACTION_CACHE_VERSION}:${getEnv().AI_MODEL}:${hash}`;
}

export async function readCachedExtraction(key: string): Promise<ExtractionPayload | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('ai_cache')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) return null;

    const parsed = ExtractionSchema.safeParse((data as { value: unknown }).value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function writeCachedExtraction(
  key: string,
  value: ExtractionPayload,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('ai_cache').upsert(
      {
        key,
        model: getEnv().AI_MODEL,
        kind: 'EXTRACT',
        value,
      },
      { onConflict: 'key' },
    );
  } catch {
    // Caching is an optimisation. Never fail a report because the cache failed.
  }
}
