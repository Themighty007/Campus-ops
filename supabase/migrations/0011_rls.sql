-- ===========================================================================
-- 0011 — Row Level Security
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
