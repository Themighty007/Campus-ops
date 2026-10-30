import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Activity,
  Asset,
  Booking,
  Incident,
  Part,
  Room,
  StaffMember,
  WorkOrder,
} from '@/lib/domain/types';
import type { UserRole } from '@/lib/domain/enums';
import type { PlannerInput } from '@/lib/engine/planner';
import { ENGINE } from '@/lib/engine/policy';
import {
  mapActivity,
  mapAsset,
  mapBooking,
  mapIncident,
  mapPart,
  mapRoom,
  mapStaff,
  mapWorkOrder,
} from './mappers';
import type {
  ActivityRow,
  ActivityStaffRow,
  AssetRow,
  BookingRow,
  IncidentRow,
  ParticipantRow,
  PartRow,
  ProfileRow,
  RoomRow,
  StaffShiftRow,
  StaffSkillRow,
  WorkOrderRow,
} from './rows';

export interface Cohort {
  activityId: string;
  label: string;
  headcount: number;
}

export interface PlanningContext {
  incident: Incident;
  room: Room | null;
  asset: Asset | null;
  rooms: Room[];
  activities: Activity[];
  bookings: Booking[];
  cohorts: Cohort[];
  staff: StaffMember[];
  activityStaff: Record<string, string[]>;
  parts: Part[];
  workOrder: WorkOrder | null;
  input: PlannerInput;
}

const OPEN_WORK_ORDER_STATUSES = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'BLOCKED',
  'AWAITING_PARTS',
];

const APPROVER_ROLES: UserRole[] = ['FACILITIES_ADMIN', 'DEPARTMENT_MANAGER'];

/**
 * Load everything the deterministic engine needs in one place.
 *
 * The engine itself takes plain data and never touches Supabase, which is what
 * makes it unit-testable. This module is the only bridge.
 */
