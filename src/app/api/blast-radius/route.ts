import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSession } from '@/lib/governance/session';
import { loadPlanningContext } from '@/lib/repo/planningContext';
import { CATEGORY_SKILL } from '@/lib/domain/enums';

/**
 * GET /api/blast-radius?incidentId=xxx — compute blast radius for an incident.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const incidentId = req.nextUrl.searchParams.get('incidentId');
    if (!incidentId) {
      return NextResponse.json({ error: 'incidentId is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const ctx = await loadPlanningContext(admin, incidentId);

    const failedRoomId = ctx.incident.roomId ?? ctx.asset?.roomId ?? null;
    const now = new Date();

    // Activities at risk = scheduled activities in the failed room, not yet ended
    const atRiskActivities = ctx.activities.filter(
      (a) => a.status === 'SCHEDULED' && a.roomId === failedRoomId && a.endsAt > now,
    );

    // Affected bookings
    const atRiskBookings = ctx.bookings.filter(
      (b) => b.roomId === failedRoomId && b.status === 'ACTIVE' && b.endsAt > now,
    );

    // Affected people from cohorts
    const atRiskActivityIds = new Set(atRiskActivities.map((a) => a.id));
    const affectedCohorts = ctx.cohorts.filter((c) => atRiskActivityIds.has(c.activityId));
    const affectedPeople = affectedCohorts.reduce((sum, c) => sum + c.headcount, 0);

    // Staff assigned to at-risk activities
    const assignedStaffIds = new Set<string>();
    for (const activity of atRiskActivities) {
      const staffIds = ctx.activityStaff[activity.id] ?? [];
      for (const sid of staffIds) assignedStaffIds.add(sid);
    }
    const assignedStaff = ctx.staff.filter((s) => assignedStaffIds.has(s.id));

    // Required part
    const requiredPart = ctx.asset?.requiredPartId
      ? ctx.parts.find((p) => p.id === ctx.asset!.requiredPartId) ?? null
      : null;

    // Earliest deadline
    const earliestDeadline = atRiskActivities.length > 0
      ? atRiskActivities.reduce((earliest, a) =>
          a.startsAt < earliest ? a.startsAt : earliest, atRiskActivities[0].startsAt)
      : null;

    return NextResponse.json({
      blastRadius: {
        incidentId,
        room: ctx.room,
        asset: ctx.asset,
        activities: atRiskActivities,
        bookings: atRiskBookings,
        cohorts: affectedCohorts,
        assignedStaff,
        affectedPeople,
        requiredSkill: CATEGORY_SKILL[ctx.incident.category] ?? null,
        requiredPart,
        workOrder: ctx.workOrder,
        earliestDeadline,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown): NextResponse {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const se = err as { statusCode: number; message: string; code?: string };
    return NextResponse.json({ error: se.message, code: se.code }, { status: se.statusCode });
  }
  console.error('[blast-radius]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
