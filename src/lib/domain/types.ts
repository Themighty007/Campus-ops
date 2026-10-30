import type {
  ActivityKind,
  ActivityStatus,
  ApprovalStatus,
  BookingStatus,
  ContinuityStatus,
  EvidenceKind,
  IncidentCategory,
  IncidentStatus,
  NotificationChannel,
  NotificationStatus,
  PlanActionKind,
  PlanStatus,
  PurchaseStatus,
  ReportSource,
  RequesterKind,
  Severity,
  UserRole,
  WorkOrderStatus,
} from './enums';

export interface Actor {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: string | null;
  requesterKind: RequesterKind | null;
}

export interface Room {
  id: string;
  building: string;
  floor: number;
  code: string;
  name: string;
  kind: string;
  capacity: number;
  isAccessible: boolean;
  capabilities: string[];
  setupLeadMinutes: number;
  opensAt: string;
  closesAt: string;
  isAvailable: boolean;
  unavailableReason: string | null;
  qrToken: string;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  unit: string;
  qtyAvailable: number;
  qtyReserved: number;
  unitCost: number;
  storeLocation: string | null;
  reorderLevel: number;
  isEquipment: boolean;
}

export interface Asset {
  id: string;
  parentAssetId: string | null;
  roomId: string | null;
  code: string;
  name: string;
  kind: string;
  criticality: number;
  status: string;
  requiredPartId: string | null;
}

export interface Shift {
  startsAt: Date;
  endsAt: Date;
}

export interface StaffMember {
  id: string;
  fullName: string;
  role: UserRole;
  departmentId: string | null;
  skills: string[];
  shifts: Shift[];
  /** Activities this person is already committed to. */
  busyActivityIds: string[];
  /** The windows of those commitments, used to detect real clashes. */
  busyWindows: Array<{ activityId: string; startsAt: Date; endsAt: Date }>;
  openWorkOrders: number;
}

export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  courseCode: string | null;
  roomId: string;
  startsAt: Date;
  endsAt: Date;
  headcount: number;
  requiredCapabilities: string[];
  minStaff: number;
  requiredSkill: string | null;
  status: ActivityStatus;
}

export interface Booking {
  id: string;
  roomId: string;
  activityId: string | null;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  version: number;
}

export interface Incident {
  id: string;
  code: string;
  category: IncidentCategory;
  subtype: string | null;
  severity: Severity;
  status: IncidentStatus;
  continuityStatus: ContinuityStatus;
  roomId: string | null;
  assetId: string | null;
  departmentId: string | null;
  reporterId: string | null;
  summary: string;
  isSafety: boolean;
  slaDueAt: Date | null;
  activityDeadlineAt: Date | null;
  createdAt: Date;
  version: number;
}

export interface WorkOrder {
  id: string;
  code: string;
  incidentId: string;
  departmentId: string;
  assigneeId: string | null;
  status: WorkOrderStatus;
  blockedReason: string | null;
  requiredSkill: string | null;
  notes: string | null;
  version: number;
}

export interface PurchaseRequest {
  id: string;
  code: string;
  incidentId: string | null;
  workOrderId: string | null;
  partId: string | null;
  qty: number;
  amount: number;
  status: PurchaseStatus;
  requestedBy: string | null;
  approvedBy: string | null;
  reason: string | null;
}

export interface Attachment {
  id: string;
  incidentId: string;
  workOrderId: string | null;
  kind: EvidenceKind;
  storagePath: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  uploadedBy: string | null;
  createdAt: Date;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  isAccepted: boolean | null;
}

export interface NotificationRow {
  id: string;
  incidentId: string | null;
  recipientId: string | null;
  recipientAddress: string | null;
  channel: NotificationChannel;
  template: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  providerId: string | null;
  dedupeKey: string | null;
  attempts: number;
  lastError: string | null;
}

