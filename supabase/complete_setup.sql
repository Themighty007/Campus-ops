-- 0001 â€” Extensions
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
-- ===========================================================================
-- 0002 â€” Enumerated types
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
-- ===========================================================================
-- 0003 â€” Core: departments, people, rooms, parts, assets, skills, shifts, policy
-- ===========================================================================

create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  manager_id  uuid,                       -- FK added after profiles exists
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null unique,
  full_name       text not null,
  phone           text,
  role            user_role not null,
  requester_kind  requester_kind,
  department_id   uuid references public.departments (id),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table public.departments
  add constraint departments_manager_fk
  foreign key (manager_id) references public.profiles (id) on delete set null;

create index profiles_role_idx on public.profiles (role);
create index profiles_department_idx on public.profiles (department_id);

-- --------------------------------------------------------------------------
-- Rooms. `setup_lead_minutes` is the realistic "how long does it take to get
-- this room ready" number that lets the planner reject a perfect-looking room
-- because it cannot be prepared before the exam starts.
-- --------------------------------------------------------------------------
create table public.rooms (
  id                  uuid primary key default gen_random_uuid(),
  building            text not null,
  floor               int  not null default 0,
  code                text not null unique,
  name                text not null,
  kind                text not null default 'CLASSROOM',
  capacity            int  not null check (capacity >= 0),
  is_accessible       boolean not null default false,
  capabilities        text[] not null default '{}',
  setup_lead_minutes  int not null default 5 check (setup_lead_minutes >= 0),
  opens_at            time not null default '07:00',
  closes_at           time not null default '21:00',
  is_available        boolean not null default true,
  unavailable_reason  text,
  qr_token            text not null unique default encode(gen_random_bytes(9), 'hex'),
  version             int not null default 1,
  created_at          timestamptz not null default now()
);

create index rooms_capacity_idx on public.rooms (capacity);
create index rooms_qr_idx on public.rooms (qr_token);

-- --------------------------------------------------------------------------
-- Parts / spare equipment. `qty_available` is physical on-hand stock;
-- `qty_reserved` is the portion already promised. Free = available - reserved.
-- --------------------------------------------------------------------------
create table public.parts (
  id              uuid primary key default gen_random_uuid(),
  sku             text not null unique,
  name            text not null,
  unit            text not null default 'unit',
  qty_available   int not null default 0 check (qty_available >= 0),
  qty_reserved    int not null default 0 check (qty_reserved >= 0),
  unit_cost       numeric(12, 2) not null default 0 check (unit_cost >= 0),
  store_location  text,
  reorder_level   int not null default 0,
  is_equipment    boolean not null default false,
  version         int not null default 1,
  constraint parts_reserved_within_stock check (qty_reserved <= qty_available)
);

-- --------------------------------------------------------------------------
-- Assets form a tree via parent_asset_id (panel -> circuit -> room equipment).
-- No graph database required: recursive CTEs are enough.
-- --------------------------------------------------------------------------
create table public.assets (
  id                uuid primary key default gen_random_uuid(),
  parent_asset_id   uuid references public.assets (id) on delete set null,
  room_id           uuid references public.rooms (id) on delete set null,
  code              text not null unique,
  name              text not null,
  kind              text not null,
  criticality       int not null default 2 check (criticality between 1 and 5),
  status            asset_status not null default 'OPERATIONAL',
  required_part_id  uuid references public.parts (id) on delete set null,
  version           int not null default 1,
  created_at        timestamptz not null default now()
);

create index assets_room_idx on public.assets (room_id);
create index assets_parent_idx on public.assets (parent_asset_id);

create table public.staff_skills (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  skill       text not null,
  level       int not null default 1 check (level between 1 and 5),
  primary key (profile_id, skill)
);

create table public.staff_shifts (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  kind        text not null default 'REGULAR',
  constraint staff_shifts_ordered check (ends_at > starts_at)
);

create index staff_shifts_window_idx on public.staff_shifts (profile_id, starts_at, ends_at);

-- --------------------------------------------------------------------------
-- Policies are *data*, not code. Auto-triage and approval thresholds live here
-- so the backend can cite the exact rule that allowed or blocked an action.
-- --------------------------------------------------------------------------
create table public.policies (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  kind        text not null,            -- AUTO_TRIAGE | SLA | APPROVAL_THRESHOLD
  conditions  jsonb not null default '{}'::jsonb,
  actions     jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
-- ===========================================================================
-- 0004 â€” Scheduling: activities, cohorts, staff, bookings
--
-- Privacy decision: participants are stored as cohorts (label + headcount),
-- never as individual student locations. That is enough to size a room and
-- notify a cohort, and it keeps the product out of surveillance territory.
-- ===========================================================================

create table public.scheduled_activities (
  id                    uuid primary key default gen_random_uuid(),
  kind                  activity_kind not null,
  title                 text not null,
  course_code           text,
  room_id               uuid not null references public.rooms (id),
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  headcount             int not null check (headcount >= 0),
  required_capabilities text[] not null default '{}',
  min_staff             int not null default 1 check (min_staff >= 0),
  required_skill        text,
  parent_activity_id    uuid references public.scheduled_activities (id) on delete set null,
  status                text not null default 'SCHEDULED',  -- SCHEDULED | MOVED | CANCELLED | LOST
  version               int not null default 1,
  created_at            timestamptz not null default now(),
  constraint scheduled_activities_ordered check (ends_at > starts_at)
);

create index scheduled_activities_room_window_idx
  on public.scheduled_activities (room_id, starts_at, ends_at);

create table public.activity_participants (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references public.scheduled_activities (id) on delete cascade,
  cohort_label  text not null,
  headcount     int not null check (headcount > 0)
);

create table public.activity_staff (
  activity_id  uuid not null references public.scheduled_activities (id) on delete cascade,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  role         text not null default 'INVIGILATOR',  -- INSTRUCTOR | INVIGILATOR | SUPPORT
  primary key (activity_id, profile_id)
);

-- --------------------------------------------------------------------------
-- Bookings. Double-booking is prevented by the storage layer, not by an `if`.
-- --------------------------------------------------------------------------
create table public.room_bookings (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms (id) on delete cascade,
  activity_id  uuid references public.scheduled_activities (id) on delete cascade,
  title        text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       booking_status not null default 'ACTIVE',
  version      int not null default 1,
  created_at   timestamptz not null default now(),
  constraint room_bookings_ordered check (ends_at > starts_at)
);

alter table public.room_bookings
  add constraint room_bookings_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'ACTIVE');

create index room_bookings_window_idx on public.room_bookings (starts_at, ends_at);
-- ===========================================================================
-- 0005 â€” Intake: external events, incidents, reports
-- ===========================================================================

create sequence if not exists incident_code_seq start 1000;

-- Every external payload is stored *before* it is processed, keyed by its
-- provider id. This is what makes duplicate webhook delivery a no-op.
create table public.external_events (
  id                 uuid primary key default gen_random_uuid(),
  source             text not null,                 -- twilio | bms | network | email
  external_event_id  text not null,
  payload            jsonb not null,
  received_at        timestamptz not null default now(),
  processed_at       timestamptz,
  result             jsonb,
  constraint external_events_unique unique (source, external_event_id)
);

create table public.incidents (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique
                          default ('INC-' || lpad(nextval('incident_code_seq')::text, 5, '0')),
  category              incident_category not null,
  subtype               text,
  severity              severity not null default 'P3',
  status                incident_status not null default 'REPORTED',
  continuity_status     continuity_status not null default 'NONE',
  room_id               uuid references public.rooms (id) on delete set null,
  asset_id              uuid references public.assets (id) on delete set null,
  department_id         uuid references public.departments (id) on delete set null,
  reporter_id           uuid references public.profiles (id) on delete set null,
  summary               text not null,
  is_safety             boolean not null default false,
  sla_due_at            timestamptz,
  activity_deadline_at  timestamptz,
  triage_policy         text,                       -- e.g. 'POL-04' or 'MANUAL'
  triaged_by            uuid references public.profiles (id) on delete set null,
  triaged_at            timestamptz,
  merged_into           uuid references public.incidents (id) on delete set null,
  resolved_at           timestamptz,
  closed_at             timestamptz,
  version               int not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index incidents_status_idx on public.incidents (status);
create index incidents_room_idx on public.incidents (room_id);
create index incidents_created_idx on public.incidents (created_at desc);

create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  incident_id         uuid references public.incidents (id) on delete set null,
  source              report_source not null,
  raw_text            text not null,
  reporter_id         uuid references public.profiles (id) on delete set null,
  reporter_label      text,
  room_hint           text,
  asset_hint          text,
  extraction          jsonb,
  extraction_source   text not null default 'NONE',  -- AI | FALLBACK | NONE
  confidence          numeric(4, 3),
  match_kind          text,                          -- PRIMARY | DUPLICATE | RELATED
  match_score         numeric(4, 3),
  external_event_id   uuid references public.external_events (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index reports_incident_idx on public.reports (incident_id);
create index reports_created_idx on public.reports (created_at desc);
-- ===========================================================================
-- 0006 â€” Recovery: plans, approvals, work orders
-- ===========================================================================

create sequence if not exists work_order_code_seq start 5000;

create table public.recovery_plans (
  id                uuid primary key default gen_random_uuid(),
  incident_id       uuid not null references public.incidents (id) on delete cascade,
  version           int not null default 1,
  label             text not null,                          -- 'Plan A' | 'Plan B' ...
  status            plan_status not null default 'PROPOSED',
  actions           jsonb not null default '[]'::jsonb,     -- RecoveryAction[]
  checks            jsonb not null default '[]'::jsonb,     -- ConstraintCheck[]
  score             numeric(6, 2) not null default 0,
  factors           jsonb not null default '{}'::jsonb,
  resource_snapshot jsonb not null default '{}'::jsonb,     -- row versions used for revalidation
  required_roles    user_role[] not null default '{}',
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz,
  executed_at       timestamptz,
  rejection_reason  text
);

create index recovery_plans_incident_idx on public.recovery_plans (incident_id, status);

create table public.approvals (
  id             uuid primary key default gen_random_uuid(),
  subject_type   approval_subject not null,
  subject_id     uuid not null,
  plan_id        uuid references public.recovery_plans (id) on delete cascade,
  required_role  user_role not null,
  requested_by   uuid references public.profiles (id) on delete set null,
  decided_by     uuid references public.profiles (id) on delete set null,
  status         approval_status not null default 'PENDING',
  reason         text,
  plan_version   int,
  snapshot       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  decided_at     timestamptz
);

create index approvals_pending_idx on public.approvals (status, required_role);

create table public.work_orders (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique
                    default ('WO-' || lpad(nextval('work_order_code_seq')::text, 5, '0')),
  incident_id     uuid not null references public.incidents (id) on delete cascade,
  department_id   uuid not null references public.departments (id),
  assignee_id     uuid references public.profiles (id) on delete set null,
  status          work_order_status not null default 'CREATED',
  blocked_reason  text,
  required_skill  text,
  notes           text,
  version         int not null default 1,
  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  completed_at    timestamptz
);

create index work_orders_assignee_idx on public.work_orders (assignee_id, status);
create index work_orders_department_idx on public.work_orders (department_id, status);
-- ===========================================================================
-- 0007 â€” Inventory: reservations and procurement
-- ===========================================================================

create sequence if not exists purchase_code_seq start 9000;

create table public.part_reservations (
  id             uuid primary key default gen_random_uuid(),
  part_id        uuid not null references public.parts (id) on delete cascade,
  work_order_id  uuid references public.work_orders (id) on delete cascade,
  qty            int not null check (qty > 0),
  status         text not null default 'ACTIVE',   -- ACTIVE | RELEASED | CONSUMED
  created_at     timestamptz not null default now(),
  released_at    timestamptz
);

-- One active reservation per (work order, part). Repeated "reserve" calls are
-- therefore idempotent rather than doubling the held quantity.
create unique index part_reservations_active_uq
  on public.part_reservations (work_order_id, part_id)
  where status = 'ACTIVE' and work_order_id is not null;

create index part_reservations_part_idx on public.part_reservations (part_id, status);

create table public.purchase_requests (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique
                  default ('PR-' || lpad(nextval('purchase_code_seq')::text, 5, '0')),
  incident_id   uuid references public.incidents (id) on delete set null,
  work_order_id uuid references public.work_orders (id) on delete set null,
  part_id       uuid references public.parts (id) on delete set null,
  qty           int not null check (qty > 0),
  amount        numeric(12, 2) not null check (amount >= 0),
  status        purchase_status not null default 'REQUESTED',
  requested_by  uuid references public.profiles (id) on delete set null,
  approved_by   uuid references public.profiles (id) on delete set null,
  reason        text,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);

create index purchase_requests_status_idx on public.purchase_requests (status);
-- ===========================================================================
-- 0008 â€” Evidence, notifications, audit, AI cache
-- ===========================================================================

create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  incident_id   uuid not null references public.incidents (id) on delete cascade,
  work_order_id uuid references public.work_orders (id) on delete set null,
  kind          evidence_kind not null,
  storage_path  text not null,
  mime_type     text not null,
  byte_size     int not null check (byte_size > 0),
  sha256        text not null,
  uploaded_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  verified_by   uuid references public.profiles (id) on delete set null,
  verified_at   timestamptz,
  is_accepted   boolean
);

-- A given binary may only appear once per incident per slot. Uploading the
-- same photo as both BEFORE and AFTER is rejected here, not in the UI.
create unique index attachments_unique_binary
  on public.attachments (incident_id, sha256, kind);

create index attachments_incident_idx on public.attachments (incident_id);

-- --------------------------------------------------------------------------
-- notifications doubles as the transactional outbox.
-- `dedupe_key` makes repeated cron runs and replayed webhooks harmless.
-- --------------------------------------------------------------------------
create table public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  incident_id        uuid references public.incidents (id) on delete cascade,
  recipient_id       uuid references public.profiles (id) on delete set null,
  recipient_address  text,
  channel            notification_channel not null,
  template           text not null,
  payload            jsonb not null default '{}'::jsonb,
  status             notification_status not null default 'QUEUED',
  provider_id        text,
  dedupe_key         text unique,
  attempts           int not null default 0,
  last_error         text,
  created_at         timestamptz not null default now(),
  sent_at            timestamptz
);

