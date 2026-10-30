import { describe, expect, it } from 'vitest';
import {
  INCIDENT_TRANSITIONS,
  OPEN_INCIDENT_STATUSES,
  canTransition,
  isOpen,
  nextStates,
} from '@/lib/domain/transitions';
import { INCIDENT_STATUSES, type IncidentStatus } from '@/lib/domain/enums';

describe('incident state machine', () => {
  it('has a transition table entry for every status', () => {
    for (const status of INCIDENT_STATUSES) {
      expect(INCIDENT_TRANSITIONS[status], status).toBeDefined();
    }
  });

  it('allows the documented happy path', () => {
    expect(canTransition('REPORTED', 'TRIAGED')).toBe(true);
    expect(canTransition('TRIAGED', 'ASSIGNED')).toBe(true);
    expect(canTransition('ASSIGNED', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'AWAITING_EVIDENCE')).toBe(true);
    expect(canTransition('AWAITING_EVIDENCE', 'AWAITING_VERIFICATION')).toBe(true);
    expect(canTransition('AWAITING_VERIFICATION', 'RESOLVED')).toBe(true);
    expect(canTransition('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('does not let a report jump straight to resolved', () => {
    expect(canTransition('REPORTED', 'RESOLVED')).toBe(false);
    expect(canTransition('REPORTED', 'CLOSED')).toBe(false);
  });

  it('does not let a blocked repair skip verification', () => {
    expect(canTransition('BLOCKED', 'RESOLVED')).toBe(false);
    expect(canTransition('AWAITING_VERIFICATION', 'CLOSED')).toBe(false);
  });

  it('treats closed, rejected, and merged as terminal', () => {
    for (const terminal of ['CLOSED', 'REJECTED', 'MERGED'] as const) {
      expect(nextStates(terminal)).toEqual([]);
    }
  });

  it('lets an escalated incident re-enter the repair track', () => {
    expect(canTransition('ESCALATED', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('ESCALATED', 'RESOLVED')).toBe(true);
  });

  it('treats needs-info as recoverable, not a dead end', () => {
    expect(canTransition('NEEDS_INFO', 'TRIAGED')).toBe(true);
    expect(isOpen('NEEDS_INFO')).toBe(true);
  });

  it('agrees with itself: every allowed target is a known status', () => {
    const known = new Set<IncidentStatus>(INCIDENT_STATUSES);
    for (const status of INCIDENT_STATUSES) {
      for (const target of INCIDENT_TRANSITIONS[status]) {
        expect(known.has(target), `${status} → ${target}`).toBe(true);
      }
    }
  });

  it('lists exactly the non-terminal states as open', () => {
    for (const status of INCIDENT_STATUSES) {
      const terminal = status === 'CLOSED' || status === 'REJECTED' || status === 'MERGED';
      expect(isOpen(status), status).toBe(!terminal);
      expect(OPEN_INCIDENT_STATUSES.includes(status)).toBe(!terminal);
    }
  });
});
