import { describe, expect, it } from 'vitest';
import {
  CAPABILITIES,
  EXPERIENCE_LABELS,
  EXPERIENCE_ROLES,
  ROLE_CAPABILITIES,
  approverRolesFor,
  can,
  canReadIncident,
  capabilitiesFor,
  experienceForActor,
  isStaffRole,
  mayApprovePlan,
  type LoginExperience,
} from '@/lib/governance/rbac';
import { USER_ROLES, type UserRole } from '@/lib/domain/enums';
import type { Actor } from '@/lib/domain/types';
import { IDS, incident } from './fixtures';

function actor(role: UserRole, overrides: Partial<Actor> = {}): Actor {
  return {
    id: `actor-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@aegis.demo`,
    fullName: `Test ${role}`,
    role,
    departmentId: null,
    requesterKind: null,
    ...overrides,
  };
}

describe('role → capability matrix', () => {
  it('gives every role an explicit capability list', () => {
    for (const role of USER_ROLES) {
      expect(ROLE_CAPABILITIES[role], role).toBeDefined();
      expect(ROLE_CAPABILITIES[role].length, role).toBeGreaterThan(0);
    }
  });

  it('only ever references declared capabilities', () => {
    for (const role of USER_ROLES) {
      for (const capability of capabilitiesFor(role)) {
        expect(CAPABILITIES).toContain(capability);
      }
    }
  });

  it('lets a requester report but not approve or triage', () => {
    const requester = actor('REQUESTER');
    expect(can(requester, 'incident:create')).toBe(true);
    expect(can(requester, 'plan:approve')).toBe(false);
    expect(can(requester, 'incident:triage')).toBe(false);
    expect(can(requester, 'analytics:read')).toBe(false);
  });

  it('lets a technician do their own work and nothing beyond it', () => {
    const technician = actor('TECHNICIAN');
    expect(can(technician, 'workorder:transition:own')).toBe(true);
    expect(can(technician, 'workorder:transition:any')).toBe(false);
    expect(can(technician, 'workorder:assign')).toBe(false);
    expect(can(technician, 'plan:approve')).toBe(false);
    expect(can(technician, 'evidence:verify')).toBe(false);
  });

  it('lets a department manager approve plans and verify evidence', () => {
    const manager = actor('DEPARTMENT_MANAGER');
    expect(can(manager, 'plan:approve')).toBe(true);
    expect(can(manager, 'evidence:verify')).toBe(true);
    expect(can(manager, 'admin:users')).toBe(false);
  });

  it('separates procurement approval from everything operational', () => {
    const procurement = actor('PROCUREMENT_APPROVER');
    expect(can(procurement, 'purchase:approve')).toBe(true);
    expect(can(procurement, 'plan:approve')).toBe(false);
    expect(can(procurement, 'workorder:assign')).toBe(false);
    expect(can(procurement, 'evidence:verify')).toBe(false);
  });

  it('keeps system administration away from operational decisions', () => {
    const sysadmin = actor('SYSTEM_ADMIN');
    expect(can(sysadmin, 'admin:users')).toBe(true);
    expect(can(sysadmin, 'admin:demo')).toBe(true);
    expect(can(sysadmin, 'plan:approve')).toBe(false);
    expect(can(sysadmin, 'incident:create')).toBe(false);
    expect(can(sysadmin, 'purchase:approve')).toBe(false);
  });

  it('gives facilities the demo controls and the approvals', () => {
    const facilities = actor('FACILITIES_ADMIN');
    expect(can(facilities, 'admin:demo')).toBe(true);
    expect(can(facilities, 'plan:approve')).toBe(true);
    expect(can(facilities, 'workorder:assign')).toBe(true);
  });
});

