import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSession } from '@/lib/governance/session';
import { assertCapability } from '@/lib/governance/rbac';

/**
 * POST /api/demo — demo management actions.
 *
 * Body: { action: 'reset' | 'inject_scenario' | 'seed', scenario?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { actor } = await requireSession();
    assertCapability(actor, 'admin:demo');

    const body = await req.json();
    const admin = createAdminClient();

    switch (body.action) {
      case 'reset': {
        const { error } = await admin.rpc('demo_reset');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await admin.from('audit_log').insert({
          actor_id: actor.id,
          actor_kind: 'USER',
          action: 'DEMO_RESET',
          payload: {},
        });
        return NextResponse.json({ result: 'OK', message: 'Demo data reset successfully.' });
      }

      case 'seed': {
        const { error: refError } = await admin.rpc('seed_reference');
        if (refError) return NextResponse.json({ error: refError.message }, { status: 500 });

        const { error: opError } = await admin.rpc('seed_operational');
        if (opError) return NextResponse.json({ error: opError.message }, { status: 500 });

        return NextResponse.json({ result: 'OK', message: 'Seed data loaded.' });
      }

      case 'inject_scenario': {
        const scenario = body.scenario;
        if (!scenario) {
          return NextResponse.json({ error: 'scenario is required' }, { status: 400 });
        }

        const result = await injectScenario(admin, scenario, actor.id);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
    }
  } catch (err) {
    return handleError(err);
  }
}

/**
 * GET /api/demo — get list of available scenarios and demo accounts.
 */
export async function GET() {
  return NextResponse.json({
    scenarios: [
      {
        id: 'electrical_exam',
        name: 'Electrical Failure Before Exam',
        description: 'Main circuit breaker trips in B-204 (Exam Hall) 45 minutes before a final exam with 120 students.',
      },
      {
        id: 'network_lab',
        name: 'Network Outage in Computer Lab',
        description: 'Switch failure in A-301 (CS Lab) during an active lab session, affecting 60 students and 3 staff.',
      },
      {
        id: 'water_leak',
        name: 'Plumbing Emergency',
        description: 'Water leak from ceiling in C-102, affecting electrical systems and stored equipment.',
      },
    ],
    demoAccounts: {
      REQUESTER: 'student@aegis.demo',
      TECHNICIAN: 'tech-elec@aegis.demo',
      DEPARTMENT_MANAGER: 'mgr-elec@aegis.demo',
      FACILITIES_ADMIN: 'admin@aegis.demo',
      PROCUREMENT_APPROVER: 'procurement@aegis.demo',
      SYSTEM_ADMIN: 'sysadmin@aegis.demo',
    },
  });
}

// ---------------------------------------------------------------------------
// Scenario injection
// ---------------------------------------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js';

