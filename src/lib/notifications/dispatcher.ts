/**
 * Notification dispatcher — pure fetch(), no SDKs.
 *
 * Each function logs a row in the `notifications` table, then attempts delivery.
 * If API keys are missing, the status is SIMULATED instead of SENT.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

// ---------------------------------------------------------------------------
// WhatsApp via Twilio REST API
// ---------------------------------------------------------------------------

export async function sendWhatsApp(
  client: SupabaseClient,
  opts: {
    to: string;
    body: string;
    incidentId?: string;
    recipientId?: string;
  },
): Promise<{ status: 'SENT' | 'SIMULATED' | 'FAILED'; providerId?: string; error?: string }> {
  const env = getEnv();
  const dedupeKey = `wa:${opts.to}:${opts.body.slice(0, 60)}`;

  // Check dedupe
  const { data: existing } = await client
    .from('notifications')
    .select('id')
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();
  if (existing) return { status: 'SIMULATED' };

  // Insert notification row
  const { data: row } = await client
    .from('notifications')
    .insert({
      incident_id: opts.incidentId ?? null,
      recipient_id: opts.recipientId ?? null,
      recipient_address: opts.to,
      channel: 'WHATSAPP',
      template: 'generic',
      payload: { body: opts.body },
      status: 'QUEUED',
      dedupe_key: dedupeKey,
    })
    .select('id')
    .single();

  if (!env.twilioLive || !env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    if (row) {
      await client.from('notifications').update({ status: 'SIMULATED' }).eq('id', row.id);
    }
    console.log(`[WhatsApp SIMULATED] to=${opts.to} body="${opts.body.slice(0, 80)}"`);
    return { status: 'SIMULATED' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        From: env.TWILIO_WHATSAPP_FROM,
        To: `whatsapp:${opts.to}`,
        Body: opts.body,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Twilio ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const json = (await resp.json()) as { sid?: string };
    if (row) {
      await client
        .from('notifications')
        .update({ status: 'SENT', provider_id: json.sid ?? null, attempts: 1 })
        .eq('id', row.id);
    }
    return { status: 'SENT', providerId: json.sid };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (row) {
      await client
        .from('notifications')
        .update({ status: 'FAILED', last_error: errorMsg.slice(0, 500), attempts: 1 })
        .eq('id', row.id);
    }
    console.error('[WhatsApp FAILED]', errorMsg);
    return { status: 'FAILED', error: errorMsg };
  }
}

// ---------------------------------------------------------------------------
// Email via Resend REST API
// ---------------------------------------------------------------------------

export async function sendEmail(
  client: SupabaseClient,
  opts: {
    to: string;
    subject: string;
    html: string;
    incidentId?: string;
    recipientId?: string;
  },
): Promise<{ status: 'SENT' | 'SIMULATED' | 'FAILED'; providerId?: string; error?: string }> {
  const env = getEnv();
  const dedupeKey = `email:${opts.to}:${opts.subject.slice(0, 60)}`;

  const { data: existing } = await client
    .from('notifications')
    .select('id')
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();
  if (existing) return { status: 'SIMULATED' };

  const { data: row } = await client
    .from('notifications')
    .insert({
      incident_id: opts.incidentId ?? null,
      recipient_id: opts.recipientId ?? null,
      recipient_address: opts.to,
      channel: 'EMAIL',
      template: 'generic',
      payload: { subject: opts.subject },
      status: 'QUEUED',
      dedupe_key: dedupeKey,
    })
    .select('id')
    .single();

  if (!env.mailLive || !env.RESEND_API_KEY) {
    if (row) {
      await client.from('notifications').update({ status: 'SIMULATED' }).eq('id', row.id);
    }
    console.log(`[Email SIMULATED] to=${opts.to} subject="${opts.subject}"`);
    return { status: 'SIMULATED' };
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Resend ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const json = (await resp.json()) as { id?: string };
    if (row) {
      await client
        .from('notifications')
        .update({ status: 'SENT', provider_id: json.id ?? null, attempts: 1 })
        .eq('id', row.id);
    }
    return { status: 'SENT', providerId: json.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (row) {
      await client
        .from('notifications')
        .update({ status: 'FAILED', last_error: errorMsg.slice(0, 500), attempts: 1 })
        .eq('id', row.id);
    }
    console.error('[Email FAILED]', errorMsg);
    return { status: 'FAILED', error: errorMsg };
  }
}

// ---------------------------------------------------------------------------
// In-app notification (always succeeds — inserted directly)
// ---------------------------------------------------------------------------

export async function sendInApp(
  client: SupabaseClient,
  opts: {
    recipientId: string;
    template: string;
    payload: Record<string, unknown>;
    incidentId?: string;
  },
): Promise<void> {
  await client.from('notifications').insert({
    incident_id: opts.incidentId ?? null,
    recipient_id: opts.recipientId,
    recipient_address: null,
    channel: 'IN_APP',
    template: opts.template,
    payload: opts.payload,
    status: 'SENT',
    dedupe_key: `inapp:${opts.recipientId}:${opts.template}:${Date.now()}`,
  });
}