create index notifications_pending_idx on public.notifications (status, created_at);
create index notifications_incident_idx on public.notifications (incident_id);

-- --------------------------------------------------------------------------
-- Append-only audit. Application roles can read (scoped) but never write
-- directly; every row is written by a SECURITY DEFINER function.
-- --------------------------------------------------------------------------
create table public.audit_events (
  id          bigserial primary key,
  incident_id uuid references public.incidents (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_kind  text not null default 'USER',   -- USER | SYSTEM | AI
  action      text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index audit_events_incident_idx on public.audit_events (incident_id, created_at);
create index audit_events_action_idx on public.audit_events (action);

-- --------------------------------------------------------------------------
-- AI response cache. Guarantees the demo behaves identically every run and
-- removes provider latency from the critical path.
-- --------------------------------------------------------------------------
create table public.ai_cache (
  key        text primary key,
  model      text not null,
  kind       text not null,           -- EXTRACT | RELATE | NARRATE
  value      jsonb not null,
  created_at timestamptz not null default now()
);
-- ===========================================================================
-- 0009 â€” Domain functions
--
-- Everything in this file is SECURITY DEFINER and is the ONLY way operational
-- state may change. The application layer cannot approve, reserve, transition
-- or execute by writing to tables directly.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.auth_role()
returns user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.log_audit(
  p_incident_id uuid,
  p_actor_id    uuid,
  p_actor_kind  text,
  p_action      text,
  p_payload     jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.audit_events (incident_id, actor_id, actor_kind, action, payload)
  values (p_incident_id, p_actor_id, p_actor_kind, p_action, coalesce(p_payload, '{}'::jsonb));
$$;

create or replace function public.touch_incident()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists incidents_touch on public.incidents;
create trigger incidents_touch
  before update on public.incidents
  for each row execute function public.touch_incident();

-- ---------------------------------------------------------------------------
-- State machine
-- ---------------------------------------------------------------------------
create or replace function public.transition_incident(
  p_incident_id uuid,
  p_to          incident_status,
  p_actor       uuid,
  p_reason      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inc     record;
  v_allowed boolean;
begin
  -- SECURITY FIX: enforce caller identity at the database boundary
  if auth.uid() is not null and auth.uid() <> p_actor then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_MISMATCH');
  end if;

  select * into v_inc from public.incidents where id = p_incident_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INCIDENT_NOT_FOUND');
  end if;

  select exists (
    select 1
    from (values
      ('REPORTED',            'NEEDS_INFO'),
      ('REPORTED',            'TRIAGED'),
      ('REPORTED',            'REJECTED'),
      ('REPORTED',            'MERGED'),
      ('NEEDS_INFO',          'TRIAGED'),
      ('NEEDS_INFO',          'REJECTED'),
      ('TRIAGED',             'ASSIGNED'),
      ('TRIAGED',             'REJECTED'),
      ('TRIAGED',             'ESCALATED'),
      ('ASSIGNED',            'IN_PROGRESS'),
      ('ASSIGNED',            'ESCALATED'),
      ('IN_PROGRESS',         'BLOCKED'),
      ('IN_PROGRESS',         'AWAITING_EVIDENCE'),
      ('IN_PROGRESS',         'ESCALATED'),
      ('BLOCKED',             'IN_PROGRESS'),
      ('BLOCKED',             'AWAITING_EVIDENCE'),
      ('BLOCKED',             'ESCALATED'),
      ('AWAITING_EVIDENCE',   'AWAITING_VERIFICATION'),
      ('AWAITING_VERIFICATION','RESOLVED'),
      ('AWAITING_VERIFICATION','IN_PROGRESS'),
      ('RESOLVED',            'CLOSED'),
      ('ESCALATED',           'IN_PROGRESS'),
      ('ESCALATED',           'AWAITING_EVIDENCE'),
      ('ESCALATED',           'RESOLVED')
    ) as t(from_state, to_state)
    where t.from_state = v_inc.status::text and t.to_state = p_to::text
  ) into v_allowed;

  if not v_allowed then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_TRANSITION',
      'from', v_inc.status,
      'to', p_to
    );
  end if;

  update public.incidents
     set status = p_to, version = version + 1
   where id = p_incident_id;

  perform public.log_audit(
    p_incident_id, p_actor, 'USER', 'STATUS_CHANGED',
    jsonb_build_object('from', v_inc.status, 'to', p_to, 'reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'status', p_to);
end;
$$;

-- ---------------------------------------------------------------------------
-- Inventory: atomic, idempotent reservation
-- ---------------------------------------------------------------------------
create or replace function public.reserve_parts(
  p_work_order_id uuid,
  p_items         jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_part record;
  v_qty  int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ITEMS');
  end if;

  -- Pass 1: validate every line before touching anything.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item ->> 'qty')::int, 0);
    if v_qty <= 0 then
      return jsonb_build_object('ok', false, 'code', 'INVALID_QTY');
    end if;

    -- Already reserved by this work order? Then this is a no-op, not a
    -- second reservation. Makes retries safe.
    if p_work_order_id is not null and exists (
      select 1 from public.part_reservations
       where work_order_id = p_work_order_id
         and part_id = (v_item ->> 'partId')::uuid
         and status = 'ACTIVE'
    ) then
      continue;
    end if;

    select * into v_part
      from public.parts
     where id = (v_item ->> 'partId')::uuid
       for update;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'PART_NOT_FOUND',
                                'partId', v_item ->> 'partId');
    end if;

    if (v_part.qty_available - v_part.qty_reserved) < v_qty then
      return jsonb_build_object(
        'ok', false,
        'code', 'INSUFFICIENT_STOCK',
        'partId', v_part.id,
        'sku', v_part.sku,
        'free', v_part.qty_available - v_part.qty_reserved,
        'requested', v_qty
      );
    end if;
  end loop;

  -- Pass 2: apply.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'qty')::int;

    if p_work_order_id is not null and exists (
      select 1 from public.part_reservations
       where work_order_id = p_work_order_id
         and part_id = (v_item ->> 'partId')::uuid
         and status = 'ACTIVE'
    ) then
      continue;
    end if;

    update public.parts
       set qty_reserved = qty_reserved + v_qty,
           version = version + 1
     where id = (v_item ->> 'partId')::uuid;

    insert into public.part_reservations (part_id, work_order_id, qty)
    values ((v_item ->> 'partId')::uuid, p_work_order_id, v_qty);
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.release_parts(p_work_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row record;
begin
  for v_row in
    select * from public.part_reservations
     where work_order_id = p_work_order_id and status = 'ACTIVE'
       for update
  loop
    update public.parts
       set qty_reserved = greatest(0, qty_reserved - v_row.qty),
           version = version + 1
     where id = v_row.part_id;

    update public.part_reservations
       set status = 'RELEASED', released_at = now()
     where id = v_row.id;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Plan revalidation â€” the guard that makes "stale" impossible to ignore.
-- Returns NULL when the plan is still executable, otherwise a human reason.
-- ---------------------------------------------------------------------------
create or replace function public.revalidate_plan(p_plan_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan   record;
  v_action jsonb;
  v_act    record;
  v_room   record;
  v_part   record;
  v_part2  jsonb;
  v_qty    int;
begin
  select * into v_plan from public.recovery_plans where id = p_plan_id;
  if not found then
    return 'Plan no longer exists';
  end if;

  for v_action in select * from jsonb_array_elements(v_plan.actions)
  loop
    case v_action ->> 'kind'

      when 'RELOCATE_ACTIVITY' then
        select * into v_act from public.scheduled_activities
         where id = (v_action ->> 'activityId')::uuid;
        if not found then return 'Activity no longer exists'; end if;

        select * into v_room from public.rooms
         where id = (v_action ->> 'toRoomId')::uuid;
        if not found then return 'Target room no longer exists'; end if;
        if not v_room.is_available then return 'Target room is now unavailable'; end if;
        if v_room.capacity < v_act.headcount then return 'Target room capacity is now insufficient'; end if;
        if v_act.starts_at <= now() then return 'Activity has already started'; end if;
        if not (v_act.required_capabilities <@ v_room.capabilities) then
          return 'Target room no longer has the required capability';
        end if;
        if now() + make_interval(mins => v_room.setup_lead_minutes) > v_act.starts_at then
          return 'Room cannot be prepared before the activity starts';
        end if;
        if exists (
          select 1 from public.room_bookings b
           where b.room_id = v_room.id
             and b.status = 'ACTIVE'
             and b.activity_id is distinct from v_act.id
             and tstzrange(b.starts_at, b.ends_at, '[)')
                 && tstzrange(v_act.starts_at, v_act.ends_at, '[)')
        ) then
          return 'Target room is now double-booked';
        end if;

      when 'SPLIT_ACTIVITY' then
        select * into v_act from public.scheduled_activities
         where id = (v_action ->> 'activityId')::uuid;
        if not found then return 'Activity no longer exists'; end if;
        if v_act.starts_at <= now() then return 'Activity has already started'; end if;

        for v_part2 in select * from jsonb_array_elements(v_action -> 'parts')
        loop
          select * into v_room from public.rooms
           where id = (v_part2 ->> 'roomId')::uuid;
          if not found then return 'Split room no longer exists'; end if;
          if not v_room.is_available then return 'Split room is now unavailable'; end if;
          if v_room.capacity < (v_part2 ->> 'headcount')::int then
            return 'Split room capacity is now insufficient';
          end if;
          if now() + make_interval(mins => v_room.setup_lead_minutes) > v_act.starts_at then
            return 'Split room cannot be prepared before the activity starts';
          end if;
          if exists (
            select 1 from public.room_bookings b
             where b.room_id = v_room.id
               and b.status = 'ACTIVE'
               and b.activity_id is distinct from v_act.id
               and tstzrange(b.starts_at, b.ends_at, '[)')
                   && tstzrange(v_act.starts_at, v_act.ends_at, '[)')
          ) then
            return 'Split room is now double-booked';
          end if;
        end loop;

      when 'REASSIGN_STAFF' then
        if (v_action ->> 'staffId') is null then
          return 'Staff assignment is malformed';
        end if;
        if not exists (
          select 1 from public.staff_shifts s
           where s.profile_id = (v_action ->> 'staffId')::uuid
             and s.starts_at <= now()
             and s.ends_at   >= now()
        ) then
          return 'Assigned staff member is no longer on shift';
        end if;

      when 'RESERVE_PART', 'RESERVE_EQUIPMENT' then
        v_qty := coalesce((v_action ->> 'qty')::int, 0);
        select * into v_part from public.parts
         where id = (v_action ->> 'partId')::uuid;
        if not found then return 'Part no longer exists'; end if;
        if (v_part.qty_available - v_part.qty_reserved) < v_qty then
          return 'Part stock is no longer sufficient';
        end if;

      else
        -- PROCURE_PART, SERVICE_WORKAROUND: nothing to invalidate.
        null;
    end case;
  end loop;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Plan action executor
-- ---------------------------------------------------------------------------
create or replace function public.apply_plan_action(
  p_incident_id uuid,
  p_action      jsonb,
  p_actor       uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_act    record;
  v_child  record;
  v_part2  jsonb;
  v_qty    int;
  v_amount numeric;
  v_pr_id  uuid;
  v_wo     uuid;
begin
  case p_action ->> 'kind'

    when 'RELOCATE_ACTIVITY' then
      select * into v_act from public.scheduled_activities
       where id = (p_action ->> 'activityId')::uuid for update;
      if not found then raise exception 'ACTIVITY_NOT_FOUND'; end if;

      update public.room_bookings
         set room_id = (p_action ->> 'toRoomId')::uuid,
             version = version + 1
       where activity_id = v_act.id and status = 'ACTIVE';

      if not found then
        insert into public.room_bookings (room_id, activity_id, title, starts_at, ends_at)
        values ((p_action ->> 'toRoomId')::uuid, v_act.id, v_act.title, v_act.starts_at, v_act.ends_at);
      end if;

      update public.scheduled_activities
         set room_id = (p_action ->> 'toRoomId')::uuid,
             status = 'MOVED',
             version = version + 1
       where id = v_act.id;

      perform public.log_audit(
        p_incident_id, p_actor, 'USER', 'ACTIVITY_RELOCATED',
        jsonb_build_object(
          'activity_id', v_act.id,
          'from_room', v_act.room_id,
          'to_room', p_action ->> 'toRoomId'
        )
      );

    when 'SPLIT_ACTIVITY' then
      select * into v_act from public.scheduled_activities
       where id = (p_action ->> 'activityId')::uuid for update;
      if not found then raise exception 'ACTIVITY_NOT_FOUND'; end if;

      update public.room_bookings
         set status = 'CANCELLED', version = version + 1
       where activity_id = v_act.id and status = 'ACTIVE';

      for v_part2 in select * from jsonb_array_elements(p_action -> 'parts')
      loop
        insert into public.scheduled_activities (
          kind, title, course_code, room_id, starts_at, ends_at, headcount,
          required_capabilities, min_staff, required_skill, parent_activity_id, status
        )
        values (
          v_act.kind,
          v_act.title || ' (split)',
          v_act.course_code,
          (v_part2 ->> 'roomId')::uuid,
          v_act.starts_at,
          v_act.ends_at,
          (v_part2 ->> 'headcount')::int,
          v_act.required_capabilities,
          1,
          v_act.required_skill,
          v_act.id,
          'SCHEDULED'
        )
        returning * into v_child;

        insert into public.room_bookings (room_id, activity_id, title, starts_at, ends_at)
        values (v_child.room_id, v_child.id, v_child.title, v_child.starts_at, v_child.ends_at);
      end loop;

      update public.scheduled_activities
         set status = 'MOVED', version = version + 1
       where id = v_act.id;

      perform public.log_audit(
        p_incident_id, p_actor, 'USER', 'ACTIVITY_SPLIT',
        jsonb_build_object('activity_id', v_act.id, 'parts', p_action -> 'parts')
      );

    when 'REASSIGN_STAFF' then
      if (p_action ->> 'workOrderId') is not null then
        update public.work_orders
           set assignee_id = (p_action ->> 'staffId')::uuid,
               status = case when status = 'CREATED' then 'ASSIGNED'::work_order_status else status end,
               version = version + 1
         where id = (p_action ->> 'workOrderId')::uuid;

        perform public.log_audit(
          p_incident_id, p_actor, 'USER', 'WORK_ORDER_REASSIGNED',
          jsonb_build_object('work_order_id', p_action ->> 'workOrderId',
                             'staff_id', p_action ->> 'staffId')
        );
      end if;

      if (p_action ->> 'activityId') is not null then
        if (p_action ->> 'replaceStaffId') is not null then
          delete from public.activity_staff
           where activity_id = (p_action ->> 'activityId')::uuid
             and profile_id  = (p_action ->> 'replaceStaffId')::uuid;
        end if;

        insert into public.activity_staff (activity_id, profile_id, role)
        values (
          (p_action ->> 'activityId')::uuid,
          (p_action ->> 'staffId')::uuid,
          coalesce(p_action ->> 'role', 'INVIGILATOR')
        )
        on conflict (activity_id, profile_id) do nothing;

        perform public.log_audit(
          p_incident_id, p_actor, 'USER', 'ACTIVITY_STAFF_ASSIGNED',
          jsonb_build_object('activity_id', p_action ->> 'activityId',
                             'staff_id', p_action ->> 'staffId',
                             'replaced', p_action ->> 'replaceStaffId')
        );
      end if;

    when 'RESERVE_PART' then
      v_wo := nullif(p_action ->> 'workOrderId', '')::uuid;
      v_qty := coalesce((p_action ->> 'qty')::int, 0);

      if v_wo is not null then
        declare
          v_res jsonb;
        begin
          v_res := public.reserve_parts(
            v_wo,
            jsonb_build_array(jsonb_build_object('partId', p_action ->> 'partId', 'qty', v_qty))
          );
          if not (v_res ->> 'ok')::boolean then
            raise exception 'RESERVATION_FAILED: %', v_res::text;
          end if;
        end;
      end if;

      perform public.log_audit(
        p_incident_id, p_actor, 'USER', 'PART_RESERVED',
        jsonb_build_object('part_id', p_action ->> 'partId', 'qty', v_qty)
      );

    when 'RESERVE_EQUIPMENT' then
      v_qty := coalesce((p_action ->> 'qty')::int, 0);

      update public.parts
         set qty_reserved = qty_reserved + v_qty,
             version = version + 1
       where id = (p_action ->> 'partId')::uuid
         and (qty_available - qty_reserved) >= v_qty;

      if not found then
        raise exception 'INSUFFICIENT_EQUIPMENT';
      end if;

      insert into public.part_reservations (part_id, work_order_id, qty)
      values ((p_action ->> 'partId')::uuid, null, v_qty);

      perform public.log_audit(
        p_incident_id, p_actor, 'USER', 'EQUIPMENT_RESERVED',
        jsonb_build_object('part_id', p_action ->> 'partId', 'qty', v_qty)
      );

    when 'PROCURE_PART' then
      v_qty    := coalesce((p_action ->> 'qty')::int, 1);
      v_amount := coalesce((p_action ->> 'amount')::numeric, 0);
      v_wo     := nullif(p_action ->> 'workOrderId', '')::uuid;

      insert into public.purchase_requests (
        incident_id, work_order_id, part_id, qty, amount, requested_by, reason
      )
      values (
        p_incident_id, v_wo, (p_action ->> 'partId')::uuid, v_qty, v_amount, p_actor,
        'Raised automatically by an approved recovery plan'
      )
      returning id into v_pr_id;

      insert into public.approvals (
        subject_type, subject_id, required_role, requested_by, status, reason
      )
      values (
        'PURCHASE_REQUEST', v_pr_id, 'PROCUREMENT_APPROVER', p_actor, 'PENDING',
        'Purchase above threshold requires independent approval'
      );

      perform public.log_audit(
        p_incident_id, p_actor, 'USER', 'PURCHASE_REQUESTED',
        jsonb_build_object('purchase_request_id', v_pr_id, 'amount', v_amount)
      );

    when 'SERVICE_WORKAROUND' then
      perform public.log_audit(
        p_incident_id, p_actor, 'USER', 'SERVICE_WORKAROUND_APPLIED',
        jsonb_build_object('note', p_action ->> 'note')
      );

    else
      raise exception 'UNKNOWN_PLAN_ACTION: %', p_action ->> 'kind';
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- Approval + atomic execution
-- ---------------------------------------------------------------------------
create or replace function public.approve_plan(
  p_plan_id  uuid,
  p_actor    uuid,
  p_decision approval_status,
  p_reason   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan       record;
  v_incident   record;
  v_actor      record;
  v_action     jsonb;
  v_now        timestamptz := now();
  v_reason     text;
  v_continuity boolean := false;
begin
  select * into v_plan from public.recovery_plans where id = p_plan_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PLAN_NOT_FOUND');
  end if;

  select * into v_incident from public.incidents where id = v_plan.incident_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INCIDENT_NOT_FOUND');
  end if;

  select * into v_actor from public.profiles where id = p_actor;
  if not found or not v_actor.is_active then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_INVALID');
  end if;

  -- If the caller is a real end-user session, the actor must be that user.
  if auth.uid() is not null and auth.uid() <> p_actor then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_MISMATCH');
  end if;

  if v_plan.status <> 'PROPOSED' then
    return jsonb_build_object('ok', false, 'code', 'PLAN_NOT_PROPOSED', 'status', v_plan.status);
  end if;

  if v_plan.expires_at is not null and v_plan.expires_at < v_now then
    update public.recovery_plans set status = 'EXPIRED' where id = p_plan_id;
    return jsonb_build_object('ok', false, 'code', 'PLAN_EXPIRED');
  end if;

  -- ---------------------------------------------------------------- reject
  if p_decision = 'REJECTED' then
    update public.recovery_plans
       set status = 'REJECTED', rejection_reason = coalesce(p_reason, 'Rejected')
     where id = p_plan_id;

    update public.approvals
       set status = 'REJECTED', decided_by = p_actor, decided_at = v_now,
           reason = coalesce(p_reason, 'Rejected')
     where plan_id = p_plan_id and status = 'PENDING';

    perform public.log_audit(
      v_incident.id, p_actor, 'USER', 'PLAN_REJECTED',
      jsonb_build_object('plan_id', p_plan_id, 'reason', p_reason)
    );

    return jsonb_build_object('ok', true, 'status', 'REJECTED');
  end if;

  -- ------------------------------------------------------------ governance
  if not (v_actor.role = any (v_plan.required_roles)) then
    perform public.log_audit(
      v_incident.id, p_actor, 'USER', 'APPROVAL_DENIED_ROLE',
      jsonb_build_object('plan_id', p_plan_id, 'actor_role', v_actor.role,
                         'required', v_plan.required_roles)
    );
    return jsonb_build_object(
      'ok', false, 'code', 'ROLE_NOT_AUTHORIZED',
      'actor_role', v_actor.role, 'required', to_jsonb(v_plan.required_roles)
    );
  end if;

  if v_plan.created_by is not null and p_actor = v_plan.created_by then
    perform public.log_audit(v_incident.id, p_actor, 'USER', 'APPROVAL_DENIED_SOD',
      jsonb_build_object('plan_id', p_plan_id, 'rule', 'CREATOR_CANNOT_APPROVE'));
    return jsonb_build_object('ok', false, 'code', 'SOD_CREATOR');
  end if;

  if v_incident.reporter_id is not null and p_actor = v_incident.reporter_id then
    perform public.log_audit(v_incident.id, p_actor, 'USER', 'APPROVAL_DENIED_SOD',
      jsonb_build_object('plan_id', p_plan_id, 'rule', 'REPORTER_CANNOT_APPROVE'));
    return jsonb_build_object('ok', false, 'code', 'SOD_REPORTER');
  end if;

  if exists (
    select 1 from public.work_orders w
     where w.incident_id = v_incident.id and w.assignee_id = p_actor
  ) then
    perform public.log_audit(v_incident.id, p_actor, 'USER', 'APPROVAL_DENIED_SOD',
      jsonb_build_object('plan_id', p_plan_id, 'rule', 'ASSIGNEE_CANNOT_APPROVE'));
    return jsonb_build_object('ok', false, 'code', 'SOD_ASSIGNEE');
  end if;

  -- ------------------------------------------------------------ freshness
  v_reason := public.revalidate_plan(p_plan_id);
  if v_reason is not null then
    update public.recovery_plans
       set status = 'STALE', rejection_reason = v_reason
     where id = p_plan_id;

    update public.approvals
       set status = 'STALE', decided_by = p_actor, decided_at = v_now, reason = v_reason
     where plan_id = p_plan_id and status = 'PENDING';

    perform public.log_audit(
      v_incident.id, p_actor, 'USER', 'PLAN_STALE',
      jsonb_build_object('plan_id', p_plan_id, 'reason', v_reason)
    );

    return jsonb_build_object('ok', false, 'code', 'PLAN_STALE', 'reason', v_reason);
  end if;

  -- -------------------------------------------------------------- execute
  begin
    for v_action in select * from jsonb_array_elements(v_plan.actions)
    loop
      perform public.apply_plan_action(v_incident.id, v_action, p_actor);

      if (v_action ->> 'kind') in ('RELOCATE_ACTIVITY', 'SPLIT_ACTIVITY', 'SERVICE_WORKAROUND') then
        v_continuity := true;
      end if;
    end loop;
  exception
    when exclusion_violation then
      -- A concurrent booking slipped in between revalidation and execution.
      -- The subtransaction is rolled back; nothing was applied.
      update public.recovery_plans
         set status = 'STALE', rejection_reason = 'A conflicting booking appeared during execution'
       where id = p_plan_id;

      update public.approvals
         set status = 'STALE', decided_by = p_actor, decided_at = v_now,
             reason = 'A conflicting booking appeared during execution'
       where plan_id = p_plan_id and status = 'PENDING';

      perform public.log_audit(
        v_incident.id, p_actor, 'USER', 'PLAN_STALE',
        jsonb_build_object('plan_id', p_plan_id, 'reason', 'exclusion_violation')
      );

      return jsonb_build_object('ok', false, 'code', 'PLAN_STALE',
                                'reason', 'A conflicting booking appeared during execution');
    when others then
      update public.recovery_plans
         set status = 'STALE', rejection_reason = sqlerrm
       where id = p_plan_id;

      perform public.log_audit(
        v_incident.id, p_actor, 'USER', 'PLAN_EXECUTION_FAILED',
        jsonb_build_object('plan_id', p_plan_id, 'error', sqlerrm)
      );

      return jsonb_build_object('ok', false, 'code', 'EXECUTION_FAILED', 'reason', sqlerrm);
  end;

  update public.recovery_plans
     set status = 'EXECUTED', executed_at = v_now
   where id = p_plan_id;

  update public.recovery_plans
     set status = 'WITHDRAWN'
   where incident_id = v_incident.id and id <> p_plan_id and status = 'PROPOSED';

  update public.approvals
     set status = 'APPROVED', decided_by = p_actor, decided_at = v_now
   where plan_id = p_plan_id and status = 'PENDING';

  if v_continuity then
    update public.incidents
       set continuity_status = 'RESTORED', version = version + 1
     where id = v_incident.id;

    perform public.log_audit(
      v_incident.id, p_actor, 'USER', 'CONTINUITY_RESTORED',
      jsonb_build_object('plan_id', p_plan_id)
    );
  end if;

  perform public.log_audit(
    v_incident.id, p_actor, 'USER', 'PLAN_EXECUTED',
    jsonb_build_object('plan_id', p_plan_id, 'actions', jsonb_array_length(v_plan.actions))
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'EXECUTED',
    'continuity', case when v_continuity then 'RESTORED' else v_incident.continuity_status end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- SLA ladder: 50% reminder, 80% at-risk reminder, 100% breach + escalation.
-- Idempotent through notifications.dedupe_key and the audit log.
-- ---------------------------------------------------------------------------
create or replace function public.run_sla_sweep(p_as_of timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inc        record;
  v_manager    uuid;
  v_admin      uuid;
  v_pct        numeric;
  v_nudge1     int := 0;
  v_nudge2     int := 0;
  v_breach     int := 0;
begin
  for v_inc in
    select * from public.incidents
     where sla_due_at is not null
       and status in ('TRIAGED','ASSIGNED','IN_PROGRESS','BLOCKED',
                      'AWAITING_EVIDENCE','AWAITING_VERIFICATION','ESCALATED')
  loop
    v_pct := extract(epoch from (p_as_of - v_inc.created_at))
             / nullif(extract(epoch from (v_inc.sla_due_at - v_inc.created_at)), 0);

    select manager_id into v_manager
      from public.departments where id = v_inc.department_id;

    select id into v_admin
      from public.profiles
     where role = 'FACILITIES_ADMIN' and is_active
     order by created_at limit 1;

    if v_pct >= 1 then
      if not exists (
        select 1 from public.audit_events
         where incident_id = v_inc.id and action = 'SLA_BREACH'
      ) then
        perform public.log_audit(
          v_inc.id, null, 'SYSTEM', 'SLA_BREACH',
          jsonb_build_object('pct', round(v_pct, 3), 'as_of', p_as_of)
        );

        update public.incidents
           set status = 'ESCALATED', version = version + 1
         where id = v_inc.id and status not in ('RESOLVED','CLOSED','REJECTED','MERGED');

        insert into public.notifications
          (incident_id, recipient_id, channel, template, payload, dedupe_key)
        values
          (v_inc.id, v_admin, 'IN_APP', 'SLA_BREACH',
           jsonb_build_object('incident_code', v_inc.code, 'pct', round(v_pct, 3)),
           'sla:breach:' || v_inc.id::text)
        on conflict (dedupe_key) do nothing;

        insert into public.notifications
          (incident_id, recipient_id, channel, template, payload, dedupe_key)
        values
          (v_inc.id, v_manager, 'WHATSAPP', 'SLA_BREACH',
           jsonb_build_object('incident_code', v_inc.code, 'pct', round(v_pct, 3)),
           'sla:breach:wa:' || v_inc.id::text)
        on conflict (dedupe_key) do nothing;

        v_breach := v_breach + 1;
      end if;

    elsif v_pct >= 0.8 then
      if not exists (
        select 1 from public.audit_events
         where incident_id = v_inc.id and action = 'SLA_NUDGE_2'
      ) then
        perform public.log_audit(
          v_inc.id, null, 'SYSTEM', 'SLA_NUDGE_2',
          jsonb_build_object('pct', round(v_pct, 3), 'as_of', p_as_of)
        );

        update public.incidents
           set continuity_status = case
                 when continuity_status = 'NONE' then 'AT_RISK'::continuity_status
                 else continuity_status
               end,
               version = version + 1
         where id = v_inc.id;

        insert into public.notifications
          (incident_id, recipient_id, channel, template, payload, dedupe_key)
        values
          (v_inc.id, v_manager, 'WHATSAPP', 'SLA_NUDGE_2',
           jsonb_build_object('incident_code', v_inc.code, 'pct', round(v_pct, 3),
                              'ask', 'status, action taken, and ETA'),
           'sla:nudge2:' || v_inc.id::text)
        on conflict (dedupe_key) do nothing;

        v_nudge2 := v_nudge2 + 1;
      end if;

    elsif v_pct >= 0.5 then
      if not exists (
        select 1 from public.audit_events
         where incident_id = v_inc.id and action = 'SLA_NUDGE_1'
      ) then
        perform public.log_audit(
          v_inc.id, null, 'SYSTEM', 'SLA_NUDGE_1',
          jsonb_build_object('pct', round(v_pct, 3), 'as_of', p_as_of)
        );

        insert into public.notifications
          (incident_id, recipient_id, channel, template, payload, dedupe_key)
        values
          (v_inc.id, v_manager, 'WHATSAPP', 'SLA_NUDGE_1',
           jsonb_build_object('incident_code', v_inc.code, 'pct', round(v_pct, 3),
                              'ask', 'status, action taken, and ETA'),
           'sla:nudge1:' || v_inc.id::text)
        on conflict (dedupe_key) do nothing;

        v_nudge1 := v_nudge1 + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'as_of', p_as_of,
    'nudge_1', v_nudge1,
    'nudge_2', v_nudge2,
    'breaches', v_breach
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.transition_incident(uuid, incident_status, uuid, text) to authenticated;
grant execute on function public.approve_plan(uuid, uuid, approval_status, text) to authenticated;
grant execute on function public.revalidate_plan(uuid) to authenticated;
grant execute on function public.reserve_parts(uuid, jsonb) to authenticated;
grant execute on function public.release_parts(uuid) to authenticated;
grant execute on function public.run_sla_sweep(timestamptz) to authenticated, service_role;
-- ===========================================================================
-- 0010 â€” Analytics views
--
-- The UI must never compute a headline metric itself. Every number on the
-- dashboard comes from one of these views, so "the chart disagrees with the
-- database" cannot happen.
-- ===========================================================================

create or replace view public.v_open_incidents as
select
  i.id,
  i.code,
  i.category,
  i.severity,
  i.status,
  i.continuity_status,
  i.summary,
  i.room_id,
  r.code  as room_code,
  r.name  as room_name,
  i.department_id,
  d.name  as department_name,
  i.reporter_id,
  i.sla_due_at,
  i.activity_deadline_at,
  i.is_safety,
  i.created_at,
  i.updated_at
from public.incidents i
left join public.rooms r on r.id = i.room_id
left join public.departments d on d.id = i.department_id
where i.status not in ('CLOSED', 'REJECTED', 'MERGED');

-- ---------------------------------------------------------------------------
-- Time-to-Continuity: report received -> activity protected.
-- Only plans that actually restored continuity count. Repair time is separate.
-- ---------------------------------------------------------------------------
create or replace view public.v_ttc as
select
  i.id as incident_id,
  i.code,
  i.category,
  i.severity,
  i.created_at,
  min(a.created_at) filter (where a.action = 'CONTINUITY_RESTORED') as restored_at,
  round(
    extract(epoch from (
      min(a.created_at) filter (where a.action = 'CONTINUITY_RESTORED') - i.created_at
    )) / 60.0,
    2
  ) as ttc_minutes
from public.incidents i
left join public.audit_events a on a.incident_id = i.id
group by i.id;

create or replace view public.v_sla_compliance as
select
  date_trunc('week', i.created_at)::date as week,
  count(*)                                                             as total,
  count(*) filter (where i.resolved_at is not null)                    as resolved,
  count(*) filter (where i.resolved_at is not null
                     and i.sla_due_at is not null
                     and i.resolved_at <= i.sla_due_at)                as on_time,
  count(*) filter (where i.sla_due_at is not null
                     and i.resolved_at is null
                     and now() > i.sla_due_at)                         as overdue,
  round(
    100.0 * count(*) filter (where i.resolved_at is not null
                               and i.sla_due_at is not null
                               and i.resolved_at <= i.sla_due_at)
    / nullif(count(*) filter (where i.resolved_at is not null and i.sla_due_at is not null), 0),
    1
  ) as compliance_pct
from public.incidents i
group by 1
order by 1 desc;

create or replace view public.v_room_utilisation as
select
  r.id as room_id,
  r.code,
  r.name,
  r.building,
  r.capacity,
  coalesce(sum(
    extract(epoch from (least(b.ends_at, now() + interval '7 days')
                        - greatest(b.starts_at, now()))) / 3600.0
  ) filter (where b.status = 'ACTIVE'), 0)::numeric(10, 2) as booked_hours_7d
from public.rooms r
left join public.room_bookings b
  on b.room_id = r.id
 and b.status = 'ACTIVE'
 and b.starts_at < now() + interval '7 days'
 and b.ends_at   > now()
group by r.id;

create or replace view public.v_staff_workload as
select
  p.id as profile_id,
  p.full_name,
  p.role,
  d.name as department_name,
  (
    select count(*) from public.work_orders w
     where w.assignee_id = p.id
       and w.status in ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'BLOCKED', 'AWAITING_PARTS')
  ) as open_work_orders,
  (
    select count(*)
      from public.activity_staff ast
      join public.scheduled_activities s on s.id = ast.activity_id
     where ast.profile_id = p.id
       and s.starts_at between now() and now() + interval '24 hours'
  ) as upcoming_sessions
from public.profiles p
left join public.departments d on d.id = p.department_id
where p.role in ('TECHNICIAN', 'DEPARTMENT_MANAGER')
   or exists (
     select 1 from public.staff_skills sk
      where sk.profile_id = p.id and sk.skill = 'INVIGILATE'
   );

create or replace view public.v_stock_shortages as
select
  p.id as part_id,
  p.sku,
  p.name,
  p.qty_available,
  p.qty_reserved,
  (p.qty_available - p.qty_reserved) as free_qty,
  p.reorder_level,
  p.unit_cost,
  case
    when (p.qty_available - p.qty_reserved) <= 0 then 'OUT_OF_STOCK'
    when (p.qty_available - p.qty_reserved) <= p.reorder_level then 'LOW'
    else 'OK'
  end as stock_state
from public.parts p
where (p.qty_available - p.qty_reserved) <= p.reorder_level
order by (p.qty_available - p.qty_reserved) asc;

create or replace view public.v_recurring_assets as
select
  a.id as asset_id,
  a.code,
  a.name,
  a.kind,
  count(i.id) as incident_count_90d,
  max(i.created_at) as last_incident_at
from public.assets a
join public.incidents i on i.asset_id = a.id
where i.created_at > now() - interval '90 days'
group by a.id
having count(i.id) >= 3
order by count(i.id) desc;

-- ---------------------------------------------------------------------------
-- Department scorecard â€” the body of the weekly digest email.
-- ---------------------------------------------------------------------------
create or replace view public.v_department_scorecard as
select
  d.id as department_id,
  d.name,
  count(i.id)                                                   as incidents_90d,
  count(i.id) filter (where i.status in ('CLOSED', 'RESOLVED')) as resolved_90d,
  count(i.id) filter (where i.status = 'ESCALATED')             as escalated_open,
  round(avg(extract(epoch from (i.resolved_at - i.created_at)) / 60.0)::numeric, 1) as avg_resolution_minutes,
  count(i.id) filter (where i.continuity_status = 'RESTORED')   as activities_protected
from public.departments d
left join public.incidents i
  on i.department_id = d.id and i.created_at > now() - interval '90 days'
group by d.id, d.name;

-- ---------------------------------------------------------------------------
-- Views must run with the caller's permissions. Without this, a view owned by
-- the migration role would bypass RLS on every table underneath it.
-- ---------------------------------------------------------------------------
alter view public.v_open_incidents       set (security_invoker = true);
alter view public.v_ttc                  set (security_invoker = true);
alter view public.v_sla_compliance       set (security_invoker = true);
alter view public.v_room_utilisation     set (security_invoker = true);
alter view public.v_staff_workload       set (security_invoker = true);
alter view public.v_stock_shortages      set (security_invoker = true);
alter view public.v_recurring_assets     set (security_invoker = true);
alter view public.v_department_scorecard set (security_invoker = true);
-- ===========================================================================
-- 0011 â€” Row Level Security
--
-- Defence in depth. The Postgres functions in 0009 are the write path, but RLS
-- still guarantees that a leaked anon key cannot read another department's
-- data, another student's reports, or the audit log.
-- ===========================================================================

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(
    public.auth_role() in (
      'TECHNICIAN', 'DEPARTMENT_MANAGER', 'FACILITIES_ADMIN',
      'PROCUREMENT_APPROVER', 'SYSTEM_ADMIN'
    ),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(public.auth_role() in ('FACILITIES_ADMIN', 'SYSTEM_ADMIN'), false);
$$;

create or replace function public.is_my_department(p_dept uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and department_id = p_dept
  );
$$;

-- Enable RLS everywhere. Anything not explicitly granted below is denied.
alter table public.departments          enable row level security;
alter table public.profiles             enable row level security;
alter table public.rooms                enable row level security;
alter table public.parts                enable row level security;
alter table public.assets               enable row level security;
alter table public.staff_skills         enable row level security;
alter table public.staff_shifts         enable row level security;
alter table public.policies             enable row level security;
alter table public.scheduled_activities enable row level security;
alter table public.activity_participants enable row level security;
alter table public.activity_staff       enable row level security;
alter table public.room_bookings        enable row level security;
alter table public.external_events      enable row level security;
alter table public.incidents            enable row level security;
alter table public.reports              enable row level security;
alter table public.recovery_plans       enable row level security;
alter table public.approvals            enable row level security;
alter table public.work_orders          enable row level security;
alter table public.part_reservations    enable row level security;
alter table public.purchase_requests    enable row level security;
alter table public.attachments          enable row level security;
alter table public.notifications        enable row level security;
alter table public.audit_events         enable row level security;
alter table public.ai_cache             enable row level security;

-- ---------------------------------------------------------------- reference
create policy departments_read on public.departments
  for select to authenticated using (true);

create policy departments_admin_write on public.departments
  for all to authenticated
  using (public.auth_role() = 'SYSTEM_ADMIN')
  with check (public.auth_role() = 'SYSTEM_ADMIN');

create policy profiles_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.auth_role() = 'SYSTEM_ADMIN')
  with check (public.auth_role() = 'SYSTEM_ADMIN');

create policy rooms_read on public.rooms
  for select to authenticated using (true);
create policy rooms_admin_write on public.rooms
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy parts_read on public.parts
  for select to authenticated using (true);
create policy parts_admin_write on public.parts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy assets_read on public.assets
  for select to authenticated using (true);
create policy assets_admin_write on public.assets
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy staff_skills_read on public.staff_skills
  for select to authenticated using (true);
create policy staff_skills_admin_write on public.staff_skills
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy staff_shifts_read on public.staff_shifts
  for select to authenticated using (public.is_staff() or profile_id = auth.uid());
create policy staff_shifts_admin_write on public.staff_shifts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy policies_read on public.policies
  for select to authenticated using (true);
create policy policies_admin_write on public.policies
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- scheduling
create policy activities_read on public.scheduled_activities
  for select to authenticated using (true);
create policy activities_admin_write on public.scheduled_activities
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy participants_read on public.activity_participants
  for select to authenticated using (public.is_staff() or public.auth_role() = 'REQUESTER');
create policy participants_admin_write on public.activity_participants
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy activity_staff_read on public.activity_staff
  for select to authenticated using (true);
create policy activity_staff_admin_write on public.activity_staff
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy bookings_read on public.room_bookings
  for select to authenticated using (true);
create policy bookings_admin_write on public.room_bookings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- intake
-- external_events: service role only. No policy = no access.

create policy incidents_read on public.incidents
  for select to authenticated
  using (
    public.is_staff()
    or reporter_id = auth.uid()
    or (department_id is not null and public.is_my_department(department_id))
  );

create policy incidents_insert_own on public.incidents
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy reports_read on public.reports
  for select to authenticated
  using (
    public.is_staff()
    or reporter_id = auth.uid()
    or incident_id in (select id from public.incidents where reporter_id = auth.uid())
  );

create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------- recovery
create policy plans_read on public.recovery_plans
  for select to authenticated
  using (
    public.is_staff()
    or incident_id in (select id from public.incidents where reporter_id = auth.uid())
  );

create policy approvals_read on public.approvals
  for select to authenticated
  using (
    public.is_admin()
    or required_role = public.auth_role()
    or requested_by = auth.uid()
  );

create policy work_orders_read on public.work_orders
  for select to authenticated
  using (
    public.is_admin()
    or assignee_id = auth.uid()
    or public.is_my_department(department_id)
  );

create policy part_reservations_read on public.part_reservations
  for select to authenticated using (public.is_staff());

create policy purchases_read on public.purchase_requests
  for select to authenticated
  using (
    public.is_admin()
    or public.auth_role() = 'PROCUREMENT_APPROVER'
    or requested_by = auth.uid()
    or public.is_my_department(
         (select department_id from public.work_orders where id = work_order_id)
       )
  );

-- ---------------------------------------------------------------- evidence
create policy attachments_read on public.attachments
  for select to authenticated
  using (
    public.is_staff()
    or incident_id in (select id from public.incidents where reporter_id = auth.uid())
  );

-- Uploads go through a signed URL + server action; the row is written by the
-- service role so the storage path and hash cannot be forged by the client.
-- No insert policy is granted here on purpose.

create policy notifications_read on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid());

-- ---------------------------------------------------------------- audit
create policy audit_read on public.audit_events
  for select to authenticated
  using (
    public.is_admin()
    or (
      incident_id is not null
      and incident_id in (select id from public.incidents)
    )
  );

-- The audit log is append-only for everyone, including admins.
revoke insert, update, delete on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;

-- ai_cache: service role only. No policy = no access.
-- ===========================================================================
-- 0012 â€” Seed functions
--
-- Split in two on purpose:
--   seed_reference()   static campus (rooms, parts, assets, policies)
--   seed_operational() the time-relative scenario state, safe to re-run
--   demo_reset()       wipe operational rows, then re-seed the scenario
--
-- `demo_reset()` is the button you press before every demo run. It takes about
-- 400ms and guarantees the exam is always ~40 minutes away.
-- ===========================================================================

create or replace function public.seed_reference()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- ------------------------------------------------------------- departments
  insert into public.departments (id, code, name) values
    ('31000000-0000-4000-8000-000000000001', 'ELEC',  'Electrical'),
    ('31000000-0000-4000-8000-000000000002', 'IT',    'IT & Network'),
    ('31000000-0000-4000-8000-000000000003', 'CIVIL', 'Civil Works'),
    ('31000000-0000-4000-8000-000000000004', 'HOUSE', 'Housekeeping'),
    ('31000000-0000-4000-8000-000000000005', 'AV',    'AV & Events'),
    ('31000000-0000-4000-8000-000000000006', 'PROC',  'Procurement'),
    ('31000000-0000-4000-8000-000000000007', 'FAC',   'Facilities')
  on conflict (id) do update set code = excluded.code, name = excluded.name;

  -- --------------------------------------------------------------- rooms
  insert into public.rooms
    (id, building, floor, code, name, kind, capacity, is_accessible, capabilities,
     setup_lead_minutes, qr_token)
  values
    ('32000000-0000-4000-8000-000000000001', 'B Block', 2, 'B-204', 'Lecture Theatre B-204', 'LECTURE_HALL', 200, true,  '{PROJECTOR}',                 0,  'b204'),
    ('32000000-0000-4000-8000-000000000002', 'Main Block', 0, 'AUD-A', 'Auditorium A',          'AUDITORIUM',   300, true,  '{PROJECTOR,PA,ACCESSIBLE}',   4,  'aud-a'),
    ('32000000-0000-4000-8000-000000000003', 'Library', 1, 'LIB-HALL', 'Library Hall',        'HALL',         220, true,  '{PROJECTOR,PA}',              6,  'lib-hall'),
    ('32000000-0000-4000-8000-000000000004', 'Main Block', 1, 'NSC-1', 'New Seminar Complex',  'HALL',         200, true,  '{PROJECTOR,PA}',              20, 'nsc-1'),
    ('32000000-0000-4000-8000-000000000005', 'North Campus', 0, 'CENT-AUD', 'Central Auditorium','AUDITORIUM', 400, true,  '{PROJECTOR,PA,ACCESSIBLE}',   45, 'central-aud'),
    ('32000000-0000-4000-8000-000000000006', 'B Block', 1, 'SEM-HALL', 'Seminar Hall',        'HALL',         120, false, '{PROJECTOR}',                 5,  'sem-hall'),
    ('32000000-0000-4000-8000-000000000007', 'Grounds', 0, 'OAT', 'Open Air Theatre',         'OUTDOOR',      250, true,  '{PA}',                        15, 'oat'),
    ('32000000-0000-4000-8000-000000000008', 'B Block', 1, 'B-101', 'Classroom B-101',         'CLASSROOM',     90, true,  '{PROJECTOR}',                 3,  'b101'),
    ('32000000-0000-4000-8000-000000000009', 'B Block', 1, 'B-102', 'Classroom B-102',         'CLASSROOM',     90, true,  '{PROJECTOR}',                 3,  'b102'),
    ('32000000-0000-4000-8000-00000000000a', 'Engineering Block', 2, 'LAB-3', 'Network Lab 3',   'LAB',           40, true,  '{NETWORK,PROJECTOR}',         2,  'lab-3'),
    ('32000000-0000-4000-8000-00000000000b', 'Engineering Block', 2, 'LAB-4', 'Network Lab 4',   'LAB',           40, true,  '{NETWORK,PROJECTOR}',         2,  'lab-4'),
    ('32000000-0000-4000-8000-00000000000c', 'C Block', 3, 'C-301', 'Classroom C-301',          'CLASSROOM',     60, true,  '{PROJECTOR}',                 3,  'c301'),
    ('32000000-0000-4000-8000-00000000000d', 'C Block', 3, 'C-302', 'Classroom C-302',          'CLASSROOM',     60, true,  '{PROJECTOR}',                 3,  'c302'),
    ('32000000-0000-4000-8000-00000000000e', 'Workshop', 0, 'WS-1', 'Workshop',                 'WORKSHOP',      30, false, '{}',                          5,  'ws-1')
  on conflict (id) do update set
    building = excluded.building, floor = excluded.floor, code = excluded.code,
    name = excluded.name, kind = excluded.kind, capacity = excluded.capacity,
    is_accessible = excluded.is_accessible, capabilities = excluded.capabilities,
    setup_lead_minutes = excluded.setup_lead_minutes, qr_token = excluded.qr_token;

  -- --------------------------------------------------------------- parts
  insert into public.parts
    (id, sku, name, unit, qty_available, qty_reserved, unit_cost, store_location,
     reorder_level, is_equipment)
  values
    ('33000000-0000-4000-8000-000000000001', 'MCB-32A',        '32A Miniature Circuit Breaker', 'unit', 0,  0,  4800.00, 'Store A', 2, false),
    ('33000000-0000-4000-8000-000000000002', 'MCB-16A',        '16A Miniature Circuit Breaker', 'unit', 6,  0,  2200.00, 'Store A', 2, false),
    ('33000000-0000-4000-8000-000000000003', 'SFP-1G',         '1G SFP Fibre Module',           'unit', 0,  0, 18500.00, 'Store B', 2, false),
    ('33000000-0000-4000-8000-000000000004', 'AP-SPARE',       'Spare Wi-Fi Access Point',      'unit', 4,  0, 12000.00, 'Store B', 1, true),
    ('33000000-0000-4000-8000-000000000005', 'PA-PORTABLE',    'Portable PA System',            'unit', 2,  0, 25000.00, 'AV Room', 1, true),
    ('33000000-0000-4000-8000-000000000006', 'CABLE-CAT6',     'CAT6 Cable (per metre)',        'm',   50,  0,   450.00, 'Store B', 20, false),
    ('33000000-0000-4000-8000-000000000007', 'PROJECTOR-SPARE','Spare Projector',               'unit', 1,  0, 45000.00, 'AV Room', 1, true)
  on conflict (id) do update set
    sku = excluded.sku, name = excluded.name, unit = excluded.unit,
    unit_cost = excluded.unit_cost, store_location = excluded.store_location,
    reorder_level = excluded.reorder_level, is_equipment = excluded.is_equipment;

  -- --------------------------------------------------------------- assets
  insert into public.assets
    (id, parent_asset_id, room_id, code, name, kind, criticality, required_part_id)
  values
    ('34000000-0000-4000-8000-000000000001', null,
     '32000000-0000-4000-8000-000000000001', 'E-12', 'Electrical Panel E-12', 'PANEL', 5,
     '33000000-0000-4000-8000-000000000001'),
    ('34000000-0000-4000-8000-000000000002', null,
     '32000000-0000-4000-8000-00000000000a', 'SW-3', 'Network Switch SW-3', 'SWITCH', 5,
     '33000000-0000-4000-8000-000000000003'),
    ('34000000-0000-4000-8000-000000000003',
     '34000000-0000-4000-8000-000000000002',
     '32000000-0000-4000-8000-00000000000a', 'AP-3A', 'Access Point AP-3A', 'ACCESS_POINT', 3, null),
    ('34000000-0000-4000-8000-000000000004',
     '34000000-0000-4000-8000-000000000002',
     '32000000-0000-4000-8000-00000000000b', 'AP-3B', 'Access Point AP-3B', 'ACCESS_POINT', 3, null)
  on conflict (id) do update set
    room_id = excluded.room_id, code = excluded.code, name = excluded.name,
    kind = excluded.kind, criticality = excluded.criticality,
    required_part_id = excluded.required_part_id;

  -- --------------------------------------------------------------- policies
  insert into public.policies (code, name, kind, conditions, actions) values
    ('POL-04', 'Routine auto-triage', 'AUTO_TRIAGE',
     '{"maxSeverity":"P4","maxCost":2000,"requireSingleDepartment":true,"requireNoSessionWithinMinutes":120,"requireInStock":true}'::jsonb,
     '{"autoTriage":true}'::jsonb),
    ('POL-APPROVAL-THRESHOLD', 'Purchase approval threshold', 'APPROVAL_THRESHOLD',
     '{"amountThreshold":10000}'::jsonb,
     '{"requiredRole":"PROCUREMENT_APPROVER"}'::jsonb),
    ('POL-SLA', 'Default SLA ladder', 'SLA',
     '{"P1":60,"P2":240,"P3":1440,"P4":4320}'::jsonb,
     '{"nudgeAt":[0.5,0.8],"breachAt":1.0}'::jsonb)
  on conflict (code) do update set
    name = excluded.name, kind = excluded.kind,
    conditions = excluded.conditions, actions = excluded.actions;

  -- ------------------------------------------- link profiles to departments
  update public.profiles p
     set department_id = m.dept_id::uuid
    from (values
      ('meera@aegis.demo',    '31000000-0000-4000-8000-000000000001'),
      ('arjun@aegis.demo',    '31000000-0000-4000-8000-000000000001'),
      ('priya@aegis.demo',    '31000000-0000-4000-8000-000000000001'),
      ('rohan@aegis.demo',    '31000000-0000-4000-8000-000000000001'),
      ('sunita@aegis.demo',   '31000000-0000-4000-8000-000000000001'),
      ('nikhil@aegis.demo',   '31000000-0000-4000-8000-000000000001'),
      ('deepa@aegis.demo',    '31000000-0000-4000-8000-000000000002'),
      ('imran@aegis.demo',    '31000000-0000-4000-8000-000000000002'),
      ('ravi@aegis.demo',     '31000000-0000-4000-8000-000000000001'),
      ('nisha@aegis.demo',    '31000000-0000-4000-8000-000000000002'),
      ('farhan@aegis.demo',   '31000000-0000-4000-8000-000000000002'),
      ('suresh@aegis.demo',   '31000000-0000-4000-8000-000000000001'),
      ('kavita@aegis.demo',   '31000000-0000-4000-8000-000000000002'),
      ('ananya@aegis.demo',   '31000000-0000-4000-8000-000000000007'),
      ('vikram@aegis.demo',   '31000000-0000-4000-8000-000000000006')
    ) as m(email, dept_id)
   where p.email = m.email;

  update public.departments d
     set manager_id = p.id
    from public.profiles p
   where (d.code = 'ELEC' and p.email = 'suresh@aegis.demo')
      or (d.code = 'IT'   and p.email = 'kavita@aegis.demo')
      or (d.code = 'FAC'  and p.email = 'ananya@aegis.demo')
      or (d.code = 'PROC' and p.email = 'vikram@aegis.demo');

  -- --------------------------------------------------------------- skills
  insert into public.staff_skills (profile_id, skill, level)
  select p.id, s.skill, s.level
    from public.profiles p
    join (values
      ('meera@aegis.demo',  'INVIGILATE', 3),
      ('arjun@aegis.demo',  'INVIGILATE', 3),
      ('priya@aegis.demo',  'INVIGILATE', 3),
      ('rohan@aegis.demo',  'INVIGILATE', 2),
      ('sunita@aegis.demo', 'INVIGILATE', 3),
      ('nikhil@aegis.demo', 'INVIGILATE', 3),
      ('deepa@aegis.demo',  'INVIGILATE', 2),
      ('imran@aegis.demo',  'INVIGILATE', 2),
      ('ravi@aegis.demo',   'ELECTRICAL', 4),
      ('suresh@aegis.demo', 'ELECTRICAL', 3),
      ('nisha@aegis.demo',  'NETWORK',    4),
      ('farhan@aegis.demo', 'NETWORK',    3),
      ('kavita@aegis.demo', 'NETWORK',    3)
    ) as s(email, skill, level) on s.email = p.email
  on conflict (profile_id, skill) do update set level = excluded.level;
end;
$$;

-- ---------------------------------------------------------------------------
-- Operational seed: the two scenarios, always relative to "now".
-- ---------------------------------------------------------------------------
create or replace function public.seed_operational()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_base timestamptz := date_trunc('minute', now()) + interval '40 minutes';
  v_end  timestamptz;
begin
  v_end := v_base + interval '2 hours';

  -- ---------------------------------------------------- wipe scheduling state
  delete from public.room_bookings;
  delete from public.activity_staff;
  delete from public.activity_participants;
  delete from public.scheduled_activities;

  update public.parts set qty_reserved = 0;
  update public.rooms set is_available = true, unavailable_reason = null;

  delete from public.staff_shifts;

  -- --------------------------------------------------------------- shifts
  insert into public.staff_shifts (profile_id, starts_at, ends_at)
  select p.id, v_base - interval '2 hours', v_base + interval '8 hours'
    from public.profiles p
   where p.email in (
     'meera@aegis.demo', 'arjun@aegis.demo', 'priya@aegis.demo',
     'sunita@aegis.demo', 'nikhil@aegis.demo', 'deepa@aegis.demo',
     'imran@aegis.demo', 'ravi@aegis.demo', 'nisha@aegis.demo',
     'farhan@aegis.demo', 'suresh@aegis.demo', 'kavita@aegis.demo',
     'ananya@aegis.demo', 'vikram@aegis.demo'
   );

  -- Rohan leaves 30 minutes into the exam: the forced staffing deficit.
  insert into public.staff_shifts (profile_id, starts_at, ends_at)
  select p.id, v_base - interval '2 hours', v_base + interval '30 minutes'
    from public.profiles p
   where p.email = 'rohan@aegis.demo';

  -- ---------------------------------------------------------- activities
  insert into public.scheduled_activities
    (id, kind, title, course_code, room_id, starts_at, ends_at, headcount,
     required_capabilities, min_staff, required_skill, status)
  values
    ('35000000-0000-4000-8000-000000000001', 'EXAM',
     'Data Structures â€” End Semester Exam', 'CS-204',
     '32000000-0000-4000-8000-000000000001', v_base, v_end, 180,
     '{PROJECTOR}', 4, 'INVIGILATE', 'SCHEDULED'),

    ('35000000-0000-4000-8000-000000000002', 'EVENT',
     'Placement Drive â€” Day 1', null,
     '32000000-0000-4000-8000-000000000002', v_base, v_end, 120,
     '{PA}', 2, null, 'SCHEDULED'),

    ('35000000-0000-4000-8000-000000000003', 'LAB',
     'Computer Networks â€” Lab', 'CS-311',
     '32000000-0000-4000-8000-00000000000a', v_base, v_end, 38,
     '{NETWORK}', 1, null, 'SCHEDULED'),

    ('35000000-0000-4000-8000-000000000004', 'LECTURE',
     'Thermodynamics', 'ME-201',
     '32000000-0000-4000-8000-00000000000c', v_base, v_end, 55,
     '{PROJECTOR}', 1, null, 'SCHEDULED');

  -- --------------------------------------------------------- participants
  insert into public.activity_participants (activity_id, cohort_label, headcount) values
    ('35000000-0000-4000-8000-000000000001', 'CS-204 Â· Semester 5 (Aâ€“C)', 180),
    ('35000000-0000-4000-8000-000000000002', 'Placement cohort Â· CSE/IT', 120),
    ('35000000-0000-4000-8000-000000000003', 'CS-311 Â· Batch 2', 38),
    ('35000000-0000-4000-8000-000000000004', 'ME-201 Â· Semester 3', 55);

  -- ------------------------------------------------------------- staffing
  insert into public.activity_staff (activity_id, profile_id, role)
  select a.activity_id, p.id, a.role
    from (values
      ('35000000-0000-4000-8000-000000000001'::uuid, 'meera@aegis.demo',  'INSTRUCTOR'),
      ('35000000-0000-4000-8000-000000000001'::uuid, 'arjun@aegis.demo',  'INVIGILATOR'),
      ('35000000-0000-4000-8000-000000000001'::uuid, 'priya@aegis.demo',  'INVIGILATOR'),
      ('35000000-0000-4000-8000-000000000001'::uuid, 'rohan@aegis.demo',  'INVIGILATOR'),
      ('35000000-0000-4000-8000-000000000002'::uuid, 'nikhil@aegis.demo', 'INSTRUCTOR'),
      ('35000000-0000-4000-8000-000000000003'::uuid, 'deepa@aegis.demo',  'INSTRUCTOR'),
      ('35000000-0000-4000-8000-000000000004'::uuid, 'imran@aegis.demo',  'INSTRUCTOR')
    ) as a(activity_id, email, role)
    join public.profiles p on p.email = a.email
  on conflict (activity_id, profile_id) do nothing;

  -- ------------------------------------------------------------- bookings
  insert into public.room_bookings (id, room_id, activity_id, title, starts_at, ends_at)
  select
    ('36000000-0000-4000-8000-00000000000' || lpad(row_number() over (order by s.id)::text, 1, '0'))::uuid,
    s.room_id, s.id, s.title, s.starts_at, s.ends_at
  from public.scheduled_activities s;
end;
$$;

-- ---------------------------------------------------------------------------
-- Demo reset
-- ---------------------------------------------------------------------------
create or replace function public.demo_reset()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.notifications;
  delete from public.attachments;
  delete from public.audit_events;
  delete from public.approvals;
  delete from public.part_reservations;
  delete from public.purchase_requests;
  delete from public.recovery_plans;
  delete from public.work_orders;
  delete from public.reports;
  delete from public.incidents;
  delete from public.external_events;

  perform public.seed_operational();

  return jsonb_build_object(
    'ok', true,
    'reset_at', now(),
    'exam_starts_at', (select starts_at from public.scheduled_activities
                        where id = '35000000-0000-4000-8000-000000000001')
  );
end;
$$;

grant execute on function public.seed_reference() to service_role;
grant execute on function public.seed_operational() to service_role;
grant execute on function public.demo_reset() to authenticated, service_role;
-- ===========================================================================
-- 0013 â€” Remaining write paths: work orders, procurement, evidence, nudges
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Work order lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.transition_work_order(
  p_work_order_id uuid,
  p_to            work_order_status,
  p_actor         uuid,
  p_note          text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wo      record;
  v_actor   record;
  v_allowed boolean;
begin
  -- SECURITY FIX: enforce caller identity at the database boundary
  if auth.uid() is not null and auth.uid() <> p_actor then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_MISMATCH');
  end if;

  select * into v_wo from public.work_orders where id = p_work_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'WORK_ORDER_NOT_FOUND');
  end if;

  select * into v_actor from public.profiles where id = p_actor;
  if not found or not v_actor.is_active then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_INVALID');
  end if;

  -- Only the assignee, the owning department's manager, or a facilities admin
  -- may move a work order.
  if not (
    v_wo.assignee_id = p_actor
    or v_actor.role = 'FACILITIES_ADMIN'
    or (v_actor.role = 'DEPARTMENT_MANAGER' and v_actor.department_id = v_wo.department_id)
  ) then
    return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_AUTHORIZED');
  end if;

  select exists (
    select 1 from (values
      ('CREATED',              'ASSIGNED'),
      ('CREATED',              'CANCELLED'),
      ('ASSIGNED',             'ACCEPTED'),
      ('ASSIGNED',             'BLOCKED'),
      ('ASSIGNED',             'CANCELLED'),
      ('ACCEPTED',             'IN_PROGRESS'),
      ('IN_PROGRESS',          'BLOCKED'),
      ('IN_PROGRESS',          'AWAITING_PARTS'),
      ('IN_PROGRESS',          'AWAITING_VERIFICATION'),
      ('BLOCKED',              'IN_PROGRESS'),
      ('BLOCKED',              'AWAITING_PARTS'),
      ('AWAITING_PARTS',       'IN_PROGRESS'),
      ('AWAITING_PARTS',       'BLOCKED'),
      ('AWAITING_VERIFICATION','DONE'),
      ('AWAITING_VERIFICATION','IN_PROGRESS')
    ) as t(from_state, to_state)
    where t.from_state = v_wo.status::text and t.to_state = p_to::text
  ) into v_allowed;

  if not v_allowed then
    return jsonb_build_object(
      'ok', false, 'code', 'INVALID_TRANSITION',
      'from', v_wo.status, 'to', p_to
    );
  end if;

  -- A work order cannot be submitted for verification without evidence.
  if p_to = 'AWAITING_VERIFICATION' then
    if not exists (
      select 1 from public.attachments
       where incident_id = v_wo.incident_id and kind = 'AFTER'
    ) then
      return jsonb_build_object('ok', false, 'code', 'EVIDENCE_REQUIRED');
    end if;
  end if;

  update public.work_orders
     set status = p_to,
         version = version + 1,
         blocked_reason = case when p_to = 'BLOCKED' then coalesce(p_note, blocked_reason) else null end,
         started_at   = case when p_to = 'IN_PROGRESS' and started_at is null then now() else started_at end,
         completed_at = case when p_to = 'DONE' then now() else completed_at end
   where id = p_work_order_id;

  perform public.log_audit(
    v_wo.incident_id, p_actor, 'USER', 'WORK_ORDER_STATUS',
    jsonb_build_object('work_order_id', p_work_order_id, 'from', v_wo.status, 'to', p_to, 'note', p_note)
  );

  return jsonb_build_object('ok', true, 'status', p_to);
end;
$$;

-- ---------------------------------------------------------------------------
-- Purchase approval (separation of duties is structural, not cosmetic)
-- ---------------------------------------------------------------------------
create or replace function public.approve_purchase(
  p_purchase_id uuid,
  p_actor       uuid,
  p_decision    approval_status,
  p_reason      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pr    record;
  v_actor record;
begin
  -- SECURITY FIX
  if auth.uid() is not null and auth.uid() <> p_actor then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_MISMATCH');
  end if;

  select * into v_pr from public.purchase_requests where id = p_purchase_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PURCHASE_NOT_FOUND');
  end if;

  select * into v_actor from public.profiles where id = p_actor;
  if not found or not v_actor.is_active then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_INVALID');
  end if;

  if v_actor.role <> 'PROCUREMENT_APPROVER' then
    return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_AUTHORIZED',
                              'actor_role', v_actor.role);
  end if;

  if v_pr.requested_by = p_actor then
    perform public.log_audit(
      v_pr.incident_id, p_actor, 'USER', 'PURCHASE_DENIED_SOD',
      jsonb_build_object('purchase_request_id', p_purchase_id)
    );
    return jsonb_build_object('ok', false, 'code', 'SOD_REQUESTER');
  end if;

  if v_pr.status <> 'REQUESTED' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_STATE', 'status', v_pr.status);
  end if;

  update public.purchase_requests
     set status = case when p_decision = 'APPROVED' then 'APPROVED'::purchase_status
                       else 'REJECTED'::purchase_status end,
         approved_by = p_actor,
         decided_at = now(),
         reason = coalesce(p_reason, reason)
   where id = p_purchase_id;

  update public.approvals
     set status = p_decision, decided_by = p_actor, decided_at = now(),
         reason = coalesce(p_reason, reason)
   where subject_type = 'PURCHASE_REQUEST' and subject_id = p_purchase_id and status = 'PENDING';

  perform public.log_audit(
    v_pr.incident_id, p_actor, 'USER',
    case when p_decision = 'APPROVED' then 'PURCHASE_APPROVED' else 'PURCHASE_REJECTED' end,
    jsonb_build_object('purchase_request_id', p_purchase_id, 'amount', v_pr.amount)
  );

  return jsonb_build_object('ok', true, 'status', p_decision);
end;
$$;

-- ---------------------------------------------------------------------------
-- Evidence verification. Closure is impossible without BEFORE and AFTER, and
-- the person who uploaded the AFTER photo cannot be the person who verifies it.
-- ---------------------------------------------------------------------------
create or replace function public.verify_evidence(
  p_incident_id uuid,
  p_actor       uuid,
  p_accepted    boolean,
  p_reason      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inc    record;
  v_actor  record;
  v_before int;
  v_after  int;
begin
  -- SECURITY FIX
  if auth.uid() is not null and auth.uid() <> p_actor then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_MISMATCH');
  end if;

  select * into v_inc from public.incidents where id = p_incident_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INCIDENT_NOT_FOUND');
  end if;

  select * into v_actor from public.profiles where id = p_actor;
  if not found or not v_actor.is_active then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_INVALID');
  end if;

  if v_actor.role not in ('FACILITIES_ADMIN', 'DEPARTMENT_MANAGER') then
    return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_AUTHORIZED');
  end if;

  if v_inc.status <> 'AWAITING_VERIFICATION' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_STATE', 'status', v_inc.status);
  end if;

  select count(*) into v_before from public.attachments
   where incident_id = p_incident_id and kind = 'BEFORE';
  select count(*) into v_after from public.attachments
   where incident_id = p_incident_id and kind = 'AFTER';

  if v_before = 0 or v_after = 0 then
    return jsonb_build_object('ok', false, 'code', 'EVIDENCE_MISSING',
                              'before', v_before, 'after', v_after);
  end if;

  if exists (
    select 1 from public.attachments
     where incident_id = p_incident_id and kind = 'AFTER' and uploaded_by = p_actor
  ) then
    perform public.log_audit(
      p_incident_id, p_actor, 'USER', 'EVIDENCE_DENIED_SOD',
      jsonb_build_object('rule', 'UPLOADER_CANNOT_VERIFY')
    );
    return jsonb_build_object('ok', false, 'code', 'SOD_UPLOADER');
  end if;

  update public.attachments
     set verified_by = p_actor, verified_at = now(), is_accepted = p_accepted
   where incident_id = p_incident_id;

  if p_accepted then
    update public.incidents
       set status = 'RESOLVED', resolved_at = now(), version = version + 1
     where id = p_incident_id;

    update public.work_orders
       set status = 'DONE', completed_at = now(), version = version + 1
     where incident_id = p_incident_id
       and status in ('AWAITING_VERIFICATION', 'IN_PROGRESS', 'BLOCKED');

    perform public.log_audit(
      p_incident_id, p_actor, 'USER', 'EVIDENCE_VERIFIED',
      jsonb_build_object('reason', p_reason)
    );

    return jsonb_build_object('ok', true, 'status', 'RESOLVED');
  end if;

  update public.incidents
     set status = 'IN_PROGRESS', version = version + 1
   where id = p_incident_id;

  perform public.log_audit(
    p_incident_id, p_actor, 'USER', 'EVIDENCE_REJECTED',
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'status', 'IN_PROGRESS');
end;
$$;

-- ---------------------------------------------------------------------------
-- Nudge response: the department must answer with status, action and ETA.
-- ---------------------------------------------------------------------------
create or replace function public.log_nudge_response(
  p_incident_id uuid,
  p_actor       uuid,
  p_status      text,
  p_action      text,
  p_eta_minutes int
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inc   record;
  v_actor record;
begin
  -- SECURITY FIX
  if auth.uid() is not null and auth.uid() <> p_actor then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_MISMATCH');
  end if;

  select * into v_inc from public.incidents where id = p_incident_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INCIDENT_NOT_FOUND');
  end if;

  select * into v_actor from public.profiles where id = p_actor;
  if not found or not v_actor.is_active then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_INVALID');
  end if;

  if not (
    v_actor.role = 'FACILITIES_ADMIN'
    or (v_actor.role = 'DEPARTMENT_MANAGER' and v_actor.department_id = v_inc.department_id)
  ) then
    return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_AUTHORIZED');
  end if;

  perform public.log_audit(
    p_incident_id, p_actor, 'USER', 'NUDGE_RESPONSE',
    jsonb_build_object('status', p_status, 'action', p_action, 'eta_minutes', p_eta_minutes)
  );

  insert into public.notifications
    (incident_id, recipient_id, channel, template, payload, dedupe_key)
  values (
    p_incident_id,
    (select id from public.profiles where role = 'FACILITIES_ADMIN' and is_active order by created_at limit 1),
    'IN_APP', 'NUDGE_RESPONSE_RECEIVED',
    jsonb_build_object('status', p_status, 'action', p_action, 'eta_minutes', p_eta_minutes,
                       'by', v_actor.full_name),
    'nudge-response:' || p_incident_id::text || ':' || extract(epoch from now())::text
  )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.transition_work_order(uuid, work_order_status, uuid, text) to authenticated;
grant execute on function public.approve_purchase(uuid, uuid, approval_status, text) to authenticated;
grant execute on function public.verify_evidence(uuid, uuid, boolean, text) to authenticated;
grant execute on function public.log_nudge_response(uuid, uuid, text, text, int) to authenticated;