export interface AuditEvent {
  id: number;
  incidentId: string | null;
  actorId: string | null;
  actorKind: 'USER' | 'SYSTEM' | 'AI';
  action: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Recovery plans
// ---------------------------------------------------------------------------

export type PlanAction =
  | { kind: 'RELOCATE_ACTIVITY'; activityId: string; toRoomId: string; toRoomCode: string }
  | {
      kind: 'SPLIT_ACTIVITY';
      activityId: string;
      parts: Array<{ roomId: string; roomCode: string; headcount: number }>;
    }
  | {
      kind: 'REASSIGN_STAFF';
      staffId: string;
      staffName: string;
      role: string;
      activityId?: string;
      replaceStaffId?: string;
      workOrderId?: string;
    }
  | { kind: 'RESERVE_PART'; partId: string; sku: string; qty: number; workOrderId?: string }
  | { kind: 'RESERVE_EQUIPMENT'; partId: string; sku: string; qty: number }
  | { kind: 'SERVICE_WORKAROUND'; note: string }
  | { kind: 'PROCURE_PART'; partId: string; sku: string; qty: number; amount: number };

export interface ConstraintCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  /** True when a failure makes the plan infeasible rather than merely risky. */
  blocking: boolean;
}

export interface ScoreFactors {
  time: number;
  changes: number;
  cost: number;
  disruption: number;
}

export interface RecoveryPlan {
  id: string;
  incidentId: string;
  version: number;
  label: string;
  status: PlanStatus;
  actions: PlanAction[];
  checks: ConstraintCheck[];
  score: number;
  factors: ScoreFactors;
  resourceSnapshot: ResourceSnapshot;
  requiredRoles: UserRole[];
  createdBy: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  executedAt: Date | null;
  rejectionReason: string | null;
}

export interface ResourceSnapshot {
  roomIds: string[];
  activityIds: string[];
  partIds: string[];
  bookingIds: string[];
  bookingVersions: Record<string, number>;
  partFreeQty: Record<string, number>;
  workOrderId?: string;
  workOrderVersion?: number;
}

export interface Approval {
  id: string;
  subjectType: 'RECOVERY_PLAN' | 'PURCHASE_REQUEST' | 'EVIDENCE';
  subjectId: string;
  planId: string | null;
  requiredRole: UserRole;
  requestedBy: string | null;
  decidedBy: string | null;
  status: ApprovalStatus;
  reason: string | null;
  planVersion: number | null;
  createdAt: Date;
  decidedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Blast radius
// ---------------------------------------------------------------------------

export interface BlastRadius {
  incidentId: string;
  room: Room | null;
  asset: Asset | null;
  activities: Activity[];
  bookings: Booking[];
  cohorts: Array<{ activityId: string; label: string; headcount: number }>;
  assignedStaff: StaffMember[];
  affectedPeople: number;
  requiredSkill: string | null;
  requiredPart: Part | null;
  workOrder: WorkOrder | null;
  earliestDeadline: Date | null;
}

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

export interface Report {
  id: string;
  incidentId: string | null;
  source: ReportSource;
  rawText: string;
  reporterId: string | null;
  reporterLabel: string | null;
  roomHint: string | null;
  assetHint: string | null;
  extraction: Extraction | null;
  extractionSource: 'AI' | 'FALLBACK' | 'NONE';
  confidence: number | null;
  matchKind: string | null;
  matchScore: number | null;
  createdAt: Date;
}

export interface Extraction {
  category: IncidentCategory;
  subtype: string | null;
  buildingHint: string | null;
  roomHint: string | null;
  assetHint: string | null;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  isSafetyRisk: boolean;
  affectedActivity: 'EXAM' | 'CLASS' | 'LAB' | 'EVENT' | 'NONE' | 'UNKNOWN';
  deadlineHintMinutes: number | null;
  missingFields: string[];
  clarifyingQuestion: string | null;
  summary: string;
  confidence: number;
  spans: Array<{ field: string; text: string; start: number; end: number }>;
}
