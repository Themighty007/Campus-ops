import { describe, expect, it } from 'vitest';
import {
  activitiesAtRisk,
  deterministicId,
  planRecovery,
  staffPlan,
  type PlannerInput,
} from '@/lib/engine/planner';
import { CHECK_IDS } from '@/lib/domain/enums';
import type { ConstraintCheck, PlanAction, RecoveryPlan } from '@/lib/domain/types';
import {
  EXAM_END,
  IDS,
  buildPlannerInput,
  parts,
  rooms,
  staffMembers,
  workOrder,
} from './fixtures';

function relocations(plans: RecoveryPlan[], code: string): RecoveryPlan[] {
  return plans.filter((plan) =>
    plan.actions.some((a) => a.kind === 'RELOCATE_ACTIVITY' && a.toRoomCode === code),
  );
}

function check(plan: RecoveryPlan, id: ConstraintCheck['id']): ConstraintCheck {
  const found = plan.checks.find((c) => c.id === id);
  if (!found) throw new Error(`plan ${plan.label} has no ${id} check`);
  return found;
}

function actionKinds(plan: RecoveryPlan): PlanAction['kind'][] {
  return plan.actions.map((a) => a.kind);
}

describe('activitiesAtRisk', () => {
  it('finds the exam in the failed room inside the lookahead window', () => {
    const atRisk = activitiesAtRisk(buildPlannerInput());
    expect(atRisk.map((a) => a.id)).toEqual([IDS.activity.exam]);
  });

  it('returns nothing when no room was resolved', () => {
    expect(activitiesAtRisk(buildPlannerInput({ failedRoomId: null }))).toEqual([]);
  });

  it('ignores activities that have already ended', () => {
    const input = buildPlannerInput({ now: new Date(EXAM_END.getTime() + 60_000) });
    expect(activitiesAtRisk(input)).toEqual([]);
  });
});

