import type { Extraction } from '@/lib/domain/types';
import type { IncidentCategory } from '@/lib/domain/enums';
import { ENGINE } from './policy';

export interface CorrelationCandidate {
  incidentId: string;
  category: IncidentCategory;
  roomId: string | null;
  building: string | null;
  assetId: string | null;
  summary: string;
  createdAt: Date;
}

export interface CorrelationMatch {
  incidentId: string;
  score: number;
  kind: 'DUPLICATE' | 'RELATED';
  reasons: string[];
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'of', 'and',
  'or', 'for', 'with', 'this', 'that', 'it', 'we', 'our', 'my', 'me', 'i', 'has',
  'have', 'not', 'no', 'very', 'again', 'please', 'sir', 'madam', 'there', 'here',
]);

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach((token) => { if (b.has(token)) intersection += 1; });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Deterministic correlation. The LLM may later *confirm* an ambiguous match,
 * but it can never invent one: the hard gates below always run first.
 */
export function correlate(
  rawText: string,
  extraction: Extraction,
  candidates: CorrelationCandidate[],
  now: Date,
  resolvedRoomId: string | null = null,
): CorrelationMatch[] {
  const tokens = tokenize(rawText);
  const matches: CorrelationMatch[] = [];

  for (const candidate of candidates) {
    // Hard gate 1: different category is never a duplicate.
    if (candidate.category !== extraction.category) continue;

    // Hard gate 2: too old.
    const ageMinutes = (now.getTime() - candidate.createdAt.getTime()) / 60_000;
    if (ageMinutes > ENGINE.correlation.maxAgeMinutes) continue;

    const reasons: string[] = [];
    let score = jaccard(tokens, tokenize(candidate.summary)) * 0.6;

    if (candidate.roomId && resolvedRoomId && candidate.roomId === resolvedRoomId) {
      score += 0.35;
      reasons.push('same room');
    }
    if (candidate.assetId && extraction.assetHint) {
      score += 0.3;
      reasons.push('same asset');
    }
    if (candidate.building && extraction.buildingHint) {
      score += 0.1;
      reasons.push('same building');
    }

    if (ageMinutes <= 15) {
      score += 0.15;
      reasons.push('reported within 15 minutes');
    } else if (ageMinutes <= 60) {
      score += 0.05;
      reasons.push('reported within an hour');
    }

    score = Math.min(1, score);

    if (score >= ENGINE.correlation.duplicate) {
      matches.push({ incidentId: candidate.incidentId, score, kind: 'DUPLICATE', reasons });
    } else if (score >= ENGINE.correlation.related) {
      matches.push({ incidentId: candidate.incidentId, score, kind: 'RELATED', reasons });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Room resolution. The AI returns text ("B-204", "lab 3", "auditorium"), never
 * an id. This maps text onto real rooms and refuses to guess when ambiguous.
 */
export function resolveRoomHint(
  hint: string | null,
  rooms: Array<{ id: string; code: string; name: string; building: string }>,
): { roomId: string | null; ambiguous: boolean; candidates: string[] } {
  if (!hint) return { roomId: null, ambiguous: false, candidates: [] };

  const normalised = hint.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalised.length === 0) return { roomId: null, ambiguous: false, candidates: [] };

  const exact = rooms.filter(
    (r) =>
      r.code.toLowerCase().replace(/[^a-z0-9]/g, '') === normalised ||
      r.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalised,
  );
  if (exact.length === 1) return { roomId: exact[0]!.id, ambiguous: false, candidates: [exact[0]!.code] };
  if (exact.length > 1) {
    return { roomId: null, ambiguous: true, candidates: exact.map((r) => r.code) };
  }

  const partial = rooms.filter(
    (r) =>
      r.code.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalised) ||
      r.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalised),
  );
  if (partial.length === 1) {
    return { roomId: partial[0]!.id, ambiguous: false, candidates: [partial[0]!.code] };
  }

  return {
    roomId: null,
    ambiguous: partial.length > 1,
    candidates: partial.map((r) => r.code),
  };
}
