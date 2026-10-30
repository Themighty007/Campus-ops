-- ===========================================================================
-- 0012 — Seed functions
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
     'Data Structures — End Semester Exam', 'CS-204',
     '32000000-0000-4000-8000-000000000001', v_base, v_end, 180,
     '{PROJECTOR}', 4, 'INVIGILATE', 'SCHEDULED'),

    ('35000000-0000-4000-8000-000000000002', 'EVENT',
     'Placement Drive — Day 1', null,
     '32000000-0000-4000-8000-000000000002', v_base, v_end, 120,
     '{PA}', 2, null, 'SCHEDULED'),

    ('35000000-0000-4000-8000-000000000003', 'LAB',
     'Computer Networks — Lab', 'CS-311',
     '32000000-0000-4000-8000-00000000000a', v_base, v_end, 38,
     '{NETWORK}', 1, null, 'SCHEDULED'),

    ('35000000-0000-4000-8000-000000000004', 'LECTURE',
     'Thermodynamics', 'ME-201',
     '32000000-0000-4000-8000-00000000000c', v_base, v_end, 55,
     '{PROJECTOR}', 1, null, 'SCHEDULED');

  -- --------------------------------------------------------- participants
  insert into public.activity_participants (activity_id, cohort_label, headcount) values
    ('35000000-0000-4000-8000-000000000001', 'CS-204 · Semester 5 (A–C)', 180),
    ('35000000-0000-4000-8000-000000000002', 'Placement cohort · CSE/IT', 120),
    ('35000000-0000-4000-8000-000000000003', 'CS-311 · Batch 2', 38),
    ('35000000-0000-4000-8000-000000000004', 'ME-201 · Semester 3', 55);

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
