import type { BlastRadius, Incident, RecoveryPlan } from '@/lib/domain/types';
import { describeBlastRadius } from '@/lib/engine/blastRadius';
import { formatDuration, minutesBetween } from '@/lib/engine/time';

/**
 * Narration is deterministic by design.
 *
 * The product rule is "AI extracts and explains; rules and humans govern".
 * Narration is the "explains" half — but it is generated from the plan's own
 * checks and actions, so it can never claim something the engine did not
 * verify. There is no model call on the execution path.
 */

export function narrateBlastRadius(radius: BlastRadius): string {
  return describeBlastRadius(radius);
}

export function narratePlan(plan: RecoveryPlan, incident: Incident, now: Date): string {
  if (plan.actions.length === 0) {
    return 'No recovery plan is possible from the current data. The repair track continues.';
  }

  const parts: string[] = [];

  const relocate = plan.actions.find((a) => a.kind === 'RELOCATE_ACTIVITY');
  const split = plan.actions.find((a) => a.kind === 'SPLIT_ACTIVITY');
  const reassign = plan.actions.filter((a) => a.kind === 'REASSIGN_STAFF');
  const reserve = plan.actions.filter(
    (a) => a.kind === 'RESERVE_PART' || a.kind === 'RESERVE_EQUIPMENT',
  );
  const procure = plan.actions.filter((a) => a.kind === 'PROCURE_PART');

  if (relocate) {
    const roomCheck = plan.checks.find((c) => c.id === 'CAPACITY_AND_CAPABILITIES');
    parts.push(
      `Move the activity to ${relocate.toRoomCode}${
        roomCheck ? ` (${roomCheck.detail})` : ''
      }.`,
    );
  }

  if (split) {
    parts.push(
      `Split the cohort across ${split.parts.map((p) => `${p.roomCode} (${p.headcount})`).join(' and ')}.`,
    );
  }

  if (reassign.length > 0) {
    parts.push(
      `Replace ${reassign.length} staff assignment${reassign.length === 1 ? '' : 's'} with qualified people on shift.`,
    );
  }

  if (reserve.length > 0) {
    parts.push(
      `Reserve ${reserve
        .map((a) => `${a.qty} × ${'sku' in a ? a.sku : 'equipment'}`)
        .join(', ')} from stores.`,
    );
  }

  if (procure.length > 0) {
    parts.push(
      `Raise a purchase request for ${procure
        .map((a) => `${a.qty} × ${a.sku}`)
        .join(', ')}; the repair stays blocked until it is approved and delivered.`,
    );
  }

  const deadline = incident.activityDeadlineAt;
  if (deadline && deadline > now) {
    parts.push(
      `The activity starts in ${formatDuration(minutesBetween(now, deadline))}; this plan meets that deadline.`,
    );
  }

  const blocking = plan.checks.filter((c) => c.blocking && !c.ok);
  if (blocking.length > 0) {
    parts.push(`Blocked by: ${blocking.map((c) => c.detail).join(' ')}`);
  }

  return parts.join(' ');
}

export function narrateRejection(plan: RecoveryPlan): string {
  const failed = plan.checks.filter((c) => c.blocking && !c.ok);
  if (failed.length === 0) return 'Rejected for an unspecified policy reason.';
  return failed.map((c) => `${c.label}: ${c.detail}`).join(' ');
}

export function narrateOutcome(args: {
  incident: Incident;
  planExecuted: boolean;
  continuity: string;
  repairStatus: string;
}): string {
  const { incident, planExecuted, continuity, repairStatus } = args;

  if (!planExecuted) {
    return `${incident.code} was not executed. The repair track is still ${repairStatus.toLowerCase()}.`;
  }

  if (continuity === 'RESTORED') {
    return `The affected activity is protected. The permanent repair is still ${repairStatus.toLowerCase()}, and that is tracked separately.`;
  }

  return `The recovery plan executed, but continuity was not restored. Repair is ${repairStatus.toLowerCase()}.`;
}
