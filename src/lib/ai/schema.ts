import { z } from 'zod';
import { INCIDENT_CATEGORIES, type IncidentCategory } from '@/lib/domain/enums';

const categoryValues = [...INCIDENT_CATEGORIES] as [IncidentCategory, ...IncidentCategory[]];

/**
 * The extraction contract.
 *
 * The model may only return these fields. It never returns a room id, a staff
 * id, a part id, or a decision — only text hints and a category. Resolution
 * against real records happens in TypeScript, and safety is overridden
 * deterministically afterwards.
 */
export const ExtractionSchema = z.object({
  category: z.enum(categoryValues),
  subtype: z.string().max(60).nullable().default(null),
  buildingHint: z.string().max(120).nullable().default(null),
  roomHint: z.string().max(120).nullable().default(null),
  assetHint: z.string().max(120).nullable().default(null),
  urgency: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  isSafetyRisk: z.boolean().default(false),
  affectedActivity: z
    .enum(['EXAM', 'CLASS', 'LAB', 'EVENT', 'NONE', 'UNKNOWN'])
    .default('UNKNOWN'),
  deadlineHintMinutes: z.number().int().min(0).max(10080).nullable().default(null),
  missingFields: z.array(z.string().max(40)).max(8).default([]),
  clarifyingQuestion: z.string().max(240).nullable().default(null),
  summary: z.string().min(3).max(240),
  confidence: z.number().min(0).max(1).default(0.5),
  spans: z
    .array(
      z.object({
        field: z.string().max(40),
        text: z.string().max(240),
        start: z.number().int().min(0),
        end: z.number().int().min(0),
      }),
    )
    .max(12)
    .default([]),
});

export type ExtractionPayload = z.infer<typeof ExtractionSchema>;

/** JSON Schema handed to the model as part of the prompt. */
export const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'category',
    'subtype',
    'buildingHint',
    'roomHint',
    'assetHint',
    'urgency',
    'isSafetyRisk',
    'affectedActivity',
    'deadlineHintMinutes',
    'missingFields',
    'clarifyingQuestion',
    'summary',
    'confidence',
  ],
  properties: {
    category: { type: 'string', enum: categoryValues },
    subtype: { type: ['string', 'null'] },
    buildingHint: { type: ['string', 'null'] },
    roomHint: { type: ['string', 'null'] },
    assetHint: { type: ['string', 'null'] },
    urgency: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
    isSafetyRisk: { type: 'boolean' },
    affectedActivity: {
      type: 'string',
      enum: ['EXAM', 'CLASS', 'LAB', 'EVENT', 'NONE', 'UNKNOWN'],
    },
    deadlineHintMinutes: { type: ['integer', 'null'], minimum: 0, maximum: 10080 },
    missingFields: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    clarifyingQuestion: { type: ['string', 'null'] },
    summary: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const;

export const EXTRACTION_SYSTEM_PROMPT = `You extract structured facts from a campus facilities report.
Rules:
- Return JSON only. No prose, no markdown.
- category must be one of the allowed values.
- roomHint is the room text the reporter used (e.g. "B-204", "lab 3"). Never invent a room.
- If the room is not stated, set roomHint to null and add "room" to missingFields.
- If the reporter mentions a deadline ("starts in 30 minutes"), set deadlineHintMinutes.
- isSafetyRisk is true only for fire, sparks, smoke, shock, gas, collapse, or a live wire.
- confidence is your own certainty about the category and room only.
- summary is one short factual sentence, no advice.`;

export function parseExtraction(raw: unknown): ExtractionPayload {
  return ExtractionSchema.parse(raw);
}

/** Best-effort extraction of a JSON object from a model response. */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through: some providers wrap JSON in a code fence.
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // Fall through.
    }
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1));
  }

  throw new Error('Model response contained no JSON object.');
}
