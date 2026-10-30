import { describe, expect, it } from 'vitest';
import {
  correlate,
  jaccard,
  resolveRoomHint,
  tokenize,
  type CorrelationCandidate,
} from '@/lib/engine/correlation';
import type { Extraction } from '@/lib/domain/types';
import { IDS, NOW, at, rooms } from './fixtures';

function extraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    category: 'ELECTRICAL',
    subtype: 'power',
    buildingHint: null,
    roomHint: 'B-204',
    assetHint: null,
    urgency: 'HIGH',
    isSafetyRisk: false,
    affectedActivity: 'EXAM',
    deadlineHintMinutes: 30,
    missingFields: [],
    clarifyingQuestion: null,
    summary: 'B-204: power failure, lights out.',
    confidence: 0.8,
    spans: [],
    ...overrides,
  };
}

function candidate(overrides: Partial<CorrelationCandidate> = {}): CorrelationCandidate {
  return {
    incidentId: 'existing-incident',
    category: 'ELECTRICAL',
    roomId: IDS.room.b204,
    building: 'B Block',
    assetId: null,
    summary: 'B-204: power failure, lights out.',
    createdAt: at(-5),
    ...overrides,
  };
}

describe('tokenize', () => {
  it('drops stopwords, punctuation, and one-character fragments', () => {
    const tokens = tokenize('The power is OUT in B-204, lights out!');
    expect(tokens.has('the')).toBe(false);
    expect(tokens.has('is')).toBe(false);
    expect(tokens.has('b')).toBe(false);
    expect(tokens.has('power')).toBe(true);
    expect(tokens.has('204')).toBe(true);
  });

  it('computes Jaccard similarity', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1);
    expect(jaccard(new Set(['a', 'b']), new Set(['c', 'd']))).toBe(0);
    expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3, 5);
  });
});

describe('correlate', () => {
  it('treats a same-room, same-category report minutes later as a duplicate', () => {
    const matches = correlate(
      'Power is out in B-204, lights out, exam in 30 minutes.',
      extraction(),
      [candidate()],
      NOW,
      IDS.room.b204,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.kind).toBe('DUPLICATE');
    expect(matches[0]?.score).toBeGreaterThanOrEqual(0.7);
    expect(matches[0]?.reasons).toContain('same room');
  });

  it('never merges a different category, however similar the words', () => {
    const matches = correlate(
      'Power is out in B-204, lights out.',
      extraction({ category: 'NETWORK' }),
      [candidate()],
      NOW,
      IDS.room.b204,
    );

    expect(matches).toEqual([]);
  });

  it('never merges a report older than the correlation window', () => {
    const matches = correlate(
      'Power is out in B-204, lights out.',
      extraction(),
      [candidate({ createdAt: at(-180) })],
      NOW,
      IDS.room.b204,
    );

    expect(matches).toEqual([]);
  });

  it('marks a same-room report with different wording as related, not duplicate', () => {
    const matches = correlate(
      'Breaker tripped and everything went dark in B-204.',
      extraction({ roomHint: 'B-204' }),
      [candidate()],
      NOW,
      IDS.room.b204,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.kind).toBe('RELATED');
    expect(matches[0]?.score).toBeGreaterThanOrEqual(0.35);
    expect(matches[0]?.score).toBeLessThan(0.7);
  });

  it('returns matches best-first', () => {
    const matches = correlate(
      'Power is out in B-204, lights out.',
      extraction(),
      [
        candidate({ incidentId: 'weaker', summary: 'Electrical fault somewhere in the block', createdAt: at(-90) }),
        candidate({ incidentId: 'stronger' }),
      ],
      NOW,
      IDS.room.b204,
    );

    expect(matches[0]?.incidentId).toBe('stronger');
    expect(matches[1]?.score).toBeLessThanOrEqual(matches[0]!.score);
  });

  it('does not credit a room match when the report has no resolved room', () => {
    const matches = correlate(
      'Power is out in B-204, lights out.',
      extraction({ roomHint: null }),
      [candidate()],
      NOW,
      null,
    );

    expect(matches[0]?.reasons).not.toContain('same room');
  });
});

describe('resolveRoomHint', () => {
  const roomList = rooms.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    building: r.building,
  }));

  it('resolves an exact room code regardless of punctuation', () => {
    expect(resolveRoomHint('b204', roomList)).toEqual({
      roomId: IDS.room.b204,
      ambiguous: false,
      candidates: ['B-204'],
    });
  });

  it('resolves an exact room name', () => {
    expect(resolveRoomHint('Library Hall', roomList).roomId).toBe(IDS.room.libHall);
  });

  it('refuses to guess when a partial hint matches several rooms', () => {
    const result = resolveRoomHint('hall', roomList);
    expect(result.roomId).toBeNull();
    expect(result.ambiguous).toBe(true);
    expect(result.candidates.length).toBeGreaterThan(1);
  });

  it('resolves a unique partial hint', () => {
    expect(resolveRoomHint('library', roomList).roomId).toBe(IDS.room.libHall);
  });

  it('returns nothing for an empty or unknown hint instead of inventing a room', () => {
    expect(resolveRoomHint(null, roomList)).toEqual({ roomId: null, ambiguous: false, candidates: [] });
    expect(resolveRoomHint('   ', roomList)).toEqual({ roomId: null, ambiguous: false, candidates: [] });
    expect(resolveRoomHint('crypt', roomList).roomId).toBeNull();
  });
});
