import { describe, expect, it } from 'vitest';
import { computeBlastRadius, describeBlastRadius } from '@/lib/engine/blastRadius';
import {
  IDS,
  NOW,
  activityStaff,
  activities,
  asset,
  bookings,
  incident,
  parts,
  rooms,
  staffMembers,
  workOrder,
} from './fixtures';

function radius(overrides: Partial<Parameters<typeof computeBlastRadius>[0]> = {}) {
  return computeBlastRadius({
    incident,
    room: rooms.find((r) => r.id === IDS.room.b204) ?? null,
    asset,
    activities,
    bookings,
    cohorts: [
      { activityId: IDS.activity.exam, label: 'CS-204 · Semester 5 (A–C)', headcount: 180 },
      { activityId: IDS.activity.placement, label: 'Placement cohort · CSE/IT', headcount: 120 },
      { activityId: IDS.activity.lab, label: 'CS-311 · Batch 2', headcount: 38 },
      { activityId: IDS.activity.lecture, label: 'ME-201 · Semester 3', headcount: 55 },
    ],
    staff: staffMembers,
    activityStaff,
    parts,
    workOrder,
    now: NOW,
    ...overrides,
  });
}

describe('computeBlastRadius', () => {
  it('derives the affected activity from the room, not from a guess', () => {
    const result = radius();
    expect(result.activities.map((a) => a.id)).toEqual([IDS.activity.exam]);
    expect(result.affectedPeople).toBe(180);
  });

  it('keeps the cohort label so nobody has to identify individual students', () => {
    const result = radius();
    expect(result.cohorts).toEqual([
      { activityId: IDS.activity.exam, label: 'CS-204 · Semester 5 (A–C)', headcount: 180 },
    ]);
  });

  it('lists the roster already committed to the affected activity', () => {
    const result = radius();
    expect(result.assignedStaff.map((s) => s.fullName).sort()).toEqual([
      'Arjun Rao',
      'Dr. Meera Iyer',
      'Priya Nair',
      'Rohan Das',
    ]);
  });

  it('reports the required skill and the part the repair needs', () => {
    const result = radius();
    expect(result.requiredSkill).toBe('INVIGILATE');
    expect(result.requiredPart?.sku).toBe('MCB-32A');
  });

  it('reports the earliest deadline', () => {
    const result = radius();
    expect(result.earliestDeadline?.getTime()).toBe(result.activities[0]!.startsAt.getTime());
  });

  it('includes bookings in other rooms that collide with the window', () => {
    const result = radius();
    const roomsInvolved = new Set(result.bookings.map((b) => b.roomId));

    expect(roomsInvolved.has(IDS.room.b204)).toBe(true);
    expect(roomsInvolved.has(IDS.room.audA)).toBe(true);
    expect(result.bookings).toHaveLength(4);
  });

  it('ignores activities that are cancelled or outside the lookahead', () => {
    const cancelled = activities.map((a) =>
      a.id === IDS.activity.exam ? { ...a, status: 'CANCELLED' as const } : a,
    );
    expect(radius({ activities: cancelled }).activities).toEqual([]);

    const farFuture = activities.map((a) => ({
      ...a,
      startsAt: new Date(NOW.getTime() + 12 * 60 * 60_000),
      endsAt: new Date(NOW.getTime() + 14 * 60 * 60_000),
    }));
    expect(radius({ activities: farFuture }).activities).toEqual([]);
  });

  it('degrades honestly when no room was resolved', () => {
    const result = radius({
      incident: { ...incident, roomId: null, assetId: null },
      room: null,
      asset: null,
    });

    expect(result.activities).toEqual([]);
    expect(result.affectedPeople).toBe(0);
    expect(result.earliestDeadline).toBeNull();
  });

  it('uses the asset room when the incident has no room of its own', () => {
    const result = radius({ incident: { ...incident, roomId: null }, room: null });
    expect(result.activities.map((a) => a.id)).toEqual([IDS.activity.exam]);
  });
});

describe('describeBlastRadius', () => {
  it('states the facts without advice or invented numbers', () => {
    const text = describeBlastRadius(radius());

    expect(text).toContain('B-204');
    expect(text).toContain('180');
    expect(text).toContain('MCB-32A is out of stock');
    expect(text).not.toMatch(/recommend|should|suggest/i);
  });

  it('says so plainly when nothing is scheduled', () => {
    const text = describeBlastRadius(
      radius({
        incident: { ...incident, roomId: null, assetId: null },
        room: null,
        asset: null,
      }),
    );

    expect(text).toBe('No room was resolved, so no activity can be linked yet.');
  });
});
