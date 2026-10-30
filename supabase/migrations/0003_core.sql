-- ===========================================================================
-- 0003 — Core: departments, people, rooms, parts, assets, skills, shifts, policy
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
