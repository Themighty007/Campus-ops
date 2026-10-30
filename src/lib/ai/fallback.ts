import type { ExtractionPayload } from './schema';
import type { IncidentCategory } from '@/lib/domain/enums';
import { SAFETY_KEYWORDS } from '@/lib/domain/enums';

/**
 * Deterministic keyword fallback.
 *
 * This is not a degraded mode — it is a supported mode. When the model is
 * slow, rate-limited, or the API key is absent, the demo still behaves
 * correctly for the seeded scenarios, and the UI labels the result
 * "keyword extraction" instead of pretending an LLM was involved.
 *
 * It is intentionally conservative: it never invents a room, and it always
 * flags missing information.
 */

interface CategoryRule {
  category: IncidentCategory;
  subtype: string;
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'SAFETY',
    subtype: 'hazard',
    keywords: ['fire', 'smoke', 'spark', 'sparks', 'shock', 'gas leak', 'collapse', 'live wire', 'burning'],
  },
  {
    category: 'NETWORK',
    subtype: 'connectivity',
    keywords: ['wifi', 'wi-fi', 'network', 'internet', 'switch', 'router', 'access point', 'ethernet', 'lan', 'fibre', 'fiber', 'no signal'],
  },
  {
    category: 'ELECTRICAL',
    subtype: 'power',
    keywords: ['power', 'electricity', 'electrical', 'mcb', 'breaker', 'circuit', 'socket', 'plug', 'fuse', 'voltage', 'short circuit', 'lights out', 'lighting'],
  },
  {
    category: 'PLUMBING',
    subtype: 'water',
    keywords: ['water', 'leak', 'pipe', 'tap', 'toilet', 'drain', 'flood', 'flooding'],
  },
  {
    category: 'HVAC',
    subtype: 'climate',
    keywords: ['air conditioning', 'a/c', ' ac ', 'cooling', 'heating', 'ventilation', 'hvac', 'stuffy'],
  },
  {
    category: 'AV',
    subtype: 'audio_visual',
    keywords: ['projector', 'speaker', 'microphone', 'mic ', 'pa system', 'screen', 'audio', 'display'],
  },
  {
    category: 'CIVIL',
    subtype: 'structure',
    keywords: ['wall', 'ceiling', 'floor', 'door', 'window', 'roof', 'broken glass'],
  },
  {
    category: 'HOUSEKEEPING',
    subtype: 'cleaning',
    keywords: ['clean', 'cleaning', 'spill', 'rubbish', 'trash', 'garbage', 'dirty'],
  },
];

const BUILDING_HINTS = [
  'b block',
  'main block',
  'library',
  'north campus',
  'engineering block',
  'c block',
  'workshop',
  'grounds',
];

const ROOM_CODE = /\b([A-Z]{1,3})-?(\d{1,3}[A-Z]?)\b/;
const ROOM_NAMED = /\b(auditorium\s*a?|library hall|seminar hall|new seminar complex|central auditorium|open air theatre|network lab\s*\d?|lab\s*\d|lecture theatre\s*[a-z]?-?\d*)\b/i;
const MINUTES = /\b(?:in|after|within)?\s*(\d{1,3})\s*(?:min|mins|minutes)\b/i;
const HOURS = /\b(?:in|after|within)?\s*(\d{1,2})\s*(?:hour|hours|hrs)\b/i;
const HALF_HOUR = /\bhalf an hour\b|\b30 min\b/i;

