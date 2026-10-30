import type { Actor, Incident, RecoveryPlan, WorkOrder } from '@/lib/domain/types';

/**
 * Separation of duties.
 *
 * These are the exact rules enforced by supabase/migrations/0009_functions.sql
 * and 0013_workflows.sql. They are mirrored here for three reasons:
 *
 *   1. the UI can disable a button before a round-trip;
 *   2. services can return a precise 403 without parsing a Postgres string;
 *   3. tests can prove the rule without a database.
 *
 * Mirroring is only safe because the SQL is authoritative. If the two ever
 * disagree, Postgres wins and the user sees the Postgres code.
 */
export interface SodViolation {
  code:
    | 'SOD_CREATOR'
    | 'SOD_REPORTER'
    | 'SOD_ASSIGNEE'
    | 'SOD_REQUESTER'
    | 'SOD_UPLOADER';
  message: string;
}

export interface PlanApprovalContext {
  plan: Pick<RecoveryPlan, 'createdBy' | 'requiredRoles'>;
  incident: Pick<Incident, 'reporterId'>;
  workOrders: Array<Pick<WorkOrder, 'assigneeId'>>;
}

export function checkPlanApproval(
  actor: Actor,
  ctx: PlanApprovalContext,
): SodViolation | null {
  if (ctx.plan.createdBy && ctx.plan.createdBy === actor.id) {
    return {
      code: 'SOD_CREATOR',
      message: 'You created this plan, so you cannot approve it. Ask a second authorised person.',
    };
  }

  if (ctx.incident.reporterId && ctx.incident.reporterId === actor.id) {
    return {
      code: 'SOD_REPORTER',
      message: 'You reported this incident, so you cannot approve its recovery plan.',
    };
  }

  if (ctx.workOrders.some((w) => w.assigneeId === actor.id)) {
    return {
      code: 'SOD_ASSIGNEE',
      message: 'You are assigned to repair this incident, so you cannot approve the recovery plan.',
    };
  }

  return null;
}

export function checkPurchaseApproval(
  actor: Actor,
  purchase: { requestedBy: string | null },
): SodViolation | null {
  if (purchase.requestedBy && purchase.requestedBy === actor.id) {
    return {
      code: 'SOD_REQUESTER',
      message: 'You requested this purchase, so you cannot approve it.',
    };
  }
  return null;
}

export function checkEvidenceVerification(
  actor: Actor,
  evidence: { uploadedBy: string | null }[],
): SodViolation | null {
  if (evidence.some((e) => e.uploadedBy === actor.id)) {
    return {
      code: 'SOD_UPLOADER',
      message: 'You uploaded this evidence, so you cannot verify it. Ask a second authorised person.',
    };
  }
  return null;
}

/**
 * The list the UI renders next to an approval button, so the reason is visible
 * before the click rather than after the error.
 */
export function explainPlanApprovalRules(actor: Actor, ctx: PlanApprovalContext): string[] {
  const reasons: string[] = [];
  if (ctx.plan.createdBy === actor.id) reasons.push('You created this plan.');
  if (ctx.incident.reporterId === actor.id) reasons.push('You reported this incident.');
  if (ctx.workOrders.some((w) => w.assigneeId === actor.id)) {
    reasons.push('You are assigned to the repair work order.');
  }
  return reasons;
}
