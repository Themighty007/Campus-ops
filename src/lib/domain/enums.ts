/**
 * Enumerations — the single source of truth for every string that crosses the
 * Postgres boundary.
 *
 * These MUST stay byte-identical to supabase/migrations/0002_enums.sql.
 * tests/contracts.spec.ts asserts the two never drift.
 */

export const USER_ROLES = [
  'REQUESTER',
  'TECHNICIAN',
  'DEPARTMENT_MANAGER',
  'FACILITIES_ADMIN',
  'PROCUREMENT_APPROVER',
  'SYSTEM_ADMIN',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const REQUESTER_KINDS = ['STUDENT', 'FACULTY'] as const;
export type RequesterKind = (typeof REQUESTER_KINDS)[number];

export const SEVERITIES = ['P1', 'P2', 'P3', 'P4'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const INCIDENT_CATEGORIES = [
  'ELECTRICAL',
  'NETWORK',
  'PLUMBING',
  'HVAC',
  'CIVIL',
  'HOUSEKEEPING',
  'AV',
  'SAFETY',
  'OTHER',
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_STATUSES = [
  'REPORTED',
  'NEEDS_INFO',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'BLOCKED',
  'AWAITING_EVIDENCE',
  'AWAITING_VERIFICATION',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
  'MERGED',
  'ESCALATED',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const CONTINUITY_STATUSES = ['NONE', 'AT_RISK', 'PLANNED', 'RESTORED', 'LOST'] as const;
export type ContinuityStatus = (typeof CONTINUITY_STATUSES)[number];

export const ACTIVITY_KINDS = ['LECTURE', 'EXAM', 'LAB', 'EVENT', 'SERVICE'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_STATUSES = ['SCHEDULED', 'MOVED', 'CANCELLED', 'LOST'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const BOOKING_STATUSES = ['ACTIVE', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const WORK_ORDER_STATUSES = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'BLOCKED',
  'AWAITING_PARTS',
  'AWAITING_VERIFICATION',
  'DONE',
  'CANCELLED',
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const PLAN_STATUSES = [
  'PROPOSED',
  'APPROVED',
  'REJECTED',
  'STALE',
  'EXECUTED',
  'EXPIRED',
  'WITHDRAWN',
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'STALE'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_SUBJECTS = ['RECOVERY_PLAN', 'PURCHASE_REQUEST', 'EVIDENCE'] as const;
export type ApprovalSubject = (typeof APPROVAL_SUBJECTS)[number];

export const REPORT_SOURCES = ['QR', 'WEB', 'WHATSAPP', 'EMAIL', 'WEBHOOK', 'ADMIN'] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];

export const NOTIFICATION_CHANNELS = ['WHATSAPP', 'EMAIL', 'IN_APP'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = [
  'QUEUED',
  'SENDING',
  'SENT',
  'FAILED',
  'SIMULATED',
  'DEAD',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const EVIDENCE_KINDS = ['BEFORE', 'AFTER', 'OTHER'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const PURCHASE_STATUSES = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'ORDERED',
  'RECEIVED',
  'CANCELLED',
] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const ASSET_STATUSES = ['OPERATIONAL', 'FAILED', 'MAINTENANCE'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const PLAN_ACTION_KINDS = [
  'RELOCATE_ACTIVITY',
  'SPLIT_ACTIVITY',
  'REASSIGN_STAFF',
  'RESERVE_PART',
  'RESERVE_EQUIPMENT',
  'SERVICE_WORKAROUND',
  'PROCURE_PART',
] as const;
export type PlanActionKind = (typeof PLAN_ACTION_KINDS)[number];

export const CHECK_IDS = [
  'ROOM_SAFE_AVAILABLE',
  'CAPACITY_AND_CAPABILITIES',
  'NO_BOOKING_OVERLAP',
  'DEADLINE_MET',
  'STAFF_SKILL_SHIFT_WORKLOAD',
  'STAFF_RATIO',
  'STOCK_SUFFICIENT',
  'APPROVAL_AND_SOD',
  'PLAN_VERSION_IDEMPOTENT',
] as const;
export type CheckId = (typeof CHECK_IDS)[number];

/** Category -> owning department code. Deterministic routing, not AI. */
export const CATEGORY_DEPARTMENT: Record<IncidentCategory, string> = {
  ELECTRICAL: 'ELEC',
  NETWORK: 'IT',
  PLUMBING: 'CIVIL',
  HVAC: 'ELEC',
  CIVIL: 'CIVIL',
  HOUSEKEEPING: 'HOUSE',
  AV: 'AV',
  SAFETY: 'FAC',
  OTHER: 'FAC',
};

/** Category -> skill a technician must hold. Deterministic. */
export const CATEGORY_SKILL: Record<IncidentCategory, string> = {
  ELECTRICAL: 'ELECTRICAL',
  NETWORK: 'NETWORK',
  PLUMBING: 'PLUMBING',
  HVAC: 'ELECTRICAL',
  CIVIL: 'CIVIL',
  HOUSEKEEPING: 'HOUSEKEEPING',
  AV: 'AV',
  SAFETY: 'ELECTRICAL',
  OTHER: 'GENERAL',
};

/** Response SLA in minutes by severity. Mirrors policy POL-SLA. */
export const SLA_MINUTES: Record<Severity, number> = {
  P1: 60,
  P2: 240,
  P3: 1440,
  P4: 4320,
};

export const SAFETY_KEYWORDS = [
  'spark',
  'sparks',
  'fire',
  'smoke',
  'shock',
  'electrocution',
  'gas leak',
  'collapse',
  'live wire',
  'burning',
] as const;
