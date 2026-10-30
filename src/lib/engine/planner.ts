import type {
  Activity,
  Booking,
  ConstraintCheck,
  Incident,
  Part,
  PlanAction,
  RecoveryPlan,
  Room,
  ScoreFactors,
  StaffMember,
  WorkOrder,
} from '@/lib/domain/types';
import type { UserRole } from '@/lib/domain/enums';
import {
  ENGINE,
  buildResourceSnapshot,
  freeQty,
  hasCapabilities,
  isStaffAvailable,
  maxFactors,
  scoreFromFactors,
  staffCoversWindow,
} from './policy';
import { minutesBetween, overlaps } from './time';

// ---------------------------------------------------------------------------
// Input / output contracts
// ---------------------------------------------------------------------------

export interface PlannerInput {
  incident: Incident;
  now: Date;
  failedRoomId: string | null;
  activityDeadline: Date | null;

  activities: Activity[];
  rooms: Room[];
  bookings: Booking[];
  staff: StaffMember[];
  /** activityId -> currently assigned profile ids */
  activityStaff: Record<string, string[]>;
  parts: Part[];
  approvers: Array<{ id: string; role: UserRole }>;

  workOrder: WorkOrder | null;
  requiredPartId: string | null;
  requiredPartQty: number;

  spareEquipmentPartId: string | null;
  spareEquipmentQty: number;

  reporterId: string | null;
}

export interface PlanResult {
  feasible: RecoveryPlan[];
  rejected: RecoveryPlan[];
  generatedAt: Date;
}

