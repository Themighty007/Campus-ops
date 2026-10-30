import type {
  ActivityKind,
  ActivityStatus,
  ApprovalStatus,
  ApprovalSubject,
  AssetStatus,
  BookingStatus,
  ContinuityStatus,
  EvidenceKind,
  IncidentCategory,
  IncidentStatus,
  NotificationChannel,
  NotificationStatus,
  PlanStatus,
  PurchaseStatus,
  ReportSource,
  RequesterKind,
  Severity,
  UserRole,
  WorkOrderStatus,
} from '@/lib/domain/enums';

/**
 * Raw database rows (snake_case), exactly as PostgREST returns them.
 *
 * Keeping these separate from the domain types means a column rename is a
 * compile error in one mapper instead of a silent `undefined` at runtime.
 */

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  requester_kind: RequesterKind | null;
  department_id: string | null;
  is_active: boolean;
}

export interface DepartmentRow {
  id: string;
  code: string;
  name: string;
  manager_id: string | null;
}

export interface RoomRow {
  id: string;
  building: string;
  floor: number;
  code: string;
  name: string;
  kind: string;
  capacity: number;
  is_accessible: boolean;
  capabilities: string[];
  setup_lead_minutes: number;
  opens_at: string;
  closes_at: string;
  is_available: boolean;
  unavailable_reason: string | null;
  qr_token: string;
  version: number;
}

export interface PartRow {
  id: string;
  sku: string;
  name: string;
  unit: string;
  qty_available: number;
  qty_reserved: number;
  unit_cost: string | number;
  store_location: string | null;
  reorder_level: number;
  is_equipment: boolean;
  version: number;
}

export interface AssetRow {
  id: string;
  parent_asset_id: string | null;
  room_id: string | null;
  code: string;
  name: string;
  kind: string;
  criticality: number;
  status: AssetStatus;
  required_part_id: string | null;
}

export interface StaffSkillRow {
  profile_id: string;
  skill: string;
  level: number;
}

export interface StaffShiftRow {
  id: string;
  profile_id: string;
  starts_at: string;
  ends_at: string;
  kind: string;
}

export interface ActivityRow {
  id: string;
  kind: ActivityKind;
  title: string;
  course_code: string | null;
  room_id: string;
  starts_at: string;
  ends_at: string;
  headcount: number;
  required_capabilities: string[];
  min_staff: number;
  required_skill: string | null;
  status: ActivityStatus;
  version: number;
}

export interface ParticipantRow {
  id: string;
  activity_id: string;
  cohort_label: string;
  headcount: number;
}

export interface ActivityStaffRow {
  activity_id: string;
  profile_id: string;
  role: string;
}

export interface BookingRow {
  id: string;
  room_id: string;
  activity_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  version: number;
}

export interface IncidentRow {
  id: string;
  code: string;
  category: IncidentCategory;
  subtype: string | null;
  severity: Severity;
  status: IncidentStatus;
  continuity_status: ContinuityStatus;
  room_id: string | null;
  asset_id: string | null;
  department_id: string | null;
  reporter_id: string | null;
  summary: string;
  is_safety: boolean;
  sla_due_at: string | null;
  activity_deadline_at: string | null;
  triage_policy: string | null;
  merged_into: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderRow {
  id: string;
  code: string;
  incident_id: string;
  department_id: string;
  assignee_id: string | null;
  status: WorkOrderStatus;
  blocked_reason: string | null;
  required_skill: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface PlanRow {
  id: string;
  incident_id: string;
  version: number;
  label: string;
  status: PlanStatus;
  actions: unknown;
  checks: unknown;
  score: string | number;
  factors: unknown;
  resource_snapshot: unknown;
  required_roles: UserRole[];
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  executed_at: string | null;
  rejection_reason: string | null;
}

export interface ApprovalRow {
  id: string;
  subject_type: ApprovalSubject;
  subject_id: string;
  plan_id: string | null;
  required_role: UserRole;
  requested_by: string | null;
  decided_by: string | null;
  status: ApprovalStatus;
  reason: string | null;
  plan_version: number | null;
  snapshot: unknown;
  created_at: string;
  decided_at: string | null;
}

export interface AttachmentRow {
  id: string;
  incident_id: string;
  work_order_id: string | null;
  kind: EvidenceKind;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  uploaded_by: string | null;
  created_at: string;
  verified_by: string | null;
  verified_at: string | null;
  is_accepted: boolean | null;
}

export interface PurchaseRow {
  id: string;
  code: string;
  incident_id: string | null;
  work_order_id: string | null;
  part_id: string | null;
  qty: number;
  amount: string | number;
  status: PurchaseStatus;
  requested_by: string | null;
  approved_by: string | null;
  reason: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface NotificationRowDb {
  id: string;
  incident_id: string | null;
  recipient_id: string | null;
  recipient_address: string | null;
  channel: NotificationChannel;
  template: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  provider_id: string | null;
  dedupe_key: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface AuditRow {
  id: number;
  incident_id: string | null;
  actor_id: string | null;
  actor_kind: 'USER' | 'SYSTEM' | 'AI';
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ReportRow {
  id: string;
  incident_id: string | null;
  source: ReportSource;
  raw_text: string;
  reporter_id: string | null;
  reporter_label: string | null;
  room_hint: string | null;
  asset_hint: string | null;
  extraction: unknown;
  extraction_source: 'AI' | 'FALLBACK' | 'NONE';
  confidence: string | number | null;
  match_kind: string | null;
  match_score: string | number | null;
  external_event_id: string | null;
  created_at: string;
}

export interface ExternalEventRow {
  id: string;
  source: string;
  external_event_id: string;
  payload: Record<string, unknown>;
  received_at: string;
  processed_at: string | null;
  result: unknown;
}
