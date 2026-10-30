-- ===========================================================================
-- 0010 — Analytics views
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
-- Department scorecard — the body of the weekly digest email.
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
