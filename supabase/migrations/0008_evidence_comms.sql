-- ===========================================================================
-- 0008 — Evidence, notifications, audit, AI cache
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
