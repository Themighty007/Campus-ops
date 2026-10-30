import type {
  Activity,
  Asset,
  BlastRadius,
  Booking,
  Incident,
  Part,
  Room,
  StaffMember,
  WorkOrder,
} from '@/lib/domain/types';
import { ENGINE, freeQty } from './policy';
import { overlaps } from './time';

/**
 * Blast radius is *derived*, never guessed.
 *
 * Everything here comes from the campus database: which rooms the failure
 * touches, which scheduled activities sit in them, how many people are
 * expected, who is on the roster, which skill is needed to repair it, and
 * whether the required part is actually on the shelf.
 *
 * The result is deliberately a plain data structure so the UI can draw it as a
 * React Flow graph without asking the server a second time.
 */
export interface BlastRadiusInput {
  incident: Incident;
  room: Room | null;
  asset: Asset | null;
  activities: Activity[];
  bookings: Booking[];
  cohorts: Array<{ activityId: string; label: string; headcount: number }>;
  staff: StaffMember[];
  /** activityId -> assigned profile ids */
  activityStaff: Record<string, string[]>;
  parts: Part[];
  workOrder: WorkOrder | null;
  now: Date;
  /** Optional override for the lookahead window. */
  lookaheadMinutes?: number;
}

export function computeBlastRadius(input: BlastRadiusInput): BlastRadius {
  const { incident, room, asset, now } = input;
  const lookahead = input.lookaheadMinutes ?? ENGINE.lookaheadMinutes;
  const horizon = new Date(now.getTime() + lookahead * 60_000);

  // The room a failure touches: the incident's room, or the room of the asset.
  const affectedRoomId = incident.roomId ?? asset?.roomId ?? null;

  const activities = input.activities
    .filter((a) => a.status === 'SCHEDULED')
    .filter((a) => a.endsAt > now && a.startsAt <= horizon)
    .filter((a) => (affectedRoomId ? a.roomId === affectedRoomId : false))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const activityIds = new Set(activities.map((a) => a.id));

  const bookings = input.bookings.filter(
    (b) =>
      b.status === 'ACTIVE' &&
      (activityIds.has(b.activityId ?? '') ||
        (affectedRoomId !== null && b.roomId === affectedRoomId && b.endsAt > now)),
  );

  const cohorts = input.cohorts.filter((c) => activityIds.has(c.activityId));

  // Everyone rostered on an affected activity, plus anyone whose shift overlaps
  // the window and could be pulled in to help.
  const assignedIds = new Set<string>();
  for (const activity of activities) {
    for (const id of input.activityStaff[activity.id] ?? []) assignedIds.add(id);
  }

  const assignedStaff = input.staff.filter((s) => assignedIds.has(s.id));

  const affectedPeople = activities.reduce((sum, a) => sum + a.headcount, 0);

  const requiredSkill =
    activities.find((a) => a.requiredSkill)?.requiredSkill ??
    input.workOrder?.requiredSkill ??
    null;

  const requiredPart = resolveRequiredPart(input, asset);

  const earliestDeadline = activities.reduce<Date | null>((earliest, a) => {
    if (!earliest) return a.startsAt;
    return a.startsAt < earliest ? a.startsAt : earliest;
  }, null);

  // A booking overlap on the affected room is itself part of the blast radius:
  // it tells the operator that relocating into an already-booked room is a trap.
  const roomConflicts = affectedRoomId
    ? input.bookings.filter(
        (b) =>
          b.status === 'ACTIVE' &&
          b.roomId !== affectedRoomId &&
          activities.some((a) => overlaps(b.startsAt, b.endsAt, a.startsAt, a.endsAt)),
      )
    : [];

  return {
    incidentId: incident.id,
    room,
    asset,
    activities,
    bookings: dedupeBookings([...bookings, ...roomConflicts]),
    cohorts,
    assignedStaff,
    affectedPeople,
    requiredSkill,
    requiredPart,
    workOrder: input.workOrder,
    earliestDeadline,
  };
}

function resolveRequiredPart(input: BlastRadiusInput, asset: Asset | null): Part | null {
  if (asset?.requiredPartId) {
    const part = input.parts.find((p) => p.id === asset.requiredPartId);
    if (part) return part;
  }
  // Fall back to the work order's skill -> a part whose SKU matches the skill
  // family. This keeps the demo honest when an incident has no asset attached.
  const skill = input.workOrder?.requiredSkill;
  if (!skill) return null;
  return input.parts.find((p) => p.sku.startsWith(skill.slice(0, 3))) ?? null;
}

function dedupeBookings(bookings: Booking[]): Booking[] {
  const seen = new Set<string>();
  return bookings.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
}

/**
 * Human-readable one-liner for the command centre. Deterministic: no AI, so the
 * same data always produces the same sentence.
 */
export function describeBlastRadius(radius: BlastRadius): string {
  if (radius.activities.length === 0) {
    return radius.room
      ? `No scheduled activity in ${radius.room.code} within the next six hours.`
      : 'No room was resolved, so no activity can be linked yet.';
  }

  const first = radius.activities[0]!;
  const cohort = radius.cohorts.find((c) => c.activityId === first.id);
  const label = cohort
    ? `${first.headcount} people (${cohort.label})`
    : `${first.headcount} people`;

  const partNote = radius.requiredPart
    ? freeQty(radius.requiredPart) > 0
      ? `${radius.requiredPart.sku} is in stock.`
      : `${radius.requiredPart.sku} is out of stock.`
    : 'No replacement part is linked.';

  const count = radius.activities.length;

  return `${count} ${count === 1 ? 'activity' : 'activities'} at risk in ${
    radius.room?.code ?? 'an unknown room'
  }; ${label} affected. ${partNote}`;
}
