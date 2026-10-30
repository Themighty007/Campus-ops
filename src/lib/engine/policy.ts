import type {
  Activity,
  Booking,
  Part,
  ResourceSnapshot,
  Room,
  ScoreFactors,
  StaffMember,
} from '@/lib/domain/types';

/** Deterministic tuning knobs. No magic numbers scattered through the code. */
export const ENGINE = {
  /** A technician with this many open jobs is not offered new work. */
  maxOpenWorkOrders: 3,
  /** How far ahead we look for activities that a failure can disrupt. */
  lookaheadMinutes: 360,
  /** Plans expire if not approved in time; the demo relies on this. */
  planTtlMinutes: 30,
  /** Minimum share of headcount a room must hold to be considered for a split. */
  splitRoomMinShare: 0.25,
  /** Ranking weights, in the order the product cares about them. */
  weights: {
    time: 0.4,
    changes: 0.3,
    cost: 0.2,
    disruption: 0.1,
  } as const,
  /** Thresholds for report correlation. */
  correlation: {
    duplicate: 0.7,
    related: 0.35,
    maxAgeMinutes: 120,
  },
} as const;

export function freeQty(part: Part): number {
  return part.qtyAvailable - part.qtyReserved;
}

export function hasCapabilities(required: string[], available: string[]): boolean {
  return required.every((c) => available.includes(c));
}

export function staffCoversWindow(staff: StaffMember, start: Date, end: Date): boolean {
  return staff.shifts.some((s) => s.startsAt <= start && s.endsAt >= end);
}

export function isStaffAvailable(
  staff: StaffMember,
  activity: Activity,
  maxOpenWorkOrders = ENGINE.maxOpenWorkOrders,
): boolean {
  // A person already committed to an overlapping session is not available,
  // even if they hold the right skill and are on shift.
  const hasClash = staff.busyWindows.some(
    (w) =>
      w.activityId !== activity.id &&
      w.startsAt < activity.endsAt &&
      activity.startsAt < w.endsAt,
  );

  return (
    staffCoversWindow(staff, activity.startsAt, activity.endsAt) &&
    staff.openWorkOrders < maxOpenWorkOrders &&
    !hasClash
  );
}

export function buildResourceSnapshot(args: {
  rooms: Room[];
  bookings: Booking[];
  parts: Part[];
  activityIds: string[];
  workOrder?: { id: string; version: number } | null;
}): ResourceSnapshot {
  const bookingVersions: Record<string, number> = {};
  const trackedRoomIds = new Set(args.rooms.map((r) => r.id));
  const trackedActivityIds = new Set(args.activityIds);
  for (const b of args.bookings) {
    // Track the rooms the plan moves into *and* the booking of the activity
    // being moved. The latter is what lets revalidation notice that someone
    // else relocated the exam while the plan sat waiting for approval. A
    // booking in an unrelated room is deliberately not tracked: it cannot
    // invalidate this plan, and tracking it would make plans go stale for no
    // reason.
    const isTargetRoom = trackedRoomIds.has(b.roomId);
    const isAffectedActivity = b.activityId !== null && trackedActivityIds.has(b.activityId);
    if (isTargetRoom || isAffectedActivity) {
      bookingVersions[b.id] = b.version;
    }
  }

  const partFreeQty: Record<string, number> = {};
  for (const p of args.parts) {
    partFreeQty[p.id] = freeQty(p);
  }

  return {
    roomIds: args.rooms.map((r) => r.id),
    activityIds: args.activityIds,
    partIds: args.parts.map((p) => p.id),
    bookingIds: Object.keys(bookingVersions),
    bookingVersions,
    partFreeQty,
    workOrderId: args.workOrder?.id,
    workOrderVersion: args.workOrder?.version,
  };
}

/**
 * Transparent scoring. Every factor is returned so the UI can show *why* a plan
 * ranked where it did, instead of an unexplained "92% confidence".
 */
export function normalise(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, value / max);
}

export function scoreFromFactors(factors: ScoreFactors, max: ScoreFactors): number {
  const t = 1 - normalise(factors.time, max.time);
  const c = 1 - normalise(factors.changes, max.changes);
  const k = 1 - normalise(factors.cost, max.cost);
  const d = 1 - normalise(factors.disruption, max.disruption);

  const w = ENGINE.weights;
  const raw = w.time * t + w.changes * c + w.cost * k + w.disruption * d;
  return Math.round(raw * 1000) / 10;
}

export function maxFactors(list: ScoreFactors[]): ScoreFactors {
  return list.reduce<ScoreFactors>(
    (acc, f) => ({
      time: Math.max(acc.time, f.time),
      changes: Math.max(acc.changes, f.changes),
      cost: Math.max(acc.cost, f.cost),
      disruption: Math.max(acc.disruption, f.disruption),
    }),
    { time: 0, changes: 0, cost: 0, disruption: 0 },
  );
}
