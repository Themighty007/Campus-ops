-- ===========================================================================
-- 0005 — Intake: external events, incidents, reports
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
