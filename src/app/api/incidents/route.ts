import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSession } from '@/lib/governance/session';
import { assertCapability, can } from '@/lib/governance/rbac';
import { extractReport } from '@/lib/ai/extract';
import { correlate } from '@/lib/engine/correlation';
import type { CorrelationCandidate } from '@/lib/engine/correlation';
import { CATEGORY_DEPARTMENT, CATEGORY_SKILL, SLA_MINUTES } from '@/lib/domain/enums';
import { mapIncident } from '@/lib/repo/mappers';
import type { IncidentRow } from '@/lib/repo/rows';
import { sendInApp } from '@/lib/notifications/dispatcher';
import { publishToRedisBox } from '@/lib/redis/redisClient';

/**
 * GET /api/incidents — list open incidents visible to the current user.
 */
export async function GET() {
  try {
    const { actor } = await requireSession();
    const admin = createAdminClient();

    let query = admin.from('incidents').select('*').order('created_at', { ascending: false });

    if (can(actor, 'incident:read:all')) {
      // no filter
    } else if (can(actor, 'incident:read:department') && actor.departmentId) {
      query = query.or(`department_id.eq.${actor.departmentId},reporter_id.eq.${actor.id}`);
    } else {
      query = query.eq('reporter_id', actor.id);
    }

    const { data, error } = await query.returns<IncidentRow[]>();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ incidents: (data ?? []).map(mapIncident) });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST /api/incidents — submit a new incident report.
 *
 * Body: { text: string, source?: string, roomHint?: string, assetHint?: string }
 *
 * Pipeline: extract → correlate → create incident → blast radius → auto-triage → work order
 */
