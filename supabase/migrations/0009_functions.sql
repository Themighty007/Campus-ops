-- ===========================================================================
-- 0009 — Domain functions
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
-- Plan revalidation — the guard that makes "stale" impossible to ignore.
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
