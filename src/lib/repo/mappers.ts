import type {
  Activity,
  Actor,
  Approval,
  Asset,
  Attachment,
  AuditEvent,
  BlastRadius,
  Booking,
  ConstraintCheck,
  Extraction,
  Incident,
  NotificationRow,
  Part,
  PlanAction,
  PurchaseRequest,
  RecoveryPlan,
  Report,
  ResourceSnapshot,
  Room,
  ScoreFactors,
  Shift,
  StaffMember,
  WorkOrder,
} from '@/lib/domain/types';
import type {
  ActivityRow,
  ApprovalRow,
  AssetRow,
  AttachmentRow,
  AuditRow,
  BookingRow,
  IncidentRow,
  NotificationRowDb,
  PartRow,
  PlanRow,
  ProfileRow,
  PurchaseRow,
  ReportRow,
  RoomRow,
  StaffShiftRow,
  StaffSkillRow,
  WorkOrderRow,
} from './rows';

export function mapActor(row: ProfileRow): Actor {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    departmentId: row.department_id,
    requesterKind: row.requester_kind,
  };
}

export function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    building: row.building,
    floor: row.floor,
    code: row.code,
    name: row.name,
    kind: row.kind,
    capacity: row.capacity,
    isAccessible: row.is_accessible,
    capabilities: row.capabilities ?? [],
    setupLeadMinutes: row.setup_lead_minutes,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    isAvailable: row.is_available,
    unavailableReason: row.unavailable_reason,
    qrToken: row.qr_token,
  };
}

export function mapPart(row: PartRow): Part {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    unit: row.unit,
    qtyAvailable: row.qty_available,
    qtyReserved: row.qty_reserved,
    unitCost: Number(row.unit_cost),
    storeLocation: row.store_location,
    reorderLevel: row.reorder_level,
    isEquipment: row.is_equipment,
  };
}

export function mapAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    parentAssetId: row.parent_asset_id,
    roomId: row.room_id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    criticality: row.criticality,
    status: row.status,
    requiredPartId: row.required_part_id,
  };
}

export function mapActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    courseCode: row.course_code,
    roomId: row.room_id,
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    headcount: row.headcount,
    requiredCapabilities: row.required_capabilities ?? [],
    minStaff: row.min_staff,
    requiredSkill: row.required_skill,
    status: row.status,
  };
}

export function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    roomId: row.room_id,
    activityId: row.activity_id,
    title: row.title,
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    status: row.status,
    version: row.version,
  };
}

export function mapIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    code: row.code,
    category: row.category,
    subtype: row.subtype,
    severity: row.severity,
    status: row.status,
    continuityStatus: row.continuity_status,
    roomId: row.room_id,
    assetId: row.asset_id,
    departmentId: row.department_id,
    reporterId: row.reporter_id,
    summary: row.summary,
    isSafety: row.is_safety,
    slaDueAt: row.sla_due_at ? new Date(row.sla_due_at) : null,
    activityDeadlineAt: row.activity_deadline_at ? new Date(row.activity_deadline_at) : null,
    createdAt: new Date(row.created_at),
    version: row.version,
  };
}

export function mapWorkOrder(row: WorkOrderRow): WorkOrder {
  return {
    id: row.id,
    code: row.code,
    incidentId: row.incident_id,
    departmentId: row.department_id,
    assigneeId: row.assignee_id,
    status: row.status,
    blockedReason: row.blocked_reason,
    requiredSkill: row.required_skill,
    notes: row.notes,
    version: row.version,
  };
}

export function mapPlan(row: PlanRow): RecoveryPlan {
  return {
    id: row.id,
    incidentId: row.incident_id,
    version: row.version,
    label: row.label,
    status: row.status,
    actions: (row.actions as PlanAction[]) ?? [],
    checks: (row.checks as ConstraintCheck[]) ?? [],
    score: Number(row.score),
    factors: (row.factors as ScoreFactors) ?? { time: 0, changes: 0, cost: 0, disruption: 0 },
    resourceSnapshot: (row.resource_snapshot as ResourceSnapshot) ?? emptySnapshot(),
    requiredRoles: row.required_roles ?? [],
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    executedAt: row.executed_at ? new Date(row.executed_at) : null,
    rejectionReason: row.rejection_reason,
  };
}