async function injectScenario(
  admin: SupabaseClient,
  scenario: string,
  actorId: string,
): Promise<Record<string, unknown>> {
  switch (scenario) {
    case 'electrical_exam': {
      // Find the exam hall
      const { data: room } = await admin
        .from('rooms')
        .select('id, code')
        .eq('code', 'B-204')
        .maybeSingle();

      const roomId = room?.id ?? null;

      // Create the incident
      const { data: incident } = await admin
        .from('incidents')
        .insert({
          category: 'ELECTRICAL',
          subtype: 'POWER_FAILURE',
          severity: 'P1',
          status: 'REPORTED',
          continuity_status: 'AT_RISK',
          room_id: roomId,
          summary: 'Main circuit breaker tripped in Exam Hall B-204. Complete power loss. Final exam for CS301 starts in 45 minutes with 120 students.',
          is_safety: true,
          sla_due_at: new Date(Date.now() + 60 * 60_000).toISOString(),
          activity_deadline_at: new Date(Date.now() + 45 * 60_000).toISOString(),
        })
        .select('id, code')
        .single();

      if (!incident) return { error: 'Failed to create scenario incident' };

      // Create work order
      const { data: dept } = await admin.from('departments').select('id').eq('code', 'ELEC').maybeSingle();
      const { data: tech } = await admin.from('profiles').select('id').eq('role', 'TECHNICIAN').eq('department_id', dept?.id ?? '').limit(1).maybeSingle();

      await admin.from('work_orders').insert({
        incident_id: incident.id,
        department_id: dept?.id ?? null,
        assignee_id: tech?.id ?? null,
        status: tech ? 'ASSIGNED' : 'CREATED',
        required_skill: 'ELECTRICAL',
      });

      // Report
      await admin.from('reports').insert({
        incident_id: incident.id,
        source: 'WEBHOOK',
        raw_text: 'BMS Alert: Main circuit breaker trip detected in B-204. All circuits offline.',
        extraction: {
          category: 'ELECTRICAL',
          subtype: 'POWER_FAILURE',
          urgency: 'CRITICAL',
          isSafetyRisk: true,
          summary: 'Complete power failure in Exam Hall B-204',
          confidence: 0.95,
          roomHint: 'B-204',
          buildingHint: 'B',
          assetHint: null,
          affectedActivity: 'EXAM',
          deadlineHintMinutes: 45,
          missingFields: [],
          clarifyingQuestion: null,
          spans: [],
        },
        extraction_source: 'FALLBACK',
        confidence: 0.95,
      });

      await admin.from('audit_log').insert({
        incident_id: incident.id,
        actor_id: actorId,
        actor_kind: 'USER',
        action: 'SCENARIO_INJECTED',
        payload: { scenario: 'electrical_exam' },
      });

      return {
        result: 'OK',
        incidentId: incident.id,
        incidentCode: incident.code,
        message: '⚡ Electrical failure scenario injected in B-204. Exam in 45 minutes.',
      };
    }

    case 'network_lab': {
      const { data: room } = await admin
        .from('rooms')
        .select('id, code')
        .eq('code', 'A-301')
        .maybeSingle();

      const { data: incident } = await admin
        .from('incidents')
        .insert({
          category: 'NETWORK',
          subtype: 'SWITCH_FAILURE',
          severity: 'P2',
          status: 'REPORTED',
          continuity_status: 'AT_RISK',
          room_id: room?.id ?? null,
          summary: 'Network switch failure in CS Lab A-301. All 30 workstations offline during active lab session. 60 students affected.',
          is_safety: false,
          sla_due_at: new Date(Date.now() + 240 * 60_000).toISOString(),
          activity_deadline_at: new Date(Date.now() + 30 * 60_000).toISOString(),
        })
        .select('id, code')
        .single();

      if (!incident) return { error: 'Failed to create scenario incident' };

      const { data: dept } = await admin.from('departments').select('id').eq('code', 'IT').maybeSingle();

      await admin.from('work_orders').insert({
        incident_id: incident.id,
        department_id: dept?.id ?? null,
        status: 'CREATED',
        required_skill: 'NETWORK',
      });

      await admin.from('audit_log').insert({
        incident_id: incident.id,
        actor_id: actorId,
        actor_kind: 'USER',
        action: 'SCENARIO_INJECTED',
        payload: { scenario: 'network_lab' },
      });

      return {
        result: 'OK',
        incidentId: incident.id,
        incidentCode: incident.code,
        message: '🌐 Network failure scenario injected in A-301. Lab session disrupted.',
      };
    }

    case 'water_leak': {
      const { data: room } = await admin
        .from('rooms')
        .select('id')
        .eq('code', 'C-102')
        .maybeSingle();

      const { data: incident } = await admin
        .from('incidents')
        .insert({
          category: 'PLUMBING',
          subtype: 'WATER_LEAK',
          severity: 'P2',
          status: 'REPORTED',
          continuity_status: 'NONE',
          room_id: room?.id ?? null,
          summary: 'Water leak from ceiling in C-102 (Equipment Room). Risk of electrical short-circuit. Stored projectors and AV equipment at risk.',
          is_safety: true,
          sla_due_at: new Date(Date.now() + 240 * 60_000).toISOString(),
        })
        .select('id, code')
        .single();

      if (!incident) return { error: 'Failed to create scenario incident' };

      await admin.from('audit_log').insert({
        incident_id: incident.id,
        actor_id: actorId,
        actor_kind: 'USER',
        action: 'SCENARIO_INJECTED',
        payload: { scenario: 'water_leak' },
      });

      return {
        result: 'OK',
        incidentId: incident.id,
        incidentCode: incident.code,
        message: '💧 Water leak scenario injected in C-102. Safety risk flagged.',
      };
    }

    default:
      return { error: `Unknown scenario: ${scenario}` };
  }
}

function handleError(err: unknown): NextResponse {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const se = err as { statusCode: number; message: string; code?: string };
    return NextResponse.json({ error: se.message, code: se.code }, { status: se.statusCode });
  }
  console.error('[demo]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
