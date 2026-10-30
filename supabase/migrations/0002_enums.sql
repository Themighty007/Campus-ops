-- ===========================================================================
-- 0002 — Enumerated types
--
-- These strings are the contract between Postgres and TypeScript.
-- lib/domain/enums.ts must stay byte-identical to this file.
-- ===========================================================================

-- Six backend roles. The four login *experiences* are a UI concern and are
-- mapped onto these roles in lib/governance/rbac.ts.
create type user_role as enum (
  'REQUESTER',
  'TECHNICIAN',
  'DEPARTMENT_MANAGER',
  'FACILITIES_ADMIN',
  'PROCUREMENT_APPROVER',
  'SYSTEM_ADMIN'
);

create type requester_kind as enum ('STUDENT', 'FACULTY');

create type severity as enum ('P1', 'P2', 'P3', 'P4');

create type incident_category as enum (
  'ELECTRICAL', 'NETWORK', 'PLUMBING', 'HVAC',
  'CIVIL', 'HOUSEKEEPING', 'AV', 'SAFETY', 'OTHER'
);

-- Repair / delivery lifecycle of the incident record itself.
create type incident_status as enum (
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
  'ESCALATED'
);

-- The *other* track: whether the affected activity was protected.
-- An incident can be BLOCKED while continuity_status is RESTORED.
create type continuity_status as enum ('NONE', 'AT_RISK', 'PLANNED', 'RESTORED', 'LOST');

create type activity_kind as enum ('LECTURE', 'EXAM', 'LAB', 'EVENT', 'SERVICE');

create type booking_status as enum ('ACTIVE', 'CANCELLED');

create type work_order_status as enum (
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'BLOCKED',
  'AWAITING_PARTS',
  'AWAITING_VERIFICATION',
  'DONE',
  'CANCELLED'
);

create type plan_status as enum (
  'PROPOSED',
  'APPROVED',
  'REJECTED',
  'STALE',
  'EXECUTED',
  'EXPIRED',
  'WITHDRAWN'
);

create type approval_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'STALE');

create type approval_subject as enum ('RECOVERY_PLAN', 'PURCHASE_REQUEST', 'EVIDENCE');

create type report_source as enum ('QR', 'WEB', 'WHATSAPP', 'EMAIL', 'WEBHOOK', 'ADMIN');

create type notification_channel as enum ('WHATSAPP', 'EMAIL', 'IN_APP');

create type notification_status as enum (
  'QUEUED', 'SENDING', 'SENT', 'FAILED', 'SIMULATED', 'DEAD'
);

create type evidence_kind as enum ('BEFORE', 'AFTER', 'OTHER');

create type purchase_status as enum (
  'REQUESTED', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED', 'CANCELLED'
);

create type asset_status as enum ('OPERATIONAL', 'FAILED', 'MAINTENANCE');