export function fallbackExtraction(rawText: string): ExtractionPayload {
  const text = ` ${rawText.toLowerCase().replace(/\s+/g, ' ')} `;

  const safetyHit = SAFETY_KEYWORDS.some((word) => text.includes(word));

  let category: IncidentCategory = 'OTHER';
  let subtype = 'general';
  if (safetyHit) {
    category = 'SAFETY';
    subtype = 'hazard';
  } else {
    for (const rule of CATEGORY_RULES) {
      if (rule.keywords.some((word) => text.includes(word))) {
        category = rule.category;
        subtype = rule.subtype;
        break;
      }
    }
  }

  const roomHint = detectRoom(rawText);
  const buildingHint = BUILDING_HINTS.find((b) => text.includes(b)) ?? null;
  const assetHint = detectAsset(text);

  const deadlineHintMinutes = detectDeadline(text);

  const affectedActivity = detectActivity(text);

  const urgency: ExtractionPayload['urgency'] = safetyHit
    ? 'CRITICAL'
    : deadlineHintMinutes !== null && deadlineHintMinutes <= 30
      ? 'CRITICAL'
      : deadlineHintMinutes !== null && deadlineHintMinutes <= 120
        ? 'HIGH'
        : /urgent|immediately|asap|now/.test(text)
          ? 'HIGH'
          : 'MEDIUM';

  const missingFields: string[] = [];
  if (!roomHint) missingFields.push('room');
  if (!buildingHint && !roomHint) missingFields.push('building');

  const clarifyingQuestion = !roomHint
    ? 'Which room or building is affected? A room code such as B-204 is enough.'
    : null;

  const summary = buildSummary(rawText, category, roomHint);

  return {
    category,
    subtype,
    buildingHint,
    roomHint,
    assetHint,
    urgency,
    isSafetyRisk: safetyHit,
    affectedActivity,
    deadlineHintMinutes,
    missingFields,
    clarifyingQuestion,
    summary,
    confidence: roomHint ? 0.62 : 0.4,
    spans: roomHint
      ? [
          {
            field: 'roomHint',
            text: roomHint,
            start: Math.max(0, rawText.toLowerCase().indexOf(roomHint.toLowerCase())),
            end:
              Math.max(0, rawText.toLowerCase().indexOf(roomHint.toLowerCase())) + roomHint.length,
          },
        ]
      : [],
  };
}

function detectRoom(rawText: string): string | null {
  const code = rawText.match(ROOM_CODE);
  if (code) {
    const prefix = code[1] ?? '';
    const digits = code[2] ?? '';
    if (prefix.length <= 3) return `${prefix}-${digits}`.toUpperCase();
  }

  const named = rawText.match(ROOM_NAMED);
  if (named?.[1]) return titleCase(named[1].trim());

  return null;
}

function detectAsset(text: string): string | null {
  if (/\b(panel|mcb|breaker|distribution board)\b/.test(text)) return 'electrical panel';
  if (/\b(switch|router|access point|ap)\b/.test(text)) return 'network switch';
  if (/\b(projector)\b/.test(text)) return 'projector';
  if (/\b(ac unit|air conditioner)\b/.test(text)) return 'air conditioner';
  return null;
}

function detectDeadline(text: string): number | null {
  if (HALF_HOUR.test(text)) return 30;

  const minutes = text.match(MINUTES);
  if (minutes?.[1]) return Number(minutes[1]);

  const hours = text.match(HOURS);
  if (hours?.[1]) return Number(hours[1]) * 60;

  return null;
}

function detectActivity(text: string): ExtractionPayload['affectedActivity'] {
  if (/\bexam|examination|test\b/.test(text)) return 'EXAM';
  if (/\blab|practical\b/.test(text)) return 'LAB';
  if (/\blecture|class|seminar\b/.test(text)) return 'CLASS';
  if (/\bevent|placement|conference|ceremony\b/.test(text)) return 'EVENT';
  return 'UNKNOWN';
}

function buildSummary(rawText: string, category: IncidentCategory, roomHint: string | null): string {
  const firstSentence = rawText.split(/[.!?]/)[0]?.trim() ?? rawText.trim();
  const clipped = firstSentence.slice(0, 160);
  const prefix = roomHint ? `${roomHint}: ` : '';
  return `${prefix}${clipped || category.toLowerCase() + ' fault'}`.slice(0, 240);
}

function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
