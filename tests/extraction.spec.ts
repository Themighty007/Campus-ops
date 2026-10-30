import { describe, expect, it } from 'vitest';
import { fallbackExtraction } from '@/lib/ai/fallback';
import { applyDeterministicRules } from '@/lib/ai/extract';
import { ExtractionSchema, extractJsonObject, parseExtraction } from '@/lib/ai/schema';

describe('fallbackExtraction', () => {
  it('reads the room, the deadline, and the activity from a real report', () => {
    const result = fallbackExtraction(
      'Power failure in B-204. The exam starts in 30 minutes and the lights are out.',
    );

    expect(result.category).toBe('ELECTRICAL');
    expect(result.roomHint).toBe('B-204');
    expect(result.deadlineHintMinutes).toBe(30);
    expect(result.affectedActivity).toBe('EXAM');
    expect(result.urgency).toBe('CRITICAL');
    expect(result.isSafetyRisk).toBe(false);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('flags a missing room instead of guessing one', () => {
    const result = fallbackExtraction('The projector is broken.');

    expect(result.category).toBe('AV');
    expect(result.roomHint).toBeNull();
    expect(result.missingFields).toContain('room');
    expect(result.clarifyingQuestion).toMatch(/which room/i);
  });

  it('treats a safety word as a safety incident', () => {
    const result = fallbackExtraction('There are sparks coming from the socket in LAB-3.');
    expect(result.category).toBe('SAFETY');
    expect(result.isSafetyRisk).toBe(true);
    expect(result.urgency).toBe('CRITICAL');
  });

  it('understands hours as well as minutes', () => {
    expect(fallbackExtraction('Wi-Fi is down in the library, lecture in 2 hours.').deadlineHintMinutes).toBe(
      120,
    );
  });

  it('keeps the summary short and factual', () => {
    const long = `The network switch in LAB-4 is down. ${'Students cannot log in. '.repeat(20)}`;
    const result = fallbackExtraction(long);
    expect(result.summary.length).toBeLessThanOrEqual(240);
    expect(result.summary).not.toMatch(/recommend|should/i);
  });
});

describe('applyDeterministicRules', () => {
  const base = fallbackExtraction('Something is wrong in C-301.');

  it('upgrades a model answer that missed a safety keyword', () => {
    const modelSaid = {
      ...base,
      category: 'OTHER' as const,
      isSafetyRisk: false,
      urgency: 'LOW' as const,
      confidence: 0.2,
    };

    const result = applyDeterministicRules(modelSaid, 'There is smoke coming from the panel in C-301.');

    expect(result.category).toBe('SAFETY');
    expect(result.isSafetyRisk).toBe(true);
    expect(result.urgency).toBe('CRITICAL');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('never downgrades a safety flag the model did raise', () => {
    const modelSaid = { ...base, category: 'SAFETY' as const, isSafetyRisk: true, confidence: 0.5 };
    const result = applyDeterministicRules(modelSaid, 'Something is wrong in C-301.');

    expect(result.isSafetyRisk).toBe(true);
    expect(result.category).toBe('SAFETY');
  });

  it('always records a missing room, whatever the model claimed', () => {
    const result = applyDeterministicRules(
      { ...base, roomHint: null, missingFields: [], clarifyingQuestion: null },
      'The lift is stuck.',
    );

    expect(result.missingFields).toContain('room');
    expect(result.clarifyingQuestion).not.toBeNull();
  });

  it('clamps confidence into a valid range', () => {
    expect(applyDeterministicRules({ ...base, confidence: 4 }, 'text').confidence).toBe(1);
    expect(applyDeterministicRules({ ...base, confidence: -2 }, 'text').confidence).toBe(0);
  });

  it('truncates an over-long summary rather than rejecting the report', () => {
    const result = applyDeterministicRules({ ...base, summary: 'x'.repeat(400) }, 'text');
    expect(result.summary.length).toBe(240);
  });
});

describe('extraction schema', () => {
  it('accepts a complete payload', () => {
    const parsed = ExtractionSchema.parse(fallbackExtraction('Power failure in B-204.'));
    expect(parsed.category).toBe('ELECTRICAL');
  });

  it('rejects an unknown category', () => {
    expect(() =>
      parseExtraction({ ...fallbackExtraction('Power failure in B-204.'), category: 'ALIENS' }),
    ).toThrow();
  });

  it('rejects an out-of-range confidence', () => {
    expect(() =>
      parseExtraction({ ...fallbackExtraction('Power failure in B-204.'), confidence: 2 }),
    ).toThrow();
  });

  it('extracts JSON from a fenced model response', () => {
    const payload = fallbackExtraction('Power failure in B-204.');
    const fenced = '```json\n' + JSON.stringify(payload) + '\n```';
    expect(extractJsonObject(fenced)).toEqual(payload);
  });

  it('extracts JSON surrounded by prose', () => {
    const payload = fallbackExtraction('Power failure in B-204.');
    expect(extractJsonObject(`Here you go: ${JSON.stringify(payload)} — thanks`)).toEqual(payload);
  });

  it('throws when there is no JSON at all', () => {
    expect(() => extractJsonObject('I cannot help with that.')).toThrow();
  });
});
