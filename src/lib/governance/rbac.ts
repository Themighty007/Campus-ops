import type { Actor, Incident } from '@/lib/domain/types';
import type { UserRole } from '@/lib/domain/enums';
import { ServiceError } from '@/lib/domain/errors';

/**
 * Capability-based RBAC.
 *
 * Roles are coarse (six of them). Capabilities are what the code actually
 * checks. That keeps the UI honest: a button is shown because the actor holds a
 * capability, not because the actor happens to have a role string.
 *
 * These checks are duplicated deliberately in Postgres. The TypeScript layer
 * gives fast, friendly errors; Postgres is the enforcement point.
 */
export const CAPABILITIES = [
  'incident:create',
  'incident:read:own',
  'incident:read:department',
  'incident:read:all',
  'incident:transition',
  'incident:triage',
  'plan:generate',
  'plan:approve',
  'plan:reject',
  'workorder:assign',
  'workorder:transition:own',
  'workorder:transition:any',
  'evidence:upload',
  'evidence:verify',
  'purchase:request',
  'purchase:approve',
  'nudge:respond',
  'analytics:read',
  'admin:users',
  'admin:demo',
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const REQUESTER: Capability[] = ['incident:create', 'incident:read:own', 'evidence:upload'];

const TECHNICIAN: Capability[] = [
  'incident:create',
  'incident:read:own',
  'incident:read:department',
  'incident:transition',
  'workorder:transition:own',
  'evidence:upload',
  'purchase:request',
  'analytics:read',
];

const DEPARTMENT_MANAGER: Capability[] = [
  'incident:create',
  'incident:read:own',
  'incident:read:department',
  'incident:read:all',
  'incident:transition',
  'incident:triage',
  'plan:generate',
  'plan:approve',
  'plan:reject',
  'workorder:assign',
  'workorder:transition:any',
  'evidence:upload',
  'evidence:verify',
  'purchase:request',
  'nudge:respond',
  'analytics:read',
];

const FACILITIES_ADMIN: Capability[] = [
  'incident:create',
  'incident:read:own',
  'incident:read:department',
  'incident:read:all',
  'incident:transition',
  'incident:triage',
  'plan:generate',
  'plan:approve',
  'plan:reject',
  'workorder:assign',
  'workorder:transition:any',
  'evidence:upload',
  'evidence:verify',
  'purchase:request',
  'nudge:respond',
  'analytics:read',
  'admin:demo',
];

const PROCUREMENT_APPROVER: Capability[] = [
  'incident:create',
  'incident:read:own',
  'incident:read:department',
  'incident:read:all',
  'purchase:request',
  'purchase:approve',
  'analytics:read',
];

const SYSTEM_ADMIN: Capability[] = [
  'incident:read:all',
  'analytics:read',
  'admin:users',
  'admin:demo',
];

export const ROLE_CAPABILITIES: Record<UserRole, readonly Capability[]> = {
  REQUESTER,
  TECHNICIAN,
  DEPARTMENT_MANAGER,
  FACILITIES_ADMIN,
  PROCUREMENT_APPROVER,
  SYSTEM_ADMIN,
};

/**
 * Four friendly login experiences, one auth system, six backend roles.
 *
 * The split is by *person*, not by permission. A requester is either a student
 * or a faculty member, and that distinction lives in `requester_kind` on the
 * profile — not in the role. So a role alone cannot always name the experience;
 * `experienceForActor` is the one function that resolves it, and this table is
 * the reverse index used to validate that resolution.
 */
export type LoginExperience = 'student' | 'faculty' | 'staff' | 'administrator';

export const EXPERIENCE_ROLES: Record<LoginExperience, readonly UserRole[]> = {
  student: ['REQUESTER'],
  faculty: ['REQUESTER', 'DEPARTMENT_MANAGER'],
  staff: ['TECHNICIAN', 'PROCUREMENT_APPROVER'],
  administrator: ['FACILITIES_ADMIN', 'SYSTEM_ADMIN'],
};

export const EXPERIENCE_LABELS: Record<LoginExperience, string> = {
  student: 'Student',
  faculty: 'Faculty or Department Manager',
  staff: 'Campus Staff',
  administrator: 'Administrator',
};

/**
 * Resolve the login experience for a signed-in person.
 *
 * A requester with no `requester_kind` gets the student experience: it is the
 * least-privileged landing page, so a missing field can never over-expose.
 */
export function experienceForActor(
  actor: Pick<Actor, 'role' | 'requesterKind'>,
): LoginExperience {
  switch (actor.role) {
    case 'FACILITIES_ADMIN':
    case 'SYSTEM_ADMIN':
      return 'administrator';
    case 'TECHNICIAN':
    case 'PROCUREMENT_APPROVER':
      return 'staff';
    case 'DEPARTMENT_MANAGER':
      return 'faculty';
    case 'REQUESTER':
      return actor.requesterKind === 'FACULTY' ? 'faculty' : 'student';
  }
}

export function capabilitiesFor(role: UserRole): readonly Capability[] {
  return ROLE_CAPABILITIES[role];
}

export function can(actor: Pick<Actor, 'role'>, capability: Capability): boolean {
  return ROLE_CAPABILITIES[actor.role].includes(capability);
}

export function canAny(actor: Pick<Actor, 'role'>, capabilities: Capability[]): boolean {
  return capabilities.some((c) => can(actor, c));
}

export function assertCapability(actor: Actor, capability: Capability): void {
  if (!can(actor, capability)) {
    throw new ServiceError(
      'FORBIDDEN',
      `Your role (${actor.role}) cannot perform ${capability}.`,
      403,
      { capability, role: actor.role },
    );
  }
}

/** Roles that count as operational staff (used by RLS mirrors and UI chrome). */
export function isStaffRole(role: UserRole): boolean {
  return (
    role === 'TECHNICIAN' ||
    role === 'DEPARTMENT_MANAGER' ||
    role === 'FACILITIES_ADMIN' ||
    role === 'PROCUREMENT_APPROVER' ||
    role === 'SYSTEM_ADMIN'
  );
}

/**
 * Row-level visibility mirror. Postgres RLS is authoritative; this exists so a
 * service can return a clean 403 instead of an empty array.
 */
export function canReadIncident(actor: Actor, incident: Incident): boolean {
  if (can(actor, 'incident:read:all')) return true;
  if (incident.reporterId === actor.id) return true;
  if (
    can(actor, 'incident:read:department') &&
    actor.departmentId !== null &&
    incident.departmentId === actor.departmentId
  ) {
    return true;
  }
  return false;
}

export function assertCanReadIncident(actor: Actor, incident: Incident): void {
  if (!canReadIncident(actor, incident)) {
    throw new ServiceError('FORBIDDEN', 'You cannot read this incident.', 403, {
      incidentId: incident.id,
    });
  }
}

/**
 * Which role may approve a recovery plan of a given severity.
 * Critical activity protection always requires Facilities.
 */
export function approverRolesFor(severity: Incident['severity']): UserRole[] {
  if (severity === 'P1' || severity === 'P2') {
    return ['FACILITIES_ADMIN', 'DEPARTMENT_MANAGER'];
  }
  return ['FACILITIES_ADMIN', 'DEPARTMENT_MANAGER'];
}

export function mayApprovePlan(
  actor: Actor,
  args: { severity: Incident['severity']; requiredRoles: UserRole[] },
): boolean {
  const allowed = args.requiredRoles.length > 0 ? args.requiredRoles : approverRolesFor(args.severity);
  return allowed.includes(actor.role);
}
