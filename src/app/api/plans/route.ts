import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSession } from '@/lib/governance/session';
import { assertCapability } from '@/lib/governance/rbac';
import { loadPlanningContext } from '@/lib/repo/planningContext';
import { planRecovery } from '@/lib/engine/planner';
import { narratePlan } from '@/lib/ai/narrate';
import { mapPlan } from '@/lib/repo/mappers';
import type { PlanRow } from '@/lib/repo/rows';
import type { RecoveryPlan } from '@/lib/domain/types';

/**
 * GET /api/plans?incidentId=xxx — list recovery plans for an incident.
 */
export async function GET(req: NextRequest) {
  try {
    const { actor } = await requireSession();
    const incidentId = req.nextUrl.searchParams.get('incidentId');
    if (!incidentId) {
      return NextResponse.json({ error: 'incidentId is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('recovery_plans')
      .select('*')
      .eq('incident_id', incidentId)
      .order('score', { ascending: true })
      .returns<PlanRow[]>();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plans: (data ?? []).map(mapPlan) });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST /api/plans — generate recovery plans for an incident.
 *
 * Body: { incidentId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { actor } = await requireSession();
    assertCapability(actor, 'plan:generate');

    const body = await req.json();
    const incidentId = body.incidentId;
    if (!incidentId) {
      return NextResponse.json({ error: 'incidentId is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Mark any existing PROPOSED plans as WITHDRAWN
    await admin
      .from('recovery_plans')
      .update({ status: 'WITHDRAWN' })
      .eq('incident_id', incidentId)
      .eq('status', 'PROPOSED');

    // Load planning context
    const ctx = await loadPlanningContext(admin, incidentId);

    // Generate plans using the deterministic engine
    const planResult = planRecovery(ctx.input);
    const plans = planResult.feasible;

    if (plans.length === 0) {
      return NextResponse.json({
        plans: [],
        message: 'No feasible recovery plans could be generated.',
      });
    }

    // Save plans to database
    const savedPlans: RecoveryPlan[] = [];

    for (const plan of plans) {
      const expiresAt = new Date(Date.now() + 30 * 60_000); // 30 min expiry

      const { data: saved, error: insertErr } = await admin
        .from('recovery_plans')
        .insert({
          incident_id: incidentId,
          version: 1,
          label: plan.label,
          status: 'PROPOSED',
          actions: plan.actions as unknown as Record<string, unknown>[],
          checks: plan.checks as unknown as Record<string, unknown>[],
          score: plan.score,
          factors: plan.factors as unknown as Record<string, unknown>,
          resource_snapshot: plan.resourceSnapshot as unknown as Record<string, unknown>,
          required_roles: plan.requiredRoles,
          created_by: actor.id,
          expires_at: expiresAt.toISOString(),
        })
        .select('*')
        .single<PlanRow>();

      if (insertErr || !saved) continue;
      savedPlans.push(mapPlan(saved));

      // Create approval request
      for (const role of plan.requiredRoles) {
        await admin.from('approvals').insert({
          subject_type: 'RECOVERY_PLAN',
          subject_id: saved.id,
          plan_id: saved.id,
          required_role: role,
          requested_by: actor.id,
          status: 'PENDING',
          plan_version: 1,
        });
      }
    }

    // Audit
    await admin.from('audit_log').insert({
      incident_id: incidentId,
      actor_id: actor.id,
      actor_kind: 'USER',
      action: 'PLANS_GENERATED',
      payload: {
        count: savedPlans.length,
        planIds: savedPlans.map((p) => p.id),
      },
    });

    // Narrative
    let narrative: string | null = null;
    try {
      if (savedPlans.length > 0) {
        narrative = narratePlan(savedPlans[0], ctx.incident, new Date());
      }
    } catch {
      // narrative is non-critical
    }

    return NextResponse.json({
      plans: savedPlans,
      narrative,
    }, { status: 201 });

  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown): NextResponse {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const se = err as { statusCode: number; message: string; code?: string };
    return NextResponse.json({ error: se.message, code: se.code }, { status: se.statusCode });
  }
  console.error('[plans]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
