import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSession } from '@/lib/governance/session';
import { assertCapability, can } from '@/lib/governance/rbac';
import type { Actor } from '@/lib/domain/types';
import type { Capability } from '@/lib/governance/rbac';

/**
 * POST /api/workflow — state transitions for incidents and work orders.
 *
 * Body: { action, targetId, ...params }
 *
 * Actions:
 *   transition_incident — { incidentId, newStatus }
 *   transition_work_order — { workOrderId, newStatus, notes? }
 *   verify_evidence — { attachmentId, accepted, reason? }
 */
export async function POST(req: NextRequest) {
  try {
    const { actor } = await requireSession();
    const body = await req.json();
    const admin = createAdminClient();

    switch (body.action) {
      case 'transition_incident': {
        assertCapability(actor, 'incident:transition');
        const { data, error } = await admin.rpc('transition_incident', {
          p_incident_id: body.incidentId,
          p_new_status: body.newStatus,
          p_actor: actor.id,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        if (data && data !== 'OK') return NextResponse.json({ error: data }, { status: 409 });

        await admin.from('audit_log').insert({
          incident_id: body.incidentId,
          actor_id: actor.id,
          actor_kind: 'USER',
          action: 'INCIDENT_TRANSITION',
          payload: { newStatus: body.newStatus },
        });
        return NextResponse.json({ result: 'OK' });
      }

      case 'transition_work_order': {
        const canOwn = assertCapabilityCheck(actor, 'workorder:transition:own');
        const canAny = assertCapabilityCheck(actor, 'workorder:transition:any');
        if (!canOwn && !canAny) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data, error } = await admin.rpc('transition_work_order', {
          p_work_order_id: body.workOrderId,
          p_new_status: body.newStatus,
          p_actor: actor.id,
          p_notes: body.notes ?? null,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        if (data && data !== 'OK') return NextResponse.json({ error: data }, { status: 409 });

        // Get incident ID for audit
        const { data: wo } = await admin
          .from('work_orders')
          .select('incident_id')
          .eq('id', body.workOrderId)
          .single();

        await admin.from('audit_log').insert({
          incident_id: wo?.incident_id ?? null,
          actor_id: actor.id,
          actor_kind: 'USER',
          action: 'WORK_ORDER_TRANSITION',
          payload: { workOrderId: body.workOrderId, newStatus: body.newStatus },
        });
        return NextResponse.json({ result: 'OK' });
      }

      case 'verify_evidence': {
        assertCapability(actor, 'evidence:verify');
        const { data, error } = await admin.rpc('verify_evidence', {
          p_attachment_id: body.attachmentId,
          p_actor: actor.id,
          p_accepted: body.accepted,
          p_reason: body.reason ?? null,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        if (data && data !== 'OK') return NextResponse.json({ error: data }, { status: 409 });
        return NextResponse.json({ result: 'OK' });
      }

      case 'approve_purchase': {
        assertCapability(actor, 'purchase:approve');

        // SoD: approver cannot be the requester
        const { data: pr } = await admin
          .from('purchase_requests')
          .select('requested_by')
          .eq('id', body.purchaseId)
          .single();
        if (pr && pr.requested_by === actor.id) {
          return NextResponse.json({ error: 'Cannot approve your own purchase request (SoD).' }, { status: 403 });
        }

        const { data, error } = await admin.rpc('approve_purchase', {
          p_purchase_id: body.purchaseId,
          p_actor: actor.id,
          p_decision: body.decision,
          p_reason: body.reason ?? null,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        if (data && data !== 'OK') return NextResponse.json({ error: data }, { status: 409 });
        return NextResponse.json({ result: 'OK' });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
    }
  } catch (err) {
    return handleError(err);
  }
}

function assertCapabilityCheck(actor: Actor, capability: Capability): boolean {
  return can(actor, capability);
}

function handleError(err: unknown): NextResponse {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const se = err as { statusCode: number; message: string; code?: string };
    return NextResponse.json({ error: se.message, code: se.code }, { status: se.statusCode });
  }
  console.error('[workflow]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
