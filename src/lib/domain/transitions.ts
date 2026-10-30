import type { IncidentStatus } from './enums';

/**
 * The incident state machine, mirrored from supabase/migrations/0009_functions.sql.
 * Kept in TypeScript so the UI can grey out impossible actions before a request
 * is made — but Postgres remains the enforcement point.
 */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ['NEEDS_INFO', 'TRIAGED', 'REJECTED', 'MERGED'],
  NEEDS_INFO: ['TRIAGED', 'REJECTED'],
  TRIAGED: ['ASSIGNED', 'REJECTED', 'ESCALATED'],
  ASSIGNED: ['IN_PROGRESS', 'ESCALATED'],
  IN_PROGRESS: ['BLOCKED', 'AWAITING_EVIDENCE', 'ESCALATED'],
  BLOCKED: ['IN_PROGRESS', 'AWAITING_EVIDENCE', 'ESCALATED'],
  AWAITING_EVIDENCE: ['AWAITING_VERIFICATION'],
  AWAITING_VERIFICATION: ['RESOLVED', 'IN_PROGRESS'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  REJECTED: [],
  MERGED: [],
  ESCALATED: ['IN_PROGRESS', 'AWAITING_EVIDENCE', 'RESOLVED'],
};

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return INCIDENT_TRANSITIONS[from].includes(to);
}

export function nextStates(from: IncidentStatus): IncidentStatus[] {
  return INCIDENT_TRANSITIONS[from];
}

/**
 * Statuses that are not terminal. `RESOLVED` belongs here: the repair is done,
 * but the record still owes a closure, so it remains on someone's queue. Only
 * CLOSED, REJECTED and MERGED are finished.
 */
export const OPEN_INCIDENT_STATUSES: IncidentStatus[] = [
  'REPORTED',
  'NEEDS_INFO',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'BLOCKED',
  'AWAITING_EVIDENCE',
  'AWAITING_VERIFICATION',
  'RESOLVED',
  'ESCALATED',
];

export function isOpen(status: IncidentStatus): boolean {
  return OPEN_INCIDENT_STATUSES.includes(status);
}
