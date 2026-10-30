-- ===========================================================================
-- 0006 — Recovery: plans, approvals, work orders
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
