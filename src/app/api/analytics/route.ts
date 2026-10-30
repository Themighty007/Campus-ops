import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSession } from '@/lib/governance/session';
import { assertCapability } from '@/lib/governance/rbac';

/**
 * GET /api/analytics — dashboard data from analytics views.
 */
export async function GET() {
  try {
    const { actor } = await requireSession();
    assertCapability(actor, 'analytics:read');

    const admin = createAdminClient();

    const [openRes, slaRes, workloadRes, stockRes, scorecardRes, recentAuditRes] = await Promise.all([
      admin.from('v_open_incidents').select('*'),
      admin.from('v_sla_compliance').select('*'),
      admin.from('v_staff_workload').select('*'),
      admin.from('v_stock_shortages').select('*'),
      admin.from('v_department_scorecard').select('*'),
      admin.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    return NextResponse.json({
      openIncidents: openRes.data ?? [],
      slaCompliance: slaRes.data ?? [],
      staffWorkload: workloadRes.data ?? [],
      stockShortages: stockRes.data ?? [],
      departmentScorecard: scorecardRes.data ?? [],
      recentAudit: recentAuditRes.data ?? [],
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
  console.error('[analytics]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