export async function loadPlanningContext(
  client: SupabaseClient,
  incidentId: string,
  now: Date = new Date(),
): Promise<PlanningContext> {
  const [incidentRes, roomsRes, partsRes, assetsRes, activitiesRes, bookingsRes, participantsRes] =
    await Promise.all([
      client.from('incidents').select('*').eq('id', incidentId).maybeSingle<IncidentRow>(),
      client.from('rooms').select('*').returns<RoomRow[]>(),
      client.from('parts').select('*').returns<PartRow[]>(),
      client.from('assets').select('*').returns<AssetRow[]>(),
      client.from('scheduled_activities').select('*').returns<ActivityRow[]>(),
      client.from('room_bookings').select('*').eq('status', 'ACTIVE').returns<BookingRow[]>(),
      client
        .from('activity_participants')
        .select('*')
        .returns<ParticipantRow[]>(),
    ]);

  if (incidentRes.error) throw new Error(`load incident: ${incidentRes.error.message}`);
  if (!incidentRes.data) throw new Error(`Incident ${incidentId} not found`);
  if (roomsRes.error) throw new Error(`load rooms: ${roomsRes.error.message}`);
  if (partsRes.error) throw new Error(`load parts: ${partsRes.error.message}`);
  if (assetsRes.error) throw new Error(`load assets: ${assetsRes.error.message}`);
  if (activitiesRes.error) throw new Error(`load activities: ${activitiesRes.error.message}`);
  if (bookingsRes.error) throw new Error(`load bookings: ${bookingsRes.error.message}`);
  if (participantsRes.error) throw new Error(`load participants: ${participantsRes.error.message}`);

  const incident = mapIncident(incidentRes.data);
  const rooms = (roomsRes.data ?? []).map(mapRoom);
  const parts = (partsRes.data ?? []).map(mapPart);
  const assets = (assetsRes.data ?? []).map(mapAsset);
  const activities = (activitiesRes.data ?? []).map(mapActivity);
  const bookings = (bookingsRes.data ?? []).map(mapBooking);

  const cohorts: Cohort[] = (participantsRes.data ?? []).map((p) => ({
    activityId: p.activity_id,
    label: p.cohort_label,
    headcount: p.headcount,
  }));

  const [staffRes, skillsRes, shiftsRes, activityStaffRes, workOrdersRes] = await Promise.all([
    client.from('profiles').select('*').eq('is_active', true).returns<ProfileRow[]>(),
    client.from('staff_skills').select('*').returns<StaffSkillRow[]>(),
    client.from('staff_shifts').select('*').returns<StaffShiftRow[]>(),
    client.from('activity_staff').select('*').returns<ActivityStaffRow[]>(),
    client
      .from('work_orders')
      .select('*')
      .eq('incident_id', incidentId)
      .returns<WorkOrderRow[]>(),
  ]);

  if (staffRes.error) throw new Error(`load staff: ${staffRes.error.message}`);
  if (skillsRes.error) throw new Error(`load skills: ${skillsRes.error.message}`);
  if (shiftsRes.error) throw new Error(`load shifts: ${shiftsRes.error.message}`);
  if (activityStaffRes.error) throw new Error(`load roster: ${activityStaffRes.error.message}`);
  if (workOrdersRes.error) throw new Error(`load work orders: ${workOrdersRes.error.message}`);

  const activityStaff: Record<string, string[]> = {};
  const busyByProfile: Record<string, Array<{ activityId: string; startsAt: Date; endsAt: Date }>> =
    {};

  const activityById = new Map(activities.map((a) => [a.id, a]));

  for (const row of activityStaffRes.data ?? []) {
    (activityStaff[row.activity_id] ??= []).push(row.profile_id);

    const activity = activityById.get(row.activity_id);
    if (activity && activity.status === 'SCHEDULED') {
      (busyByProfile[row.profile_id] ??= []).push({
        activityId: activity.id,
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
      });
    }
  }

  const workOrders = (workOrdersRes.data ?? []).map(mapWorkOrder);
  const workOrder =
    workOrders.find((w) => w.status !== 'DONE' && w.status !== 'CANCELLED') ?? workOrders[0] ?? null;

  const openWorkOrderCounts: Record<string, number> = {};
  const allWorkOrdersRes = await client
    .from('work_orders')
    .select('assignee_id, status')
    .in('status', OPEN_WORK_ORDER_STATUSES)
    .returns<Array<{ assignee_id: string | null; status: string }>>();

  for (const row of allWorkOrdersRes.data ?? []) {
    if (!row.assignee_id) continue;
    openWorkOrderCounts[row.assignee_id] = (openWorkOrderCounts[row.assignee_id] ?? 0) + 1;
  }

  const skillsByProfile: Record<string, StaffSkillRow[]> = {};
  for (const row of skillsRes.data ?? []) {
    (skillsByProfile[row.profile_id] ??= []).push(row);
  }

  const shiftsByProfile: Record<string, StaffShiftRow[]> = {};
  for (const row of shiftsRes.data ?? []) {
    (shiftsByProfile[row.profile_id] ??= []).push(row);
  }

  const staff: StaffMember[] = (staffRes.data ?? [])
    .filter((p) => p.role !== 'REQUESTER' || (skillsByProfile[p.id]?.length ?? 0) > 0)
    .map((p) =>
      mapStaff({
        profile: p,
        skills: skillsByProfile[p.id] ?? [],
        shifts: shiftsByProfile[p.id] ?? [],
        busyWindows: busyByProfile[p.id] ?? [],
        openWorkOrders: openWorkOrderCounts[p.id] ?? 0,
      }),
    );

  const approvers = (staffRes.data ?? [])
    .filter((p) => APPROVER_ROLES.includes(p.role))
    .map((p) => ({ id: p.id, role: p.role }));

  const room = incident.roomId ? rooms.find((r) => r.id === incident.roomId) ?? null : null;
  const asset = incident.assetId ? assets.find((a) => a.id === incident.assetId) ?? null : null;
  const failedRoomId = incident.roomId ?? asset?.roomId ?? null;

  const atRisk = activities
    .filter((a) => a.status === 'SCHEDULED' && a.roomId === failedRoomId && a.endsAt > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const activityDeadline =
    incident.activityDeadlineAt ?? (atRisk[0]?.startsAt ?? null);

  const spare = spareEquipmentFor(incident.category, parts);

  const input: PlannerInput = {
    incident,
    now,
    failedRoomId,
    activityDeadline,
    activities,
    rooms,
    bookings,
    staff,
    activityStaff,
    parts,
    approvers,
    workOrder,
    requiredPartId: asset?.requiredPartId ?? null,
    requiredPartQty: 1,
    spareEquipmentPartId: spare?.partId ?? null,
    spareEquipmentQty: spare?.qty ?? 0,
    reporterId: incident.reporterId,
  };

  return {
    incident,
    room,
    asset,
    rooms,
    activities,
    bookings,
    cohorts,
    staff,
    activityStaff,
    parts,
    workOrder,
    input,
  };
}

/**
 * Which spare equipment can honestly be deployed for a partial workaround.
 * Returns null when no such spare exists — the planner then does not pretend.
 */
function spareEquipmentFor(
  category: Incident['category'],
  parts: Part[],
): { partId: string; qty: number } | null {
  const sku =
    category === 'NETWORK'
      ? 'AP-SPARE'
      : category === 'AV'
        ? 'PA-PORTABLE'
        : null;

  if (!sku) return null;
  const part = parts.find((p) => p.sku === sku);
  if (!part) return null;

  // One spare is enough to prove partial service. Never invent quantity.
  return { partId: part.id, qty: 1 };
}

/** Lookahead used by the command centre, exposed for the UI's "next 6 hours". */
export const PLANNING_LOOKAHEAD_MINUTES = ENGINE.lookaheadMinutes;