export async function POST(req: NextRequest) {
  try {
    const { actor } = await requireSession();
    assertCapability(actor, 'incident:create');

    const body = await req.json();
    const rawText = (body.text ?? body.rawText ?? '').trim();
    if (!rawText || rawText.length < 3) {
      return NextResponse.json({ error: 'Report text must be at least 3 characters.' }, { status: 400 });
    }

    const source = body.source ?? 'WEB';
    const admin = createAdminClient();
    const now = new Date();

    // 1. AI extraction
    const { extraction, source: extractionSource, model, aiError } = await extractReport({ text: rawText });

    // 2. Resolve room
    const roomHint = body.roomHint ?? extraction.roomHint;
    let roomId: string | null = null;
    if (roomHint) {
      const { data: room } = await admin
        .from('rooms')
        .select('id')
        .ilike('code', `%${roomHint}%`)
        .maybeSingle();
      roomId = room?.id ?? null;
    }

    // 3. Resolve asset
    const assetHint = body.assetHint ?? extraction.assetHint;
    let assetId: string | null = null;
    if (assetHint) {
      const { data: asset } = await admin
        .from('assets')
        .select('id, room_id')
        .ilike('code', `%${assetHint}%`)
        .maybeSingle();
      if (asset) {
        assetId = asset.id;
        if (!roomId && asset.room_id) roomId = asset.room_id;
      }
    }

    // 4. Determine severity
    const severity = extraction.urgency === 'CRITICAL' ? 'P1'
      : extraction.urgency === 'HIGH' ? 'P2'
      : extraction.urgency === 'MEDIUM' ? 'P3'
      : 'P4';

    const deptCode = CATEGORY_DEPARTMENT[extraction.category];
    const { data: dept } = await admin
      .from('departments')
      .select('id')
      .eq('code', deptCode)
      .maybeSingle();

    // 5. Correlation — check for duplicates/related incidents
    let correlationResult: { kind: string; incidentId: string; score: number } | null = null;
    const { data: openIncidents } = await admin
      .from('incidents')
      .select('id, category, room_id, asset_id, summary, created_at')
      .not('status', 'in', '("RESOLVED","CLOSED","REJECTED","MERGED")')
      .returns<Array<{ id: string; category: string; room_id: string | null; asset_id: string | null; summary: string; created_at: string }>>();

    if (openIncidents && openIncidents.length > 0) {
      const candidates: CorrelationCandidate[] = openIncidents.map((row) => ({
        incidentId: row.id,
        category: row.category as any,
        roomId: row.room_id,
        building: null,
        assetId: row.asset_id,
        summary: row.summary,
        createdAt: new Date(row.created_at),
      }));
      const matches = correlate(rawText, extraction, candidates, now, roomId);
      if (matches.length > 0) {
        correlationResult = matches[0];
      }
    }

    // 6. Create incident
    const slaDueAt = new Date(now.getTime() + SLA_MINUTES[severity] * 60_000);

    // Determine activity deadline
    let activityDeadlineAt: string | null = null;
    if (roomId) {
      const { data: nextActivity } = await admin
        .from('scheduled_activities')
        .select('starts_at')
        .eq('room_id', roomId)
        .eq('status', 'SCHEDULED')
        .gt('starts_at', now.toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (nextActivity) activityDeadlineAt = nextActivity.starts_at;
    }

    const { data: incident, error: insertErr } = await admin
      .from('incidents')
      .insert({
        category: extraction.category,
        subtype: extraction.subtype,
        severity,
        status: correlationResult?.kind === 'DUPLICATE' ? 'MERGED' : 'REPORTED',
        continuity_status: activityDeadlineAt ? 'AT_RISK' : 'NONE',
        room_id: roomId,
        asset_id: assetId,
        department_id: dept?.id ?? null,
        reporter_id: actor.id,
        summary: extraction.summary,
        is_safety: extraction.isSafetyRisk,
        sla_due_at: slaDueAt.toISOString(),
        activity_deadline_at: activityDeadlineAt,
        merged_into_id: correlationResult?.kind === 'DUPLICATE' ? correlationResult.incidentId : null,
      })
      .select('*')
      .single<IncidentRow>();

    if (insertErr || !incident) {
      return NextResponse.json({ error: insertErr?.message ?? 'Failed to create incident' }, { status: 500 });
    }

    // 7. Save report
    await admin.from('reports').insert({
      incident_id: incident.id,
      source,
      raw_text: rawText,
      reporter_id: actor.id,
      reporter_label: actor.fullName,
      room_hint: roomHint,
      asset_hint: assetHint,
      extraction: extraction as unknown as Record<string, unknown>,
      extraction_source: extractionSource,
      confidence: extraction.confidence,
      match_kind: correlationResult?.kind ?? null,
      match_score: correlationResult?.score ?? null,
    });

    // 8. Audit trail
    await admin.from('audit_log').insert({
      incident_id: incident.id,
      actor_id: actor.id,
      actor_kind: 'USER',
      action: 'INCIDENT_CREATED',
      payload: {
        extraction_source: extractionSource,
        model,
        ai_error: aiError,
        severity,
        category: extraction.category,
        correlation: correlationResult,
      },
    });

    // 9. If not a duplicate, auto-triage: create work order
    let workOrderId: string | null = null;
    if (correlationResult?.kind !== 'DUPLICATE') {
      // Auto-assign technician
      const requiredSkill = CATEGORY_SKILL[extraction.category];
      const { data: tech } = await admin
        .from('profiles')
        .select('id')
        .eq('role', 'TECHNICIAN')
        .eq('is_active', true)
        .eq('department_id', dept?.id ?? '')
        .limit(1)
        .maybeSingle();

      const { data: wo } = await admin
        .from('work_orders')
        .insert({
          incident_id: incident.id,
          department_id: dept?.id ?? null,
          assignee_id: tech?.id ?? null,
          status: tech ? 'ASSIGNED' : 'CREATED',
          required_skill: requiredSkill,
        })
        .select('id')
        .single();

      workOrderId = wo?.id ?? null;

      // Update incident status if assigned
      if (tech && wo) {
        await admin
          .from('incidents')
          .update({ status: 'ASSIGNED' })
          .eq('id', incident.id);

        await admin.from('audit_log').insert({
          incident_id: incident.id,
          actor_id: null,
          actor_kind: 'SYSTEM',
          action: 'AUTO_ASSIGNED',
          payload: { work_order_id: wo.id, assignee_id: tech.id, skill: requiredSkill },
        });

        // Notify assigned technician
        await sendInApp(admin, {
          recipientId: tech.id,
          template: 'work_order_assigned',
          payload: {
            incidentCode: incident.code,
            summary: extraction.summary,
            workOrderId: wo.id,
          },
          incidentId: incident.id,
        });
      }
    }

    // 10. Compute blast radius
    let blastRadius = null;
    if (roomId) {
      try {
        const { data: activities } = await admin
          .from('scheduled_activities')
          .select('*')
          .eq('room_id', roomId)
          .eq('status', 'SCHEDULED')
          .gt('ends_at', now.toISOString());

        const { data: participants } = await admin
          .from('activity_participants')
          .select('*');

        const affectedActivityIds = (activities ?? []).map((a: { id: string }) => a.id);
        const affectedPeople = (participants ?? [])
          .filter((p: { activity_id: string }) => affectedActivityIds.includes(p.activity_id))
          .reduce((sum: number, p: { headcount: number }) => sum + p.headcount, 0);

        blastRadius = {
          affectedActivities: activities?.length ?? 0,
          affectedPeople,
          activityDeadline: activityDeadlineAt,
        };
      } catch {
        // blast radius is non-critical
      }
    }

        // 11. Cross-role Redis synchronization (Zero-Lag Broadcast to 5 Boxes)
    const photoUrl = body.photoUrl || body.imageUrl || body.photo || null;

    try {
      // Notify Super Admin box with full incident & photo for immediate YES/NO review
      await publishToRedisBox('superadmin', 'NEW_INCIDENT_REPORTED', {
        incidentId: incident.id,
        reporter: actor.fullName,
        roomCode: roomHint || 'Hall B-204',
        category: extraction.category,
        severity,
        summary: extraction.summary,
        photoUrl,
        aiTriageScore: extraction.confidence,
        requiresApproval: true,
        proposedAction: 'Plan Alpha: Rapid Switch to Backup Generator + Dispatch Field Technician',
      });

      // Notify Student box of confirmed receipt
      await publishToRedisBox('student', 'TICKET_SUBMITTED', {
        ticketId: incident.id,
        summary: extraction.summary,
        roomCode: roomHint || 'Hall B-204',
        status: incident.status,
        photoUrl,
        note: 'Your report and photo evidence were received. Super Admin review in progress.',
      });

      // If work order was auto-created, queue in Technician box with photo
      if (workOrderId) {
        await publishToRedisBox('technician', 'WORK_ORDER_DISPATCHED', {
          workOrderId,
          incidentId: incident.id,
          title: extraction.summary,
          roomCode: roomHint || 'Hall B-204',
          priority: severity,
          photoUrl,
          stage: 'ASSIGNED',
          assignedTo: 'Rajesh Kumar',
        });
      }
    } catch (redisErr) {
      console.warn('Non-blocking Redis publish error:', redisErr);
    }

    return NextResponse.json({
      incident: mapIncident(incident),
      correlation: correlationResult,
      extraction: {
        ...extraction,
        source: extractionSource,
        model,
        aiError,
      },
      blastRadius,
      workOrderId,
      clarifyingQuestion: extraction.clarifyingQuestion,
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
  console.error('[incidents]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
