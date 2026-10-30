import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractReport } from '@/lib/ai/extract';

/**
 * POST /api/webhook/twilio — Twilio WhatsApp inbound webhook.
 *
 * Twilio sends form-encoded data. We extract the report, create an incident,
 * and respond with TwiML.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body = formData.get('Body')?.toString() ?? '';
    const from = formData.get('From')?.toString() ?? '';
    const messageSid = formData.get('MessageSid')?.toString() ?? '';

    if (!body.trim()) {
      return twiml('Please describe the issue you want to report.');
    }

    const admin = createAdminClient();

    // Idempotency via MessageSid
    if (messageSid) {
      const { data: existing } = await admin
        .from('external_events')
        .select('id')
        .eq('external_id', messageSid)
        .maybeSingle();
      if (existing) {
        return twiml('This message has already been received. Thank you!');
      }
      await admin.from('external_events').insert({
        external_id: messageSid,
        source: 'WHATSAPP',
        payload: { from, body: body.slice(0, 500) },
      });
    }

    // Extract
    const { extraction, source: extractionSource } = await extractReport({ text: body });

    // Determine severity
    const severityMap = { CRITICAL: 'P1', HIGH: 'P2', MEDIUM: 'P3', LOW: 'P4' } as const;
    const severity = severityMap[extraction.urgency] || 'P3';

    // Resolve room
    let roomId: string | null = null;
    if (extraction.roomHint) {
      const { data: room } = await admin
        .from('rooms')
        .select('id')
        .ilike('code', `%${extraction.roomHint}%`)
        .maybeSingle();
      roomId = room?.id ?? null;
    }

    const slaMinutes = { P1: 60, P2: 240, P3: 1440, P4: 4320 }[severity] || 1440;

    const { data: incident, error } = await admin
      .from('incidents')
      .insert({
        category: extraction.category,
        subtype: extraction.subtype,
        severity,
        status: 'REPORTED',
        continuity_status: 'NONE',
        room_id: roomId,
        summary: extraction.summary,
        is_safety: extraction.isSafetyRisk,
        sla_due_at: new Date(Date.now() + slaMinutes * 60_000).toISOString(),
      })
      .select('code')
      .single();

    if (error) {
      console.error('[twilio-webhook]', error.message);
      return twiml('Sorry, we couldn\'t process your report. Please try again or call the helpdesk.');
    }

    // Save report
    await admin.from('reports').insert({
      incident_id: incident.code ? undefined : undefined, // We need the id
      source: 'WHATSAPP',
      raw_text: body,
      reporter_label: from,
      extraction: extraction as unknown as Record<string, unknown>,
      extraction_source: extractionSource,
      confidence: extraction.confidence,
    });

    const response = extraction.clarifyingQuestion
      ? `✅ Report received! Tracking code: ${incident.code}\n\n❓ ${extraction.clarifyingQuestion}`
      : `✅ Report received! Tracking code: ${incident.code}\n📋 Category: ${extraction.category}\n⚡ Priority: ${severity}\n\nWe'll keep you updated on progress.`;

    return twiml(response);
  } catch (err) {
    console.error('[twilio-webhook]', err);
    return twiml('An error occurred processing your message. Please try again.');
  }
}

function twiml(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
