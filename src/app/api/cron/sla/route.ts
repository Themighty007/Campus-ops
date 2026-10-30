import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/cron/sla — SLA escalation sweep.
 *
 * Called by Vercel Cron or manually. Finds incidents past their SLA deadline
 * and escalates them.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  const expected = process.env.CRON_SECRET || 'dev-cron-secret';
  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // Find SLA breaches
  const { data: breached } = await admin
    .from('incidents')
    .select('id, code, severity, status, sla_due_at')
    .not('status', 'in', '("RESOLVED","CLOSED","REJECTED","MERGED","ESCALATED")')
    .lt('sla_due_at', now.toISOString())
    .not('sla_due_at', 'is', null);

  if (!breached || breached.length === 0) {
    return NextResponse.json({ escalated: 0 });
  }

  let escalated = 0;
  for (const incident of breached) {
    await admin
      .from('incidents')
      .update({ status: 'ESCALATED' })
      .eq('id', incident.id);

    await admin.from('audit_log').insert({
      incident_id: incident.id,
      actor_kind: 'SYSTEM',
      action: 'SLA_BREACH_ESCALATED',
      payload: {
        severity: incident.severity,
        slaDueAt: incident.sla_due_at,
        breachedBy: Math.round((now.getTime() - new Date(incident.sla_due_at).getTime()) / 60_000) + ' minutes',
      },
    });
    escalated++;
  }

  return NextResponse.json({ escalated, total: breached.length });
}
