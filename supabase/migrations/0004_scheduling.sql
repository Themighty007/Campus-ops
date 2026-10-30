-- ===========================================================================
-- 0004 — Scheduling: activities, cohorts, staff, bookings
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