describe('planRecovery — the seeded scenario', () => {
  const result = planRecovery(buildPlannerInput());

  it('offers exactly the two rooms that survive every check', () => {
    const codes = result.feasible.map((plan) => {
      const action = plan.actions.find((a) => a.kind === 'RELOCATE_ACTIVITY');
      return action?.kind === 'RELOCATE_ACTIVITY' ? action.toRoomCode : null;
    });

    expect(codes).toEqual(['LIB-HALL', 'NSC-1']);
  });

  it('ranks the quicker room first and labels the plans A and B', () => {
    expect(result.feasible[0]?.label).toBe('Plan A');
    expect(result.feasible[1]?.label).toBe('Plan B');
    expect(result.feasible[0]?.status).toBe('PROPOSED');
    expect(result.feasible[0]!.score).toBeGreaterThan(result.feasible[1]!.score);
  });

  it('never offers a feasible plan that failed a blocking check', () => {
    for (const plan of result.feasible) {
      const failed = plan.checks.filter((c) => c.blocking && !c.ok);
      expect(failed, `${plan.label} failed ${failed.map((f) => f.id).join(',')}`).toEqual([]);
    }
  });

  it('emits all nine checks on every plan', () => {
    for (const plan of [...result.feasible, ...result.rejected]) {
      expect(plan.checks.map((c) => c.id).sort()).toEqual([...CHECK_IDS].sort());
    }
  });

  it('replaces the invigilator whose shift ends early', () => {
    const plan = result.feasible[0]!;
    const reassignment = plan.actions.find((a) => a.kind === 'REASSIGN_STAFF');

    expect(reassignment).toBeDefined();
    if (reassignment?.kind !== 'REASSIGN_STAFF') throw new Error('unreachable');
    expect(reassignment.replaceStaffId).toBe(IDS.staff.rohan);
    expect(reassignment.staffId).toBe(IDS.staff.sunita);
  });

  it('does not pretend a part is in stock when it is not', () => {
    const plan = result.feasible[0]!;
    const procure = plan.actions.find((a) => a.kind === 'PROCURE_PART');

    expect(actionKinds(plan)).not.toContain('RESERVE_PART');
    expect(procure).toBeDefined();
    if (procure?.kind !== 'PROCURE_PART') throw new Error('unreachable');
    expect(procure.sku).toBe('MCB-32A');
    expect(procure.amount).toBe(4800);
    expect(check(plan, 'STOCK_SUFFICIENT').ok).toBe(true);
    expect(check(plan, 'STOCK_SUFFICIENT').detail).toContain('purchase required');
  });

  it('rejects AUD-A because the Placement Drive already holds it', () => {
    const [plan] = relocations(result.rejected, 'AUD-A');
    expect(plan).toBeDefined();
    expect(check(plan!, 'NO_BOOKING_OVERLAP').ok).toBe(false);
    expect(check(plan!, 'NO_BOOKING_OVERLAP').detail).toContain('Placement Drive');
  });

  it('rejects SEM-HALL because 120 seats cannot hold 180 students', () => {
    const [plan] = relocations(result.rejected, 'SEM-HALL');
    expect(plan).toBeDefined();
    expect(check(plan!, 'CAPACITY_AND_CAPABILITIES').ok).toBe(false);
    expect(check(plan!, 'CAPACITY_AND_CAPABILITIES').detail).toContain('holds 120');
  });

  it('rejects OAT because it has no projector, not because of size', () => {
    const [plan] = relocations(result.rejected, 'OAT');
    expect(plan).toBeDefined();
    expect(check(plan!, 'CAPACITY_AND_CAPABILITIES').ok).toBe(false);
    expect(check(plan!, 'CAPACITY_AND_CAPABILITIES').detail).toContain('lacks PROJECTOR');
  });

  it('rejects CENT-AUD because 45 minutes of setup cannot fit in 40', () => {
    const [plan] = relocations(result.rejected, 'CENT-AUD');
    expect(plan).toBeDefined();
    expect(check(plan!, 'DEADLINE_MET').ok).toBe(false);
    expect(check(plan!, 'DEADLINE_MET').detail).toContain('only 40 min remain');
  });

  it('rejects splitting across B-101 + B-102 because only one extra invigilator exists', () => {
    const split = result.rejected.find((plan) =>
      plan.actions.some(
        (a) =>
          a.kind === 'SPLIT_ACTIVITY' &&
          a.parts.map((p) => p.roomCode).sort().join('+') === 'B-101+B-102',
      ),
    );

    expect(split).toBeDefined();
    expect(check(split!, 'STAFF_RATIO').ok).toBe(false);
    expect(check(split!, 'STAFF_RATIO').detail).toContain('short');
    expect(check(split!, 'CAPACITY_AND_CAPABILITIES').ok).toBe(true);
  });

  it('keeps every rejected alternative, ordered by how close it came', () => {
    expect(result.rejected.length).toBeGreaterThan(10);
    for (const plan of result.rejected) {
      expect(plan.status).toBe('REJECTED');
      expect(plan.rejectionReason).not.toBeNull();
    }
    const firstFailures = result.rejected[0]!.checks.filter((c) => c.blocking && !c.ok).length;
    const lastFailures = result.rejected.at(-1)!.checks.filter((c) => c.blocking && !c.ok).length;
    expect(firstFailures).toBeLessThanOrEqual(lastFailures);
  });

  it('does not offer a repair-only plan while continuity is still possible', () => {
    for (const plan of result.feasible) {
      expect(actionKinds(plan)).not.toEqual(['PROCURE_PART']);
    }
  });

  it('is deterministic: identical input produces an identical result', () => {
    const again = planRecovery(buildPlannerInput());
    expect(JSON.stringify(again)).toBe(JSON.stringify(result));
  });

  it('records the row versions it planned against', () => {
    const plan = result.feasible[0]!;
    expect(plan.resourceSnapshot.roomIds).toEqual([IDS.room.libHall]);
    // The exam's own booking is tracked: if someone else moves it, this plan
    // is stale. The Placement Drive booking is not, because it cannot
    // invalidate a move to LIB-HALL.
    expect(plan.resourceSnapshot.bookingVersions['booking-exam']).toBe(1);
    expect(plan.resourceSnapshot.bookingVersions['booking-placement']).toBeUndefined();
    expect(plan.resourceSnapshot.partFreeQty[IDS.part.mcb32]).toBe(0);
    expect(plan.resourceSnapshot.workOrderVersion).toBe(1);
  });

  it('expires plans instead of letting them live forever', () => {
    const plan = result.feasible[0]!;
    expect(plan.expiresAt).not.toBeNull();
    expect(plan.expiresAt!.getTime() - plan.createdAt.getTime()).toBe(30 * 60_000);
  });
});

