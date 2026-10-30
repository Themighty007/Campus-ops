import { describe, expect, it } from 'vitest';
import {
  checkEvidenceVerification,
  checkPlanApproval,
  checkPurchaseApproval,
  explainPlanApprovalRules,
} from '@/lib/governance/sod';
import type { Actor } from '@/lib/domain/types';
import { IDS, incident, workOrder } from './fixtures';

function actor(id: string, role: Actor['role'] = 'FACILITIES_ADMIN'): Actor {
  return {
    id,
    email: `${id}@aegis.demo`,
    fullName: id,
    role,
    departmentId: null,
    requesterKind: null,
  };
}

const plan = {
  createdBy: IDS.staff.ananya,
  requiredRoles: ['FACILITIES_ADMIN', 'DEPARTMENT_MANAGER'] as Actor['role'][],
};

const context = {
  plan,
  incident,
  workOrders: [{ assigneeId: IDS.staff.ravi }],
};

describe('plan approval separation of duties', () => {
  it('refuses the person who generated the plan', () => {
    const violation = checkPlanApproval(actor(IDS.staff.ananya), context);
    expect(violation?.code).toBe('SOD_CREATOR');
    expect(violation?.message).toMatch(/created this plan/i);
  });

  it('refuses the person who reported the incident', () => {
    const violation = checkPlanApproval(actor(IDS.staff.meera), context);
    expect(violation?.code).toBe('SOD_REPORTER');
  });

  it('refuses the technician assigned to the repair', () => {
    const violation = checkPlanApproval(actor(IDS.staff.ravi), context);
    expect(violation?.code).toBe('SOD_ASSIGNEE');
  });

  it('allows an independent, authorised approver', () => {
    expect(checkPlanApproval(actor(IDS.staff.suresh), context)).toBeNull();
  });

  it('treats a null creator as "no conflict" rather than "unknown, allow anything"', () => {
    const violation = checkPlanApproval(actor('anyone'), {
      ...context,
      plan: { createdBy: null, requiredRoles: plan.requiredRoles },
    });
    expect(violation).toBeNull();
  });

  it('explains every reason a person cannot approve, before they click', () => {
    const reasons = explainPlanApprovalRules(actor(IDS.staff.ananya), context);
    expect(reasons).toContain('You created this plan.');
  });

  it('gives no reasons to someone who may approve', () => {
    expect(explainPlanApprovalRules(actor(IDS.staff.suresh), context)).toEqual([]);
  });

  it('uses the same rule for a requester who is also the creator', () => {
    const violation = checkPlanApproval(actor(IDS.staff.ananya, 'DEPARTMENT_MANAGER'), context);
    expect(violation?.code).toBe('SOD_CREATOR');
  });
});

describe('purchase approval separation of duties', () => {
  it('refuses the requester', () => {
    const violation = checkPurchaseApproval(actor(IDS.staff.ravi), {
      requestedBy: IDS.staff.ravi,
    });
    expect(violation?.code).toBe('SOD_REQUESTER');
  });

  it('allows a different approver', () => {
    expect(
      checkPurchaseApproval(actor(IDS.staff.vikram), { requestedBy: IDS.staff.ravi }),
    ).toBeNull();
  });

  it('does not block an unattributed request', () => {
    expect(checkPurchaseApproval(actor(IDS.staff.vikram), { requestedBy: null })).toBeNull();
  });
});

describe('evidence verification separation of duties', () => {
  it('refuses the uploader', () => {
    const violation = checkEvidenceVerification(actor(IDS.staff.ravi), [
      { uploadedBy: IDS.staff.ravi },
    ]);
    expect(violation?.code).toBe('SOD_UPLOADER');
  });

  it('allows a second person', () => {
    expect(
      checkEvidenceVerification(actor(IDS.staff.suresh), [{ uploadedBy: IDS.staff.ravi }]),
    ).toBeNull();
  });

  it('does not block evidence with no uploader on record', () => {
    expect(checkEvidenceVerification(actor(IDS.staff.suresh), [{ uploadedBy: null }])).toBeNull();
  });
});

describe('work order fixture', () => {
  it('attributes the repair to a technician, which is why that technician cannot approve', () => {
    expect(workOrder.assigneeId).toBe(IDS.staff.ravi);
    expect(checkPlanApproval(actor(workOrder.assigneeId!), context)?.code).toBe('SOD_ASSIGNEE');
  });
});
