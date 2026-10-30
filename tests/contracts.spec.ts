import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_KINDS,
  ACTIVITY_STATUSES,
  APPROVAL_STATUSES,
  APPROVAL_SUBJECTS,
  ASSET_STATUSES,
  BOOKING_STATUSES,
  CATEGORY_DEPARTMENT,
  CATEGORY_SKILL,
  CHECK_IDS,
  CONTINUITY_STATUSES,
  EVIDENCE_KINDS,
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  PLAN_ACTION_KINDS,
  PLAN_STATUSES,
  PURCHASE_STATUSES,
  REPORT_SOURCES,
  REQUESTER_KINDS,
  SEVERITIES,
  SLA_MINUTES,
  USER_ROLES,
  WORK_ORDER_STATUSES,
} from '@/lib/domain/enums';
import { planRecovery } from '@/lib/engine/planner';
import { buildPlannerInput } from './fixtures';

const ROOT = path.resolve(__dirname, '..');

function migration(name: string): string {
  return readFileSync(path.join(ROOT, 'supabase', 'migrations', name), 'utf8');
}

/** Parse every `create type <name> as enum ( ... );` in 0002. */
function parsePostgresEnums(): Map<string, string[]> {
  const sql = migration('0002_enums.sql');
  const enums = new Map<string, string[]>();

  const typePattern = /create type\s+(\w+)\s+as enum\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = typePattern.exec(sql)) !== null) {
    const name = match[1]!;
    const body = match[2]!;
    const labels = [...body.matchAll(/'([^']*)'/g)].map((m) => m[1]!);
    enums.set(name, labels);
  }

  return enums;
}

const TS_BY_SQL_TYPE: Record<string, readonly string[]> = {
  user_role: USER_ROLES,
  requester_kind: REQUESTER_KINDS,
  severity: SEVERITIES,
  incident_category: INCIDENT_CATEGORIES,
  incident_status: INCIDENT_STATUSES,
  continuity_status: CONTINUITY_STATUSES,
  activity_kind: ACTIVITY_KINDS,
  booking_status: BOOKING_STATUSES,
  work_order_status: WORK_ORDER_STATUSES,
  plan_status: PLAN_STATUSES,
  approval_status: APPROVAL_STATUSES,
  approval_subject: APPROVAL_SUBJECTS,
  report_source: REPORT_SOURCES,
  notification_channel: NOTIFICATION_CHANNELS,
  notification_status: NOTIFICATION_STATUSES,
  evidence_kind: EVIDENCE_KINDS,
  purchase_status: PURCHASE_STATUSES,
  asset_status: ASSET_STATUSES,
};

describe('Postgres ↔ TypeScript enum contract', () => {
  const enums = parsePostgresEnums();

  it('finds every enum declared in 0002_enums.sql', () => {
    expect(enums.size).toBeGreaterThanOrEqual(18);
  });

  it('has a TypeScript counterpart for every SQL enum', () => {
    for (const name of enums.keys()) {
      expect(TS_BY_SQL_TYPE[name], `no TS constant mapped to ${name}`).toBeDefined();
    }
  });

  it('matches label-for-label, in order, for every enum', () => {
    for (const [name, labels] of enums) {
      const ts = TS_BY_SQL_TYPE[name];
      expect(ts, name).toEqual(labels);
    }
  });

  it('does not declare a TypeScript enum value that Postgres would reject', () => {
    for (const [name, labels] of enums) {
      const ts = new Set(TS_BY_SQL_TYPE[name]);
      for (const label of labels) {
        expect(ts.has(label), `${name}.${label} missing from TypeScript`).toBe(true);
      }
    }
  });
});

describe('text columns documented in SQL', () => {
  it('keeps activity_status values identical to the scheduling table comment', () => {
    const sql = migration('0004_scheduling.sql');
    for (const status of ACTIVITY_STATUSES) {
      expect(sql, `${status} is not documented in 0004_scheduling.sql`).toContain(status);
    }
  });

  it('keeps every plan action kind executable by the SQL executor', () => {
    const sql = migration('0009_functions.sql');
    for (const kind of PLAN_ACTION_KINDS) {
      expect(sql, `${kind} is not handled by apply_plan_action`).toContain(`when '${kind}'`);
    }
  });

  it('keeps every plan action kind produced by the planner executable', () => {
    const result = planRecovery(buildPlannerInput());
    const emitted = new Set(
      [...result.feasible, ...result.rejected].flatMap((plan) => plan.actions.map((a) => a.kind)),
    );

    expect(emitted.size).toBeGreaterThan(0);
    for (const kind of emitted) {
      expect(PLAN_ACTION_KINDS).toContain(kind);
    }
  });
});

describe('constraint checks', () => {
  it('declares exactly the nine checks the planner evaluates', () => {
    expect(CHECK_IDS).toHaveLength(9);
    expect(new Set(CHECK_IDS).size).toBe(9);
  });

  it('uses the same identifiers in the planner', () => {
    const planner = readFileSync(path.join(ROOT, 'src', 'lib', 'engine', 'planner.ts'), 'utf8');
    for (const id of CHECK_IDS) {
      expect(planner, `${id} is never evaluated`).toContain(`'${id}'`);
    }
  });
});

describe('routing tables', () => {
  it('routes every category to a real department code', () => {
    const sql = migration('0012_seed.sql');
    for (const category of INCIDENT_CATEGORIES) {
      const code = CATEGORY_DEPARTMENT[category];
      expect(code, category).toBeTruthy();
      expect(sql, `department ${code} is not seeded`).toContain(`'${code}'`);
    }
  });

  it('gives every category a repair skill', () => {
    for (const category of INCIDENT_CATEGORIES) {
      expect(CATEGORY_SKILL[category], category).toMatch(/^[A-Z]+$/);
    }
  });

  it('matches the SLA ladder documented in POL-SLA', () => {
    const sql = migration('0012_seed.sql');
    expect(sql).toContain(
      `"P1":${SLA_MINUTES.P1},"P2":${SLA_MINUTES.P2},"P3":${SLA_MINUTES.P3},"P4":${SLA_MINUTES.P4}`,
    );
  });
});
