import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractReport } from '@/lib/ai/extract';

/**
 * POST /api/webhook/bms — simulated BMS/sensor webhook.
 *
 * Validates the webhook secret, deduplicates via external_events table,
 * then creates an incident automatically.
 *
 * Body: {
 *   eventId: string,         // idempotency key
 *   sensorType: string,      // e.g. "ELECTRICAL", "HVAC", "NETWORK"
 *   roomCode: string,        // room code
 *   reading: string,         // sensor reading description
 *   severity: string,        // CRITICAL, HIGH, MEDIUM, LOW
 *   timestamp: string        // ISO 8601
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate webhook secret
    const secret = req.headers.get('x-webhook-secret');
    const expected = process.env.SIMULATOR_WEBHOOK_SECRET || 'dev-simulator-secret';
    if (secret !== expected) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const body = await req.json();
    const { eventId, sensorType, roomCode, reading, severity, timestamp } = body;

    if (!eventId || !sensorType || !reading) {
      return NextResponse.json({ error: 'Missing required fields: eventId, sensorType, reading' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Idempotency check
    const { data: existing } = await admin
      .from('external_events')
      .select('id')
      .eq('external_id', eventId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ status: 'DUPLICATE', message: 'Event already processed' });
    }

    // Record the external event
    await admin.from('external_events').insert({
      external_id: eventId,
      source: 'BMS',
      payload: body,
    });

    // Resolve room
    let roomId: string | null = null;
    if (roomCode) {
      const { data: room } = await admin
        .from('rooms')
        .select('id')
        .eq('code', roomCode)
        .maybeSingle();
      roomId = room?.id ?? null;
    }

    // Extract and create incident
    const text = `BMS Alert: ${sensorType} issue in ${roomCode || 'unknown location'}. ${reading}. Severity: ${severity || 'UNKNOWN'}. Time: ${timestamp || new Date().toISOString()}`;
    const { extraction, source: extractionSource } = await extractReport({ text });

    const severityMap: Record<string, string> = {
      CRITICAL: 'P1', HIGH: 'P2', MEDIUM: 'P3', LOW: 'P4',
    };
    const incidentSeverity = severityMap[(severity || '').toUpperCase()] || 'P3';

    const deptCode = (({ ELECTRICAL: 'ELEC', NETWORK: 'IT', HVAC: 'ELEC', PLUMBING: 'CIVIL' } as Record<string, string>)[sensorType]) || 'FAC';
    const { data: dept } = await admin
      .from('departments')
      .select('id')
      .eq('code', deptCode)
      .maybeSingle();

    const slaMinutes = { P1: 60, P2: 240, P3: 1440, P4: 4320 }[incidentSeverity] || 1440;
    const slaDueAt = new Date(Date.now() + slaMinutes * 60_000);

    const { data: incident, error } = await admin
      .from('incidents')
      .insert({
        category: extraction.category,
        subtype: sensorType,
        severity: incidentSeverity,
        status: 'REPORTED',
        continuity_status: 'NONE',
        room_id: roomId,
        department_id: dept?.id ?? null,
        summary: extraction.summary || text,
        is_safety: extraction.isSafetyRisk,
        sla_due_at: slaDueAt.toISOString(),
      })
      .select('id, code')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Save report
    await admin.from('reports').insert({
      incident_id: incident.id,
      source: 'WEBHOOK',
      raw_text: text,
      extraction: extraction as unknown as Record<string, unknown>,
      extraction_source: extractionSource,
      confidence: extraction.confidence,
    });

    // Audit
    await admin.from('audit_log').insert({
      incident_id: incident.id,
      actor_kind: 'SYSTEM',
      action: 'WEBHOOK_INCIDENT_CREATED',
      payload: { eventId, sensorType, roomCode },
    });

    return NextResponse.json({
      status: 'CREATED',
      incidentId: incident.id,
      incidentCode: incident.code,
    }, { status: 201 });
  } catch (err) {
    console.error('[webhook/bms]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
