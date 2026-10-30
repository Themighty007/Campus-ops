-- ===========================================================================
-- 0007 — Inventory: reservations and procurement
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