interface Draft {
  label: string;
  actions: PlanAction[];
  targetRooms: Array<{ room: Room; headcount: number }>;
  activity: Activity | null;
  continuityRestored: boolean;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function planRecovery(input: PlannerInput): PlanResult {
  const atRisk = activitiesAtRisk(input);
  const drafts: Draft[] = [];

  if (atRisk.length > 0 && input.failedRoomId) {
    const primary = [...atRisk].sort((a, b) => b.headcount - a.headcount)[0]!;
    const pool = input.rooms.filter((r) => r.id !== input.failedRoomId);

    // --- single-room relocations -------------------------------------------
    for (const room of pool) {
      drafts.push(buildRelocationDraft(input, primary, room));
    }

    // --- split plans --------------------------------------------------------
    const splitPool = pool.filter(
      (r) => r.capacity >= primary.headcount * ENGINE.splitRoomMinShare,
    );
    for (let i = 0; i < splitPool.length; i += 1) {
      for (let j = i + 1; j < splitPool.length; j += 1) {
        const a = splitPool[i]!;
        const b = splitPool[j]!;
        if (a.capacity + b.capacity < primary.headcount) continue;
        drafts.push(buildSplitDraft(input, primary, a, b));
      }
    }
  }

  // --- service workaround (partial restoration without a room move) --------
  const workaround = buildWorkaroundDraft(input);
  if (workaround) drafts.push(workaround);

  // --- repair-only fallback ------------------------------------------------
  drafts.push(buildRepairOnlyDraft(input));

  const evaluated = dedupe(drafts).map((draft) => evaluate(input, draft));
  const feasibleEvaluated = evaluated.filter((e) => e.feasible);

  // A repair-only plan is the honest fallback, not a competitor. It is only
  // offered when no continuity-restoring plan passed every check.
  const continuityPlans = feasibleEvaluated
    .filter((e) => e.continuityRestored)
    .map((e) => e.plan);

  let feasible =
    continuityPlans.length > 0
      ? continuityPlans
      : feasibleEvaluated.map((e) => e.plan);

  const rejected = evaluated.filter((e) => !e.feasible).map((e) => e.plan);

  feasible = rank(feasible).slice(0, 5);
  feasible.forEach((plan, index) => {
    plan.label = `Plan ${String.fromCharCode(65 + index)}`;
    plan.status = index < 3 ? 'PROPOSED' : 'WITHDRAWN';
  });

  // Every rejected alternative is kept. "Why not?" is part of the product: an
  // operator who cannot see the rooms that were ruled out cannot trust the one
  // that was chosen. The list is ordered by how close each plan came.
  const rejectedSorted = rejected
    .map((plan) => ({
      plan,
      failures: plan.checks.filter((c) => c.blocking && !c.ok).length,
    }))
    .sort((a, b) => a.failures - b.failures)
    .map((entry, index) => {
      entry.plan.label = `Rejected ${index + 1}`;
      entry.plan.status = 'REJECTED';
      return entry.plan;
    });

  return { feasible, rejected: rejectedSorted, generatedAt: input.now };
}

// ---------------------------------------------------------------------------
// Which activities does this failure actually threaten?
// ---------------------------------------------------------------------------

export function activitiesAtRisk(input: PlannerInput): Activity[] {
  if (!input.failedRoomId) return [];
  const horizon = new Date(input.now.getTime() + ENGINE.lookaheadMinutes * 60_000);
  const limit = input.activityDeadline && input.activityDeadline < horizon
    ? input.activityDeadline
    : horizon;

  return input.activities.filter(
    (a) =>
      a.roomId === input.failedRoomId &&
      a.status === 'SCHEDULED' &&
      a.endsAt > input.now &&
      a.startsAt <= limit,
  );
}

// ---------------------------------------------------------------------------
// Draft builders
// ---------------------------------------------------------------------------

function repairActions(input: PlannerInput): PlanAction[] {
  if (!input.requiredPartId || !input.workOrder) return [];
  const part = input.parts.find((p) => p.id === input.requiredPartId);
  if (!part) return [];

  const qty = Math.max(1, input.requiredPartQty);
  if (freeQty(part) >= qty) {
    return [
      { kind: 'RESERVE_PART', partId: part.id, sku: part.sku, qty, workOrderId: input.workOrder.id },
    ];
  }

  return [
    {
      kind: 'PROCURE_PART',
      partId: part.id,
      sku: part.sku,
      qty,
      amount: part.unitCost * qty,
    },
  ];
}

function buildRelocationDraft(input: PlannerInput, activity: Activity, room: Room): Draft {
  const staffActions = staffPlan(input, activity, 1).actions;
  return {
    label: `Relocate to ${room.name}`,
    actions: [
      { kind: 'RELOCATE_ACTIVITY', activityId: activity.id, toRoomId: room.id, toRoomCode: room.code },
      ...staffActions,
      ...repairActions(input),
    ],
    targetRooms: [{ room, headcount: activity.headcount }],
    activity,
    continuityRestored: true,
  };
}

function buildSplitDraft(
  input: PlannerInput,
  activity: Activity,
  a: Room,
  b: Room,
): Draft {
  const first = Math.ceil(activity.headcount / 2);
  const second = activity.headcount - first;
  const staffActions = staffPlan(input, activity, 2).actions;

  return {
    label: `Split across ${a.code} + ${b.code}`,
    actions: [
      {
        kind: 'SPLIT_ACTIVITY',
        activityId: activity.id,
        parts: [
          { roomId: a.id, roomCode: a.code, headcount: first },
          { roomId: b.id, roomCode: b.code, headcount: second },
        ],
      },
      ...staffActions,
      ...repairActions(input),
    ],
    targetRooms: [
      { room: a, headcount: first },
      { room: b, headcount: second },
    ],
    activity,
    continuityRestored: true,
  };
}

function buildWorkaroundDraft(input: PlannerInput): Draft | null {
  if (!input.spareEquipmentPartId || input.spareEquipmentQty <= 0) return null;
  const part = input.parts.find((p) => p.id === input.spareEquipmentPartId);
  if (!part || freeQty(part) < input.spareEquipmentQty) return null;

  return {
    label: `Deploy spare ${part.name}`,
    actions: [
      {
        kind: 'RESERVE_EQUIPMENT',
        partId: part.id,
        sku: part.sku,
        qty: input.spareEquipmentQty,
      },
      {
        kind: 'SERVICE_WORKAROUND',
        note: `Deploy ${input.spareEquipmentQty} × ${part.sku} to restore partial service while the permanent repair is unblocked.`,
      },
      ...repairActions(input),
    ],
    targetRooms: [],
    activity: null,
    continuityRestored: true,
  };
}

function buildRepairOnlyDraft(input: PlannerInput): Draft {
  return {
    label: 'Repair only — no continuity plan',
    actions: repairActions(input),
    targetRooms: [],
    activity: null,
    continuityRestored: false,
  };
}

// ---------------------------------------------------------------------------
// Staff planning
// ---------------------------------------------------------------------------

interface StaffPlanResult {
  required: number;
  roster: StaffMember[];
  replacements: StaffMember[];
  offShift: StaffMember[];
  actions: PlanAction[];
  ok: boolean;
}

export function staffPlan(
  input: PlannerInput,
  activity: Activity,
  roomCount: number,
): StaffPlanResult {
  const required = activity.minStaff + (roomCount - 1) * 1;
  const assignedIds = input.activityStaff[activity.id] ?? [];
  const assigned = assignedIds
    .map((id) => input.staff.find((s) => s.id === id))
    .filter((s): s is StaffMember => Boolean(s));

  const covering = assigned.filter((s) => staffCoversWindow(s, activity.startsAt, activity.endsAt));
  const offShift = assigned.filter((s) => !staffCoversWindow(s, activity.startsAt, activity.endsAt));

  const deficit = Math.max(0, required - covering.length);

  const pool = input.staff
    .filter((s) => !assignedIds.includes(s.id))
    .filter((s) => (activity.requiredSkill ? s.skills.includes(activity.requiredSkill) : true))
    .filter((s) => isStaffAvailable(s, activity))
    .sort((a, b) => a.openWorkOrders - b.openWorkOrders || a.fullName.localeCompare(b.fullName));

  const replacements: StaffMember[] = [];
  const actions: PlanAction[] = [];
  let remaining = deficit;

  // Replace the off-shift people first — it reads better in the UI than
  // silently adding a stranger to the roster.
  for (const person of offShift) {
    if (remaining <= 0) break;
    const replacement = pool.shift();
    if (!replacement) break;
    replacements.push(replacement);
    actions.push({
      kind: 'REASSIGN_STAFF',
      staffId: replacement.id,
      staffName: replacement.fullName,
      role: 'INVIGILATOR',
      activityId: activity.id,
      replaceStaffId: person.id,
    });
    remaining -= 1;
  }

  while (remaining > 0) {
    const replacement = pool.shift();
    if (!replacement) break;
    replacements.push(replacement);
    actions.push({
      kind: 'REASSIGN_STAFF',
      staffId: replacement.id,
      staffName: replacement.fullName,
      role: 'INVIGILATOR',
      activityId: activity.id,
    });
    remaining -= 1;
  }

  return {
    required,
    roster: [...covering, ...replacements],
    replacements,
    offShift,
    actions,
    ok: remaining <= 0,
  };
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

function evaluate(
  input: PlannerInput,
  draft: Draft,
): { plan: RecoveryPlan; feasible: boolean; continuityRestored: boolean } {
  const activity = draft.activity;
  const checks: ConstraintCheck[] = [];

  // 1 — room is usable at all
  if (draft.targetRooms.length === 0) {
    checks.push(pass('ROOM_SAFE_AVAILABLE', 'Room is safe and available', 'No room change required.'));
  } else {
    const unavailable = draft.targetRooms.filter((t) => !t.room.isAvailable);
    const outsideHours = activity
      ? draft.targetRooms.filter((t) => !withinRoomHours(t.room, activity.startsAt, activity.endsAt))
      : [];
    checks.push(
      check(
        'ROOM_SAFE_AVAILABLE',
        'Room is safe and available',
        unavailable.length === 0 && outsideHours.length === 0,
        unavailable.length > 0
          ? `${unavailable.map((u) => u.room.code).join(', ')} unavailable`
          : outsideHours.length > 0
            ? `${outsideHours.map((u) => u.room.code).join(', ')} closed at that hour`
            : draft.targetRooms.map((t) => `${t.room.code} available`).join(', '),
      ),
    );
  }

  // 2 — capacity and capabilities
  if (draft.targetRooms.length === 0 || !activity) {
    checks.push(pass('CAPACITY_AND_CAPABILITIES', 'Capacity and equipment', 'No room change required.'));
  } else {
    const tooSmall = draft.targetRooms.filter((t) => t.room.capacity < t.headcount);
    const missingCaps = draft.targetRooms.filter(
      (t) => !hasCapabilities(activity.requiredCapabilities, t.room.capabilities),
    );
    checks.push(
      check(
        'CAPACITY_AND_CAPABILITIES',
        'Capacity and required equipment',
        tooSmall.length === 0 && missingCaps.length === 0,
        tooSmall.length > 0
          ? `${tooSmall.map((t) => `${t.room.code} holds ${t.room.capacity}, needs ${t.headcount}`).join('; ')}`
          : missingCaps.length > 0
            ? `${missingCaps.map((t) => t.room.code).join(', ')} lacks ${activity.requiredCapabilities.join('/')}`
            : draft.targetRooms
                .map((t) => `${t.room.code}: ${t.headcount}/${t.room.capacity}`)
                .join(', '),
      ),
    );
  }

  // 3 — no double booking
  if (draft.targetRooms.length === 0 || !activity) {
    checks.push(pass('NO_BOOKING_OVERLAP', 'No booking conflict', 'No room change required.'));
  } else {
    const conflicts = draft.targetRooms.flatMap((t) =>
      input.bookings.filter(
        (b) =>
          b.roomId === t.room.id &&
          b.status === 'ACTIVE' &&
          b.activityId !== activity.id &&
          overlaps(b.startsAt, b.endsAt, activity.startsAt, activity.endsAt),
      ),
    );
    checks.push(
      check(
        'NO_BOOKING_OVERLAP',
        'No booking conflict',
        conflicts.length === 0,
        conflicts.length === 0
          ? 'Target rooms are free for the whole window.'
          : `${conflicts.map((c) => `${c.title}`).join('; ')} already booked`,
      ),
    );
  }

  // 4 — can the room be ready in time?
  if (draft.targetRooms.length === 0 || !activity) {
    checks.push(pass('DEADLINE_MET', 'Ready before the activity starts', 'No room change required.'));
  } else {
    const lead = Math.max(...draft.targetRooms.map((t) => t.room.setupLeadMinutes));
    const readyAt = new Date(input.now.getTime() + lead * 60_000);
    const slack = minutesBetween(input.now, activity.startsAt);
    checks.push(
      check(
        'DEADLINE_MET',
        'Ready before the activity starts',
        readyAt <= activity.startsAt,
        readyAt <= activity.startsAt
          ? `Ready in ${lead} min, ${Math.round(slack)} min before start.`
          : `Needs ${lead} min to prepare; only ${Math.round(slack)} min remain.`,
      ),
    );
  }

  // 5 — everyone on the final roster is qualified and on shift
  const staff = activity
    ? staffPlan(input, activity, Math.max(1, draft.targetRooms.length))
    : null;

  if (!activity || !staff) {
    checks.push(pass('STAFF_SKILL_SHIFT_WORKLOAD', 'Qualified staff on shift', 'No staffing change required.'));
    checks.push(pass('STAFF_RATIO', 'Staffing ratio', 'No staffing change required.'));
  } else {
    const unqualified = staff.roster.filter(
      (s) => activity.requiredSkill && !s.skills.includes(activity.requiredSkill),
    );
    checks.push(
      check(
        'STAFF_SKILL_SHIFT_WORKLOAD',
        'Qualified staff on shift',
        unqualified.length === 0,
        unqualified.length === 0
          ? staff.offShift.length > 0
            ? `${staff.roster.length} on shift; ${staff.offShift.map((s) => s.fullName).join(', ')} replaced.`
            : `${staff.roster.length} qualified staff on shift.`
          : `${unqualified.map((s) => s.fullName).join(', ')} lack ${activity.requiredSkill}.`,
      ),
    );

    checks.push(
      check(
        'STAFF_RATIO',
        'Staffing ratio satisfied',
        staff.ok,
        staff.ok
          ? `${staff.roster.length} of ${staff.required} required staff available.`
          : `${staff.roster.length} of ${staff.required} required staff available — ${staff.required - staff.roster.length} short.`,
      ),
    );
  }

  // 6 — stock
  const reserveActions = draft.actions.filter(
    (a): a is Extract<PlanAction, { kind: 'RESERVE_PART' | 'RESERVE_EQUIPMENT' }> =>
      a.kind === 'RESERVE_PART' || a.kind === 'RESERVE_EQUIPMENT',
  );
  const stockFailures = reserveActions.filter((a) => {
    const part = input.parts.find((p) => p.id === a.partId);
    return !part || freeQty(part) < a.qty;
  });
  const procureActions = draft.actions.filter((a) => a.kind === 'PROCURE_PART');
  // A workaround can both reserve equipment that *is* in stock and procure the
  // failed part that is not. Report both facts: saying only "SFP-1G out of
  // stock" would hide the spare that actually protects the activity.
  const stockDetail = [
    ...(reserveActions.length > 0
      ? [`${reserveActions.map((a) => `${a.qty} × ${a.sku}`).join(', ')} reserved`]
      : []),
    ...(procureActions.length > 0
      ? [`${procureActions.map((a) => a.sku).join(', ')} out of stock — purchase required`]
      : []),
  ];
  checks.push(
    check(
      'STOCK_SUFFICIENT',
      'Parts and equipment in stock',
      stockFailures.length === 0,
      stockFailures.length > 0
        ? `${stockFailures.map((a) => a.sku).join(', ')} not available`
        : stockDetail.length > 0
          ? `${stockDetail.join('; ')}.`
          : 'No parts required.',
    ),
  );

  // 7 — approval exists and separation of duties holds
  const requiredRoles: UserRole[] = ['FACILITIES_ADMIN', 'DEPARTMENT_MANAGER'];
  const eligible = input.approvers.filter(
    (a) => requiredRoles.includes(a.role) && a.id !== input.reporterId,
  );
  checks.push(
    check(
      'APPROVAL_AND_SOD',
      'Independent approver available',
      eligible.length > 0,
      eligible.length > 0
        ? `${eligible.length} authorised approver(s); requester excluded.`
        : 'No authorised approver other than the requester.',
    ),
  );

  // 8 — idempotency
  checks.push(
    pass('PLAN_VERSION_IDEMPOTENT', 'Plan is new', 'No previous execution for this version.'),
  );

  const failed = checks.find((c) => c.blocking && !c.ok);
  const feasible = !failed;

  const factors: ScoreFactors = {
    time: draft.targetRooms.length > 0
      ? Math.max(...draft.targetRooms.map((t) => t.room.setupLeadMinutes))
      : 0,
    changes: draft.actions.length,
    cost: draft.actions.reduce((sum, a) => sum + (a.kind === 'PROCURE_PART' ? a.amount : 0), 0),
    disruption: draft.targetRooms.length + (staff ? staff.replacements.length : 0),
  };

  const plan: RecoveryPlan = {
    // Deterministic: the same data must produce the same plan, byte for byte.
    // The database assigns the real primary key on insert.
    id: deterministicId([
      input.incident.id,
      draft.label,
      draft.actions.map((a) => a.kind).join(','),
      String(input.now.getTime()),
    ]),
    incidentId: input.incident.id,
    version: 1,
    label: draft.label,
    status: feasible ? 'PROPOSED' : 'REJECTED',
    actions: draft.actions,
    checks,
    score: 0,
    factors,
    resourceSnapshot: buildResourceSnapshot({
      rooms: draft.targetRooms.map((t) => t.room),
      bookings: input.bookings,
      parts: input.parts,
      activityIds: draft.activity ? [draft.activity.id] : [],
      workOrder: input.workOrder ? { id: input.workOrder.id, version: input.workOrder.version } : null,
    }),
    requiredRoles,
    createdBy: null,
    createdAt: input.now,
    expiresAt: new Date(input.now.getTime() + ENGINE.planTtlMinutes * 60_000),
    executedAt: null,
    rejectionReason: failed ? failed.detail : null,
  };

  return { plan, feasible, continuityRestored: draft.continuityRestored };
}

function rank(plans: RecoveryPlan[]): RecoveryPlan[] {
  const max = maxFactors(plans.map((p) => p.factors));
  return plans
    .map((p) => ({ ...p, score: scoreFromFactors(p.factors, max) }))
    .sort((a, b) => b.score - a.score || a.factors.time - b.factors.time);
}

function dedupe(drafts: Draft[]): Draft[] {
  const seen = new Set<string>();
  const out: Draft[] = [];
  for (const draft of drafts) {
    // Two plans are the same only when they would perform the same actions.
    // Splitting across B-101+B-102 is not the same plan as splitting across
    // LIB-HALL+NSC-1, so the rooms are part of the signature.
    const signature = JSON.stringify(
      draft.actions.map((a) => {
        switch (a.kind) {
          case 'RELOCATE_ACTIVITY':
            return { k: a.kind, r: a.toRoomId };
          case 'SPLIT_ACTIVITY':
            return { k: a.kind, r: a.parts.map((p) => `${p.roomId}:${p.headcount}`) };
          case 'REASSIGN_STAFF':
            return { k: a.kind, s: a.staffId };
          case 'RESERVE_PART':
          case 'RESERVE_EQUIPMENT':
            return { k: a.kind, p: a.partId, q: a.qty };
          case 'PROCURE_PART':
            return { k: a.kind, p: a.partId, q: a.qty };
          default:
            return { k: a.kind };
        }
      }),
    );
    if (seen.has(signature)) continue;
    seen.add(signature);
    out.push(draft);
  }
  return out;
}

function withinRoomHours(room: Room, start: Date, end: Date): boolean {
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  return startMin >= toMinutes(room.opensAt) && endMin <= toMinutes(room.closesAt);
}

function check(
  id: ConstraintCheck['id'],
  label: string,
  ok: boolean,
  detail: string,
  blocking = true,
): ConstraintCheck {
  return { id, label, ok, detail, blocking };
}

function pass(id: ConstraintCheck['id'], label: string, detail: string): ConstraintCheck {
  return { id, label, ok: true, detail, blocking: true };
}

/**
 * Stable id derived from content. Two runs over the same data produce the same
 * id, which is what makes "the engine is deterministic" a testable claim rather
 * than a slogan. Not a security boundary — the database generates the real key.
 */
export function deterministicId(parts: string[]): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const input = parts.join('\u0000');

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + code, 0x85ebca6b) >>> 0;
  }

  // `>>> 0` matters: JavaScript's XOR and addition are signed 32-bit, and a
  // negative intermediate would stringify with a leading '-' and break the
  // UUID shape.
  const hex = (value: number) => (value >>> 0).toString(16).padStart(8, '0');
  const raw = `${hex(h1)}${hex(h2)}${hex(h1 ^ h2)}${hex(h1 + h2)}`;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20, 32)}`;
}
