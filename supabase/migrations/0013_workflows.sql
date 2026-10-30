-- ===========================================================================
-- 0013 — Remaining write paths: work orders, procurement, evidence, nudges
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Work order lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.transition_work_order(
  p_work_order_id uuid,
  p_to            work_order_status,
  p_actor         uuid,
  p_note          text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wo      record;
  v_actor   record;
  v_allowed boolean;
begin
  -- SECURITY FIX: enforce caller identity at the database boundary
  if auth.uid() is not null and auth.uid() <> p_actor then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_MISMATCH');
  end if;

  select * into v_wo from public.work_orders where id = p_work_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'WORK_ORDER_NOT_FOUND');
  end if;

  select * into v_actor from public.profiles where id = p_actor;
  if not found or not v_actor.is_active then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_INVALID');
  end if;

  -- Only the assignee, the owning department's manager, or a facilities admin
  -- may move a work order.
  if not (
    v_wo.assignee_id = p_actor
    or v_actor.role = 'FACILITIES_ADMIN'
    or (v_actor.role = 'DEPARTMENT_MANAGER' and v_actor.department_id = v_wo.department_id)
  ) then
    return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_AUTHORIZED');
  end if;

  select exists (
    select 1 from (values
      ('CREATED',              'ASSIGNED'),
      ('CREATED',              'CANCELLED'),
      ('ASSIGNED',             'ACCEPTED'),
      ('ASSIGNED',             'BLOCKED'),
      ('ASSIGNED',             'CANCELLED'),
      ('ACCEPTED',             'IN_PROGRESS'),
      ('IN_PROGRESS',          'BLOCKED'),
      ('IN_PROGRESS',          'AWAITING_PARTS'),
      ('IN_PROGRESS',          'AWAITING_VERIFICATION'),
      ('BLOCKED',              'IN_PROGRESS'),
      ('BLOCKED',              'AWAITING_PARTS'),
      ('AWAITING_PARTS',       'IN_PROGRESS'),
      ('AWAITING_PARTS',       'BLOCKED'),
      ('AWAITING_VERIFICATION','DONE'),
      ('AWAITING_VERIFICATION','IN_PROGRESS')
    ) as t(from_state, to_state)
    where t.from_state = v_wo.status::text and t.to_state = p_to::text
  ) into v_allowed;

  if not v_allowed then
    return jsonb_build_object(
      'ok', false, 'code', 'INVALID_TRANSITION',
      'from', v_wo.status, 'to', p_to
    );
  end if;

  -- A work order cannot be submitted for verification without evidence.
  if p_to = 'AWAITING_VERIFICATION' then
    if not exists (
      select 1 from public.attachments
       where incident_id = v_wo.incident_id and kind = 'AFTER'
    ) then
      return jsonb_build_object('ok', false, 'code', 'EVIDENCE_REQUIRED');
    end if;
  end if;

  update public.work_orders
     set status = p_to,
         version = version + 1,
         blocked_reason = case when p_to = 'BLOCKED' then coalesce(p_note, blocked_reason) else null end,
         started_at   = case when p_to = 'IN_PROGRESS' and started_at is null then now() else started_at end,
         completed_at = case when p_to = 'DONE' then now() else completed_at end
   where id = p_work_order_id;

  perform public.log_audit(
    v_wo.incident_id, p_actor, 'USER', 'WORK_ORDER_STATUS',
    jsonb_build_object('work_order_id', p_work_order_id, 'from', v_wo.status, 'to', p_to, 'note', p_note)
  );

  return jsonb_build_object('ok', true, 'status', p_to);
end;
$$;

-- ---------------------------------------------------------------------------
-- Purchase approval (separation of duties is structural, not cosmetic)
-- ---------------------------------------------------------------------------
create or replace function public.approve_purchase(
  p_purchase_id uuid,
  p_actor       uuid,
  p_decision    approval_status,
  p_reason      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pr    record;
  v_actor record;
begin
  -- SECURITY FIX
  if auth.uid() is not null and auth.uid() <> p_actor then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_MISMATCH');
  end if;

  select * into v_pr from public.purchase_requests where id = p_purchase_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PURCHASE_NOT_FOUND');
  end if;

  select * into v_actor from public.profiles where id = p_actor;
  if not found or not v_actor.is_active then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_INVALID');
  end if;

  if v_actor.role <> 'PROCUREMENT_APPROVER' then
    return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_AUTHORIZED',
                              'actor_role', v_actor.role);
  end if;

  if v_pr.requested_by = p_actor then
    perform public.log_audit(
      v_pr.incident_id, p_actor, 'USER', 'PURCHASE_DENIED_SOD',
      jsonb_build_object('purchase_request_id', p_purchase_id)
    );
    return jsonb_build_object('ok', false, 'code', 'SOD_REQUESTER');
  end if;

  if v_pr.status <> 'REQUESTED' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_STATE', 'status', v_pr.status);
  end if;

  update public.purchase_requests
     set status = case when p_decision = 'APPROVED' then 'APPROVED'::purchase_status
                       else 'REJECTED'::purchase_status end,
         approved_by = p_actor,
         decided_at = now(),
         reason = coalesce(p_reason, reason)
   where id = p_purchase_id;

  update public.approvals
     set status = p_decision, decided_by = p_actor, decided_at = now(),
         reason = coalesce(p_reason, reason)
   where subject_type = 'PURCHASE_REQUEST' and subject_id = p_purchase_id and status = 'PENDING';

  perform public.log_audit(
    v_pr.incident_id, p_actor, 'USER',
    case when p_decision = 'APPROVED' then 'PURCHASE_APPROVED' else 'PURCHASE_REJECTED' end,
    jsonb_build_object('purchase_request_id', p_purchase_id, 'amount', v_pr.amount)
  );

  return jsonb_build_object('ok', true, 'status', p_decision);
