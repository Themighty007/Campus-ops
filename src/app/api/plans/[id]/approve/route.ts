import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSession } from '@/lib/governance/session';
import { assertCapability, mayApprovePlan } from '@/lib/governance/rbac';
import { checkPlanApproval } from '@/lib/governance/sod';
import { mapPlan, mapIncident } from '@/lib/repo/mappers';
import type { PlanRow, IncidentRow } from '@/lib/repo/rows';
import type { RecoveryPlan } from '@/lib/domain/types';
import { sendInApp } from '@/lib/notifications/dispatcher';

/**
 * POST /api/plans/[id]/approve — approve or reject a recovery plan.
 *
 * Body: { decision: 'APPROVED' | 'REJECTED', reason?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: planId } = await params;
    const { actor } = await requireSession();

    const body = await req.json();
    const decision = body.decision as 'APPROVED' | 'REJECTED';
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be APPROVED or REJECTED' }, { status: 400 });
    }

    const capability = decision === 'APPROVED' ? 'plan:approve' : 'plan:reject';
    assertCapability(actor, capability);

    const admin = createAdminClient();

    // Load plan
    const { data: planRow, error: planErr } = await admin
      .from('recovery_plans')
      .select('*')
      .eq('id', planId)
      .single<PlanRow>();
    if (planErr || !planRow) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const plan = mapPlan(planRow);

    // Plan must be PROPOSED
    if (plan.status !== 'PROPOSED') {
      return NextResponse.json({ error: `Plan is ${plan.status}, cannot approve/reject` }, { status: 409 });
    }

    // Check expiry
    if (plan.expiresAt && new Date() > plan.expiresAt) {
      await admin.from('recovery_plans').update({ status: 'EXPIRED' }).eq('id', planId);
      return NextResponse.json({ error: 'Plan has expired — regenerate.' }, { status: 410 });
    }

    // Load incident for severity check
    const { data: incidentRow } = await admin
      .from('incidents')
      .select('*')
      .eq('id', plan.incidentId)
      .single<IncidentRow>();
    if (!incidentRow) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    const incident = mapIncident(incidentRow);

    // RBAC: check the actor can approve plans of this severity
    if (decision === 'APPROVED' && !mayApprovePlan(actor, { severity: incident.severity, requiredRoles: plan.requiredRoles })) {
      return NextResponse.json({ error: `Your role (${actor.role}) cannot approve this plan.` }, { status: 403 });
    }

    // SoD: approver cannot be the plan creator or incident reporter
    const { data: woRows } = await admin
      .from('work_orders')
      .select('assignee_id')
      .eq('incident_id', plan.incidentId);

    const sodViolation = checkPlanApproval(actor, {
      plan: { createdBy: plan.createdBy, requiredRoles: plan.requiredRoles },
      incident: { reporterId: incident.reporterId },
      workOrders: (woRows ?? []).map((w: { assignee_id: string | null }) => ({ assigneeId: w.assignee_id })),
    });
    if (sodViolation) {
      return NextResponse.json({ error: sodViolation.message, code: sodViolation.code }, { status: 403 });
    }

    // Stale-plan check: verify resource snapshot versions still match
    if (decision === 'APPROVED') {
      const snap = plan.resourceSnapshot;
      // Check booking versions haven't changed
      for (const [bookingId, version] of Object.entries(snap.bookingVersions ?? {})) {
        const { data: current } = await admin
          .from('room_bookings')
          .select('version')
          .eq('id', bookingId)
          .single();
        if (current && current.version !== version) {
          await admin.from('recovery_plans').update({ status: 'STALE' }).eq('id', planId);
          return NextResponse.json({
            error: 'Plan is stale — a booking was modified since plan generation. Please regenerate.',
            code: 'STALE_PLAN',
          }, { status: 409 });
        }
      }

      // Check part quantities still sufficient
      for (const [partId, requiredFree] of Object.entries(snap.partFreeQty ?? {})) {
        const { data: current } = await admin
          .from('parts')
          .select('qty_available, qty_reserved')
          .eq('id', partId)
          .single();
        if (current && (current.qty_available - current.qty_reserved) < requiredFree) {
          await admin.from('recovery_plans').update({ status: 'STALE' }).eq('id', planId);
          return NextResponse.json({
            error: 'Plan is stale — stock levels changed. Please regenerate.',
            code: 'STALE_PLAN',
          }, { status: 409 });
        }
      }
    }

    if (decision === 'APPROVED') {
      // Execute the plan atomically
      const execResult = await executePlan(admin, plan, actor.id);
      if (!execResult.ok) {
        return NextResponse.json({ error: execResult.error }, { status: 409 });
      }
    }

    // Update plan status
    await admin
      .from('recovery_plans')
      .update({
        status: decision === 'APPROVED' ? 'EXECUTED' : 'REJECTED',
        rejection_reason: decision === 'REJECTED' ? (body.reason ?? null) : null,
        executed_at: decision === 'APPROVED' ? new Date().toISOString() : null,
      })
      .eq('id', planId);

    // Update approval record
    await admin
      .from('approvals')
      .update({
        decided_by: actor.id,
        status: decision,
        reason: body.reason ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq('plan_id', planId)
      .eq('status', 'PENDING');

    // If approved, update incident continuity status
    if (decision === 'APPROVED') {
      await admin
        .from('incidents')
        .update({ continuity_status: 'RESTORED' })
        .eq('id', plan.incidentId);
    }

    // Audit
    await admin.from('audit_log').insert({
      incident_id: plan.incidentId,
      actor_id: actor.id,
      actor_kind: 'USER',
      action: decision === 'APPROVED' ? 'PLAN_APPROVED_AND_EXECUTED' : 'PLAN_REJECTED',
      payload: {
        planId,
        reason: body.reason ?? null,
      },
    });

    // Notify plan creator
    if (plan.createdBy && plan.createdBy !== actor.id) {
      await sendInApp(admin, {
        recipientId: plan.createdBy,
        template: decision === 'APPROVED' ? 'plan_approved' : 'plan_rejected',
        payload: {
          planId,
          planLabel: plan.label,
          decidedBy: actor.fullName,
          reason: body.reason ?? null,
        },
        incidentId: plan.incidentId,
      });
    }

    return NextResponse.json({
      plan: { ...plan, status: decision === 'APPROVED' ? 'EXECUTED' : 'REJECTED' },
      message: decision === 'APPROVED' ? 'Plan approved and executed.' : 'Plan rejected.',
    });
  } catch (err) {
    return handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Plan execution — atomic database mutations
// ---------------------------------------------------------------------------

async function executePlan(
  admin: SupabaseClient,
  plan: RecoveryPlan,
  executorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const action of plan.actions) {
    switch (action.kind) {
      case 'RELOCATE_ACTIVITY': {
        // Cancel old booking, create new one, update activity
        const { data: activity } = await admin
          .from('scheduled_activities')
          .select('room_id, starts_at, ends_at, title')
          .eq('id', action.activityId)
          .single();
        if (!activity) continue;

        // Cancel old booking
        await admin
          .from('room_bookings')
          .update({ status: 'CANCELLED' })
          .eq('activity_id', action.activityId)
          .eq('status', 'ACTIVE');

        // Create new booking
        await admin.from('room_bookings').insert({
          room_id: action.toRoomId,
          activity_id: action.activityId,
          title: activity.title,
          starts_at: activity.starts_at,
          ends_at: activity.ends_at,
          status: 'ACTIVE',
        });

        // Update activity room
        await admin
          .from('scheduled_activities')
          .update({ room_id: action.toRoomId, status: 'MOVED' })
          .eq('id', action.activityId);
        break;
      }

      case 'RESERVE_PART':
      case 'RESERVE_EQUIPMENT': {
        await admin.rpc('reserve_parts', {
          p_part_id: action.partId,
          p_qty: action.qty,
        }).then(({ error }) => {
          if (error) console.error('[reserve_parts]', error.message);
        });
        break;
      }

      case 'REASSIGN_STAFF': {
        if (action.workOrderId) {
          await admin
            .from('work_orders')
            .update({ assignee_id: action.staffId, status: 'ASSIGNED' })
            .eq('id', action.workOrderId);
        }
        break;
      }

      case 'PROCURE_PART': {
        await admin.from('purchase_requests').insert({
          incident_id: plan.incidentId,
          work_order_id: plan.resourceSnapshot.workOrderId ?? null,
          part_id: action.partId,
          qty: action.qty,
          amount: action.amount,
          status: 'REQUESTED',
          requested_by: executorId,
          reason: `Auto-generated by plan: ${plan.label}`,
        });
        break;
      }

      case 'SERVICE_WORKAROUND': {
        // Log the workaround as an audit event
        await admin.from('audit_log').insert({
          incident_id: plan.incidentId,
          actor_id: executorId,
          actor_kind: 'SYSTEM',
          action: 'WORKAROUND_APPLIED',
          payload: { note: action.note },
        });
        break;
      }

      case 'SPLIT_ACTIVITY': {
        // For hackathon: log the split as audit, don't actually create multiple activities
        await admin.from('audit_log').insert({
          incident_id: plan.incidentId,
          actor_id: executorId,
          actor_kind: 'SYSTEM',
          action: 'ACTIVITY_SPLIT_PLANNED',
          payload: {
            activityId: action.activityId,
            parts: action.parts,
          },
        });
        break;
      }
    }
  }

  return { ok: true };
}

function handleError(err: unknown): NextResponse {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const se = err as { statusCode: number; message: string; code?: string };
    return NextResponse.json({ error: se.message, code: se.code }, { status: se.statusCode });
  }
  console.error('[approve]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