export function mapApproval(row: ApprovalRow): Approval {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    planId: row.plan_id,
    requiredRole: row.required_role,
    requestedBy: row.requested_by,
    decidedBy: row.decided_by,
    status: row.status,
    reason: row.reason,
    planVersion: row.plan_version,
    createdAt: new Date(row.created_at),
    decidedAt: row.decided_at ? new Date(row.decided_at) : null,
  };
}

export function mapAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    incidentId: row.incident_id,
    workOrderId: row.work_order_id,
    kind: row.kind,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    sha256: row.sha256,
    uploadedBy: row.uploaded_by,
    createdAt: new Date(row.created_at),
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
    isAccepted: row.is_accepted,
  };
}

export function mapPurchase(row: PurchaseRow): PurchaseRequest {
  return {
    id: row.id,
    code: row.code,
    incidentId: row.incident_id,
    workOrderId: row.work_order_id,
    partId: row.part_id,
    qty: row.qty,
    amount: Number(row.amount),
    status: row.status,
    requestedBy: row.requested_by,
    approvedBy: row.approved_by,
    reason: row.reason,
  };
}

export function mapNotification(row: NotificationRowDb): NotificationRow {
  return {
    id: row.id,
    incidentId: row.incident_id,
    recipientId: row.recipient_id,
    recipientAddress: row.recipient_address,
    channel: row.channel,
    template: row.template,
    payload: row.payload ?? {},
    status: row.status,
    providerId: row.provider_id,
    dedupeKey: row.dedupe_key,
    attempts: row.attempts,
    lastError: row.last_error,
  };
}

export function mapAudit(row: AuditRow): AuditEvent {
  return {
    id: row.id,
    incidentId: row.incident_id,
    actorId: row.actor_id,
    actorKind: row.actor_kind,
    action: row.action,
    payload: row.payload ?? {},
    createdAt: new Date(row.created_at),
  };
}

export function mapReport(row: ReportRow): Report {
  return {
    id: row.id,
    incidentId: row.incident_id,
    source: row.source,
    rawText: row.raw_text,
    reporterId: row.reporter_id,
    reporterLabel: row.reporter_label,
    roomHint: row.room_hint,
    assetHint: row.asset_hint,
    extraction: (row.extraction as Extraction | null) ?? null,
    extractionSource: row.extraction_source,
    confidence: row.confidence === null ? null : Number(row.confidence),
    matchKind: row.match_kind,
    matchScore: row.match_score === null ? null : Number(row.match_score),
    createdAt: new Date(row.created_at),
  };
}

export function mapStaff(args: {
  profile: ProfileRow;
  skills: StaffSkillRow[];
  shifts: StaffShiftRow[];
  busyWindows: Array<{ activityId: string; startsAt: Date; endsAt: Date }>;
  openWorkOrders: number;
}): StaffMember {
  const shifts: Shift[] = args.shifts.map((s) => ({
    startsAt: new Date(s.starts_at),
    endsAt: new Date(s.ends_at),
  }));

  return {
    id: args.profile.id,
    fullName: args.profile.full_name,
    role: args.profile.role,
    departmentId: args.profile.department_id,
    skills: args.skills.map((s) => s.skill),
    shifts,
    busyActivityIds: args.busyWindows.map((w) => w.activityId),
    busyWindows: args.busyWindows,
    openWorkOrders: args.openWorkOrders,
  };
}

export function mapBlastRadius(args: {
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
}): BlastRadius {
  return args;
}

function emptySnapshot(): ResourceSnapshot {
  return {
    roomIds: [],
    activityIds: [],
    partIds: [],
    bookingIds: [],
    bookingVersions: {},
    partFreeQty: {},
  };
}