end;
$$;

-- ---------------------------------------------------------------------------
-- Evidence verification. Closure is impossible without BEFORE and AFTER, and
-- the person who uploaded the AFTER photo cannot be the person who verifies it.
-- ---------------------------------------------------------------------------
create or replace function public.verify_evidence(
  p_incident_id uuid,
  p_actor       uuid,
  p_accepted    boolean,
  p_reason      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inc    record;
  v_actor  record;
  v_before int;
  v_after  int;
begin
  -- SECURITY FIX
  if auth.uid() is not null and auth.uid() <> p_actor then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_MISMATCH');
  end if;

  select * into v_inc from public.incidents where id = p_incident_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INCIDENT_NOT_FOUND');
  end if;

  select * into v_actor from public.profiles where id = p_actor;
  if not found or not v_actor.is_active then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_INVALID');
  end if;

  if v_actor.role not in ('FACILITIES_ADMIN', 'DEPARTMENT_MANAGER') then
    return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_AUTHORIZED');
  end if;

  if v_inc.status <> 'AWAITING_VERIFICATION' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_STATE', 'status', v_inc.status);
  end if;

  select count(*) into v_before from public.attachments
   where incident_id = p_incident_id and kind = 'BEFORE';
  select count(*) into v_after from public.attachments
   where incident_id = p_incident_id and kind = 'AFTER';

  if v_before = 0 or v_after = 0 then
    return jsonb_build_object('ok', false, 'code', 'EVIDENCE_MISSING',
                              'before', v_before, 'after', v_after);
  end if;

  if exists (
    select 1 from public.attachments
     where incident_id = p_incident_id and kind = 'AFTER' and uploaded_by = p_actor
  ) then
    perform public.log_audit(
      p_incident_id, p_actor, 'USER', 'EVIDENCE_DENIED_SOD',
      jsonb_build_object('rule', 'UPLOADER_CANNOT_VERIFY')
    );
    return jsonb_build_object('ok', false, 'code', 'SOD_UPLOADER');
  end if;

  update public.attachments
     set verified_by = p_actor, verified_at = now(), is_accepted = p_accepted
   where incident_id = p_incident_id;

  if p_accepted then
    update public.incidents
       set status = 'RESOLVED', resolved_at = now(), version = version + 1
     where id = p_incident_id;

    update public.work_orders
       set status = 'DONE', completed_at = now(), version = version + 1
     where incident_id = p_incident_id
       and status in ('AWAITING_VERIFICATION', 'IN_PROGRESS', 'BLOCKED');

    perform public.log_audit(
      p_incident_id, p_actor, 'USER', 'EVIDENCE_VERIFIED',
      jsonb_build_object('reason', p_reason)
    );

    return jsonb_build_object('ok', true, 'status', 'RESOLVED');
  end if;

  update public.incidents
     set status = 'IN_PROGRESS', version = version + 1
   where id = p_incident_id;

  perform public.log_audit(
    p_incident_id, p_actor, 'USER', 'EVIDENCE_REJECTED',
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'status', 'IN_PROGRESS');
end;
$$;

-- ---------------------------------------------------------------------------
-- Nudge response: the department must answer with status, action and ETA.
-- ---------------------------------------------------------------------------
create or replace function public.log_nudge_response(
  p_incident_id uuid,
  p_actor       uuid,
  p_status      text,
  p_action      text,
  p_eta_minutes int
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inc   record;
  v_actor record;
begin
  -- SECURITY FIX
  if auth.uid() is not null and auth.uid() <> p_actor then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_MISMATCH');
  end if;

  select * into v_inc from public.incidents where id = p_incident_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INCIDENT_NOT_FOUND');
  end if;

  select * into v_actor from public.profiles where id = p_actor;
  if not found or not v_actor.is_active then
    return jsonb_build_object('ok', false, 'code', 'ACTOR_INVALID');
  end if;

  if not (
    v_actor.role = 'FACILITIES_ADMIN'
    or (v_actor.role = 'DEPARTMENT_MANAGER' and v_actor.department_id = v_inc.department_id)
  ) then
    return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_AUTHORIZED');
  end if;

  perform public.log_audit(
    p_incident_id, p_actor, 'USER', 'NUDGE_RESPONSE',
    jsonb_build_object('status', p_status, 'action', p_action, 'eta_minutes', p_eta_minutes)
  );

  insert into public.notifications
    (incident_id, recipient_id, channel, template, payload, dedupe_key)
  values (
    p_incident_id,
    (select id from public.profiles where role = 'FACILITIES_ADMIN' and is_active order by created_at limit 1),
    'IN_APP', 'NUDGE_RESPONSE_RECEIVED',
    jsonb_build_object('status', p_status, 'action', p_action, 'eta_minutes', p_eta_minutes,
                       'by', v_actor.full_name),
    'nudge-response:' || p_incident_id::text || ':' || extract(epoch from now())::text
  )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.transition_work_order(uuid, work_order_status, uuid, text) to authenticated;
grant execute on function public.approve_purchase(uuid, uuid, approval_status, text) to authenticated;
grant execute on function public.verify_evidence(uuid, uuid, boolean, text) to authenticated;
grant execute on function public.log_nudge_response(uuid, uuid, text, text, int) to authenticated;