describe('four login experiences, six roles', () => {
  it('covers every role with at least one experience', () => {
    const seen = new Set<UserRole>();
    for (const experience of Object.keys(EXPERIENCE_ROLES) as LoginExperience[]) {
      for (const role of EXPERIENCE_ROLES[experience]) seen.add(role);
    }
    expect([...seen].sort()).toEqual([...USER_ROLES].sort());
  });

  it('only lets requester_kind split a role across experiences', () => {
    for (const role of USER_ROLES) {
      const experiences = (Object.keys(EXPERIENCE_ROLES) as LoginExperience[]).filter((experience) =>
        EXPERIENCE_ROLES[experience].includes(role),
      );

      if (role === 'REQUESTER') {
        // A requester is a student or a faculty member; that is a profile
        // field, not a permission, so both experiences are legitimate.
        expect(experiences.sort()).toEqual(['faculty', 'student']);
      } else {
        expect(experiences, role).toHaveLength(1);
      }
    }
  });

  it('resolves every actor to an experience that lists their role', () => {
    const kinds = [null, 'STUDENT', 'FACULTY'] as const;

    for (const role of USER_ROLES) {
      for (const requesterKind of kinds) {
        const experience = experienceForActor({ role, requesterKind });
        expect(EXPERIENCE_ROLES[experience], `${role}/${requesterKind}`).toContain(role);
      }
    }
  });

  it('sends a faculty requester to the faculty experience and a student to the student one', () => {
    expect(experienceForActor({ role: 'REQUESTER', requesterKind: 'FACULTY' })).toBe('faculty');
    expect(experienceForActor({ role: 'REQUESTER', requesterKind: 'STUDENT' })).toBe('student');
  });

  it('never over-exposes a requester whose kind is missing', () => {
    expect(experienceForActor({ role: 'REQUESTER', requesterKind: null })).toBe('student');
  });

  it('labels every experience for the login screen', () => {
    for (const experience of Object.keys(EXPERIENCE_LABELS) as LoginExperience[]) {
      expect(EXPERIENCE_LABELS[experience]).toBeTruthy();
    }
  });

  it('treats everyone except requesters as operational staff', () => {
    expect(isStaffRole('REQUESTER')).toBe(false);
    for (const role of USER_ROLES.filter((r) => r !== 'REQUESTER')) {
      expect(isStaffRole(role), role).toBe(true);
    }
  });
});

describe('incident visibility', () => {
  const owner = actor('REQUESTER', { id: IDS.staff.meera });

  it('lets the reporter read their own incident', () => {
    expect(canReadIncident(owner, incident)).toBe(true);
  });

  it('hides another department’s incident from a technician', () => {
    const outsider = actor('TECHNICIAN', { departmentId: 'dept-it' });
    expect(canReadIncident(outsider, incident)).toBe(false);
  });

  it('lets a technician read an incident in their own department', () => {
    const insider = actor('TECHNICIAN', { departmentId: IDS.department });
    expect(canReadIncident(insider, incident)).toBe(true);
  });

  it('lets facilities and system admins read everything', () => {
    expect(canReadIncident(actor('FACILITIES_ADMIN'), incident)).toBe(true);
    expect(canReadIncident(actor('SYSTEM_ADMIN'), incident)).toBe(true);
  });

  it('does not leak an unassigned incident to an unrelated requester', () => {
    const stranger = actor('REQUESTER', { id: 'someone-else' });
    expect(canReadIncident(stranger, incident)).toBe(false);
  });
});

describe('plan approval authority', () => {
  it('requires an independent approver for every severity', () => {
    for (const severity of ['P1', 'P2', 'P3', 'P4'] as const) {
      const roles = approverRolesFor(severity);
      expect(roles).toContain('FACILITIES_ADMIN');
      expect(roles).not.toContain('REQUESTER');
      expect(roles).not.toContain('TECHNICIAN');
      expect(roles).not.toContain('PROCUREMENT_APPROVER');
    }
  });

  it('honours the plan’s own required roles when it states them', () => {
    const manager = actor('DEPARTMENT_MANAGER');
    const technician = actor('TECHNICIAN');

    expect(
      mayApprovePlan(manager, { severity: 'P1', requiredRoles: ['DEPARTMENT_MANAGER'] }),
    ).toBe(true);
    expect(
      mayApprovePlan(technician, { severity: 'P1', requiredRoles: ['DEPARTMENT_MANAGER'] }),
    ).toBe(false);
  });
});