describe('planRecovery — honest fallbacks', () => {
  it('offers repair-only when no room can take the activity', () => {
    const onlyTheFailedRoom = rooms.filter((r) => r.id === IDS.room.b204);
    const result = planRecovery(buildPlannerInput({ rooms: onlyTheFailedRoom }));

    expect(result.feasible).toHaveLength(1);
    expect(actionKinds(result.feasible[0]!)).toEqual(['PROCURE_PART']);
    expect(check(result.feasible[0]!, 'ROOM_SAFE_AVAILABLE').detail).toContain(
      'No room change required',
    );
  });

  it('offers a spare-equipment workaround when one is genuinely available', () => {
    const input: PlannerInput = buildPlannerInput({
      incident: {
        ...buildPlannerInput().incident,
        category: 'NETWORK',
        assetId: null,
        roomId: IDS.room.lab3,
        summary: 'LAB-3: network switch is down.',
      },
      failedRoomId: IDS.room.lab3,
      activityDeadline: null,
      requiredPartId: IDS.part.sfp1g,
      spareEquipmentPartId: IDS.part.apSpare,
      spareEquipmentQty: 1,
      workOrder: { ...workOrder, requiredSkill: 'NETWORK' },
    });

    const result = planRecovery(input);
    const workaround = result.feasible.find((p) => actionKinds(p).includes('SERVICE_WORKAROUND'));

    expect(workaround).toBeDefined();
    expect(actionKinds(workaround!)).not.toContain('RELOCATE_ACTIVITY');
    expect(actionKinds(workaround!)).toContain('RESERVE_EQUIPMENT');
    expect(check(workaround!, 'STOCK_SUFFICIENT').detail).toContain('AP-SPARE');
  });

  it('refuses every plan when the reporter is the only approver', () => {
    const result = planRecovery(
      buildPlannerInput({
        reporterId: IDS.staff.ananya,
        approvers: [{ id: IDS.staff.ananya, role: 'FACILITIES_ADMIN' }],
      }),
    );

    expect(result.feasible).toEqual([]);
    expect(
      result.rejected.some((plan) => check(plan, 'APPROVAL_AND_SOD').ok === false),
    ).toBe(true);
  });

  it('refuses to move an activity into a room that is offline', () => {
    const withLibHallClosed = rooms.map((room) =>
      room.id === IDS.room.libHall
        ? { ...room, isAvailable: false, unavailableReason: 'Flood damage' }
        : room,
    );

    const result = planRecovery(buildPlannerInput({ rooms: withLibHallClosed }));
    const [plan] = relocations(result.rejected, 'LIB-HALL');

    expect(plan).toBeDefined();
    expect(check(plan!, 'ROOM_SAFE_AVAILABLE').ok).toBe(false);
    expect(check(plan!, 'ROOM_SAFE_AVAILABLE').detail).toContain('unavailable');
  });
});

describe('staffPlan', () => {
  it('needs one extra person to split a single room into two', () => {
    const input = buildPlannerInput();
    const exam = input.activities[0]!;

    const single = staffPlan(input, exam, 1);
    const split = staffPlan(input, exam, 2);

    expect(single.required).toBe(4);
    expect(split.required).toBe(5);
    expect(single.ok).toBe(true);
    expect(split.ok).toBe(false);
    expect(split.offShift.map((s) => s.fullName)).toEqual(['Rohan Das']);
  });

  it('never assigns someone who is already committed elsewhere', () => {
    const input = buildPlannerInput();
    const exam = input.activities[0]!;
    const plan = staffPlan(input, exam, 1);

    expect(plan.roster.map((s) => s.id)).not.toContain(IDS.staff.nikhil);
    expect(plan.roster.map((s) => s.id)).not.toContain(IDS.staff.deepa);
    expect(plan.roster.map((s) => s.id)).not.toContain(IDS.staff.imran);
  });

  it('reports the real shortfall instead of padding the roster', () => {
    const withoutSunita = staffMembers.filter((s) => s.id !== IDS.staff.sunita);
    const input = buildPlannerInput({ staff: withoutSunita });
    const exam = input.activities[0]!;

    const plan = staffPlan(input, exam, 1);
    expect(plan.ok).toBe(false);
    expect(plan.roster).toHaveLength(3);
    expect(plan.required - plan.roster.length).toBe(1);
  });

  it('ignores people who do not hold the required skill', () => {
    const input = buildPlannerInput();
    const exam = input.activities[0]!;
    const plan = staffPlan(input, exam, 1);

    for (const person of plan.roster) {
      expect(person.skills).toContain('INVIGILATE');
    }
  });
});

describe('deterministicId', () => {
  it('is stable for the same content and different for different content', () => {
    expect(deterministicId(['a', 'b'])).toBe(deterministicId(['a', 'b']));
    expect(deterministicId(['a', 'b'])).not.toBe(deterministicId(['a', 'c']));
    expect(deterministicId(['a', 'b'])).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe('fixture sanity', () => {
  it('mirrors the seeded stock levels', () => {
    expect(parts.find((p) => p.sku === 'MCB-32A')?.qtyAvailable).toBe(0);
    expect(parts.find((p) => p.sku === 'AP-SPARE')?.qtyAvailable).toBe(4);
  });
});
