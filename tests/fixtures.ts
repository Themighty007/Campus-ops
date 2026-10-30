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
import type { PlannerInput } from '@/lib/engine/planner';

/**
 * An in-memory copy of the seeded demo scenario.
 *
 * These fixtures are deliberately *not* imported from the seed SQL: a test that
 * reads the same source as the thing it checks proves nothing. They are a
 * second, independent transcription of the campus in
 * `supabase/migrations/0012_seed.sql`. If the two drift, one of them is wrong,
 * and `tests/planner.spec.ts` will say which rooms the planner accepts.
 *
 * Local time is used because the planner compares activity windows against
 * each room's opening hours.
 */
export const NOW = new Date(2026, 2, 2, 9, 0, 0, 0);

export function at(minutesFromNow: number): Date {
  return new Date(NOW.getTime() + minutesFromNow * 60_000);
}

export const IDS = {
  room: {
    b204: 'room-b204',
    audA: 'room-aud-a',
    libHall: 'room-lib-hall',
    nsc1: 'room-nsc-1',
    centAud: 'room-cent-aud',
    semHall: 'room-sem-hall',
    oat: 'room-oat',
    b101: 'room-b101',
    b102: 'room-b102',
    lab3: 'room-lab-3',
    lab4: 'room-lab-4',
    c301: 'room-c301',
    c302: 'room-c302',
    ws1: 'room-ws-1',
  },
  part: {
    mcb32: 'part-mcb-32a',
    mcb16: 'part-mcb-16a',
    sfp1g: 'part-sfp-1g',
    apSpare: 'part-ap-spare',
    paPortable: 'part-pa-portable',
    cat6: 'part-cat6',
    projectorSpare: 'part-projector-spare',
  },
  activity: {
    exam: 'activity-exam',
    placement: 'activity-placement',
    lab: 'activity-lab',
    lecture: 'activity-lecture',
  },
  incident: 'incident-0001',
  asset: 'asset-e12',
  workOrder: 'work-order-0001',
  department: 'dept-elec',
  staff: {
    meera: 'staff-meera',
    arjun: 'staff-arjun',
    priya: 'staff-priya',
    rohan: 'staff-rohan',
    sunita: 'staff-sunita',
    nikhil: 'staff-nikhil',
    deepa: 'staff-deepa',
    imran: 'staff-imran',
    ravi: 'staff-ravi',
    nisha: 'staff-nisha',
    farhan: 'staff-farhan',
    suresh: 'staff-suresh',
    kavita: 'staff-kavita',
    ananya: 'staff-ananya',
    vikram: 'staff-vikram',
  },
} as const;

/** The exam starts 40 minutes from now and runs for two hours. */
export const EXAM_START = at(40);
export const EXAM_END = at(160);

function makeRoom(args: {
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
  isAvailable?: boolean;
}): Room {
  return {
    id: args.id,
    building: args.building,
    floor: args.floor,
    code: args.code,
    name: args.name,
    kind: args.kind,
    capacity: args.capacity,
    isAccessible: args.isAccessible,
    capabilities: args.capabilities,
    setupLeadMinutes: args.setupLeadMinutes,
    opensAt: '07:00',
    closesAt: '21:00',
    isAvailable: args.isAvailable ?? true,
    unavailableReason: null,
    qrToken: args.code.toLowerCase().replace(/[^a-z0-9]/g, '-'),
  };
}

export const rooms: Room[] = [
  makeRoom({
    id: IDS.room.b204,
    building: 'B Block',
    floor: 2,
    code: 'B-204',
    name: 'Lecture Theatre B-204',
    kind: 'LECTURE_HALL',
    capacity: 200,
    isAccessible: true,
    capabilities: ['PROJECTOR'],
    setupLeadMinutes: 0,
  }),
  makeRoom({
    id: IDS.room.audA,
    building: 'Main Block',
    floor: 0,
    code: 'AUD-A',
    name: 'Auditorium A',
    kind: 'AUDITORIUM',
    capacity: 300,
    isAccessible: true,
    capabilities: ['PROJECTOR', 'PA', 'ACCESSIBLE'],
    setupLeadMinutes: 4,
  }),
  makeRoom({
    id: IDS.room.libHall,
    building: 'Library',
    floor: 1,
    code: 'LIB-HALL',
    name: 'Library Hall',
    kind: 'HALL',
    capacity: 220,
    isAccessible: true,
    capabilities: ['PROJECTOR', 'PA'],
    setupLeadMinutes: 6,
  }),
  makeRoom({
    id: IDS.room.nsc1,
    building: 'Main Block',
    floor: 1,
    code: 'NSC-1',
    name: 'New Seminar Complex',
    kind: 'HALL',
    capacity: 200,
    isAccessible: true,
    capabilities: ['PROJECTOR', 'PA'],
    setupLeadMinutes: 20,
  }),
  makeRoom({
    id: IDS.room.centAud,
    building: 'North Campus',
    floor: 0,
    code: 'CENT-AUD',
    name: 'Central Auditorium',
    kind: 'AUDITORIUM',
    capacity: 400,
    isAccessible: true,
    capabilities: ['PROJECTOR', 'PA', 'ACCESSIBLE'],
    // Deliberately longer than the 40 minutes available.
    setupLeadMinutes: 45,
  }),
  makeRoom({
    id: IDS.room.semHall,
    building: 'B Block',
    floor: 1,
    code: 'SEM-HALL',
    name: 'Seminar Hall',
    kind: 'HALL',
    capacity: 120,
    isAccessible: false,
    capabilities: ['PROJECTOR'],
    setupLeadMinutes: 5,
  }),
  makeRoom({
    id: IDS.room.oat,
    building: 'Grounds',
    floor: 0,
    code: 'OAT',
    name: 'Open Air Theatre',
    kind: 'OUTDOOR',
    capacity: 250,
    isAccessible: true,
    // No projector: fails the exam's capability requirement.
    capabilities: ['PA'],
    setupLeadMinutes: 15,
  }),
  makeRoom({
    id: IDS.room.b101,
    building: 'B Block',
    floor: 1,
    code: 'B-101',
    name: 'Classroom B-101',
    kind: 'CLASSROOM',
    capacity: 90,
    isAccessible: true,
    capabilities: ['PROJECTOR'],
    setupLeadMinutes: 3,
  }),
  makeRoom({
    id: IDS.room.b102,
    building: 'B Block',
    floor: 1,
    code: 'B-102',
    name: 'Classroom B-102',
    kind: 'CLASSROOM',
    capacity: 90,
    isAccessible: true,
    capabilities: ['PROJECTOR'],
    setupLeadMinutes: 3,
  }),
  makeRoom({
    id: IDS.room.lab3,
    building: 'Engineering Block',
    floor: 2,
    code: 'LAB-3',
    name: 'Network Lab 3',
    kind: 'LAB',
    capacity: 40,
    isAccessible: true,
    capabilities: ['NETWORK', 'PROJECTOR'],
    setupLeadMinutes: 2,
  }),
  makeRoom({
    id: IDS.room.lab4,
    building: 'Engineering Block',
    floor: 2,
    code: 'LAB-4',
    name: 'Network Lab 4',
    kind: 'LAB',
    capacity: 40,
    isAccessible: true,
    capabilities: ['NETWORK', 'PROJECTOR'],
    setupLeadMinutes: 2,
  }),
  makeRoom({
    id: IDS.room.c301,
    building: 'C Block',
    floor: 3,
    code: 'C-301',
    name: 'Classroom C-301',
    kind: 'CLASSROOM',
    capacity: 60,
    isAccessible: true,
    capabilities: ['PROJECTOR'],
    setupLeadMinutes: 3,
  }),
  makeRoom({
    id: IDS.room.c302,
    building: 'C Block',
    floor: 3,
    code: 'C-302',
    name: 'Classroom C-302',
    kind: 'CLASSROOM',
    capacity: 60,
    isAccessible: true,
    capabilities: ['PROJECTOR'],
    setupLeadMinutes: 3,
  }),
  makeRoom({
    id: IDS.room.ws1,
    building: 'Workshop',
    floor: 0,
    code: 'WS-1',
    name: 'Workshop',
    kind: 'WORKSHOP',
    capacity: 30,
    isAccessible: false,
    capabilities: [],
    setupLeadMinutes: 5,
  }),
];

export const parts: Part[] = [
  {
    id: IDS.part.mcb32,
    sku: 'MCB-32A',
    name: '32A Miniature Circuit Breaker',
    unit: 'unit',
    qtyAvailable: 0,
    qtyReserved: 0,
    unitCost: 4800,
    storeLocation: 'Store A',
    reorderLevel: 2,
    isEquipment: false,
  },
  {
    id: IDS.part.mcb16,
    sku: 'MCB-16A',
    name: '16A Miniature Circuit Breaker',
    unit: 'unit',
    qtyAvailable: 6,
    qtyReserved: 0,
    unitCost: 2200,
    storeLocation: 'Store A',
    reorderLevel: 2,
    isEquipment: false,
  },
  {
    id: IDS.part.sfp1g,
    sku: 'SFP-1G',
    name: '1G SFP Fibre Module',
    unit: 'unit',
    qtyAvailable: 0,
    qtyReserved: 0,
    unitCost: 18500,
    storeLocation: 'Store B',
    reorderLevel: 2,
    isEquipment: false,
  },
  {
    id: IDS.part.apSpare,
    sku: 'AP-SPARE',
    name: 'Spare Wi-Fi Access Point',
    unit: 'unit',
    qtyAvailable: 4,
    qtyReserved: 0,
    unitCost: 12000,
    storeLocation: 'Store B',
    reorderLevel: 1,
    isEquipment: true,
  },
  {
    id: IDS.part.paPortable,
    sku: 'PA-PORTABLE',
    name: 'Portable PA System',
    unit: 'unit',
    qtyAvailable: 2,
    qtyReserved: 0,
    unitCost: 25000,
    storeLocation: 'AV Room',
    reorderLevel: 1,
    isEquipment: true,
  },
  {
    id: IDS.part.cat6,
    sku: 'CABLE-CAT6',
    name: 'CAT6 Cable (per metre)',
    unit: 'm',
    qtyAvailable: 50,
    qtyReserved: 0,
    unitCost: 450,
    storeLocation: 'Store B',
    reorderLevel: 20,
    isEquipment: false,
  },
  {
    id: IDS.part.projectorSpare,
    sku: 'PROJECTOR-SPARE',
    name: 'Spare Projector',
    unit: 'unit',
    qtyAvailable: 1,
    qtyReserved: 0,
    unitCost: 45000,
    storeLocation: 'AV Room',
    reorderLevel: 1,
    isEquipment: true,
  },
];

export const asset: Asset = {
  id: IDS.asset,
  parentAssetId: null,
  roomId: IDS.room.b204,
  code: 'E-12',
  name: 'Electrical Panel E-12',
  kind: 'PANEL',
  criticality: 5,
  status: 'FAILED',
  requiredPartId: IDS.part.mcb32,
};

export const activities: Activity[] = [
  {
    id: IDS.activity.exam,
    kind: 'EXAM',
    title: 'Data Structures — End Semester Exam',
    courseCode: 'CS-204',
    roomId: IDS.room.b204,
    startsAt: EXAM_START,
    endsAt: EXAM_END,
    headcount: 180,
    requiredCapabilities: ['PROJECTOR'],
    minStaff: 4,
    requiredSkill: 'INVIGILATE',
    status: 'SCHEDULED',
  },
  {
    id: IDS.activity.placement,
    kind: 'EVENT',
    title: 'Placement Drive — Day 1',
    courseCode: null,
    roomId: IDS.room.audA,
    startsAt: EXAM_START,
    endsAt: EXAM_END,
    headcount: 120,
    requiredCapabilities: ['PA'],
    minStaff: 2,
    requiredSkill: null,
    status: 'SCHEDULED',
  },
  {
    id: IDS.activity.lab,
    kind: 'LAB',
    title: 'Computer Networks — Lab',
    courseCode: 'CS-311',
    roomId: IDS.room.lab3,
    startsAt: EXAM_START,
    endsAt: EXAM_END,
    headcount: 38,
    requiredCapabilities: ['NETWORK'],
    minStaff: 1,
    requiredSkill: null,
    status: 'SCHEDULED',
  },
  {
    id: IDS.activity.lecture,
    kind: 'LECTURE',
    title: 'Thermodynamics',
    courseCode: 'ME-201',
    roomId: IDS.room.c301,
    startsAt: EXAM_START,
    endsAt: EXAM_END,
    headcount: 55,
    requiredCapabilities: ['PROJECTOR'],
    minStaff: 1,
    requiredSkill: null,
    status: 'SCHEDULED',
  },
];

export const bookings: Booking[] = [
  {
    id: 'booking-exam',
    roomId: IDS.room.b204,
    activityId: IDS.activity.exam,
    title: 'Data Structures — End Semester Exam',
    startsAt: EXAM_START,
    endsAt: EXAM_END,
    status: 'ACTIVE',
    version: 1,
  },
  {
    id: 'booking-placement',
    roomId: IDS.room.audA,
    activityId: IDS.activity.placement,
    title: 'Placement Drive — Day 1',
    startsAt: EXAM_START,
    endsAt: EXAM_END,
    status: 'ACTIVE',
    version: 1,
  },
  {
    id: 'booking-lab',
    roomId: IDS.room.lab3,
    activityId: IDS.activity.lab,
    title: 'Computer Networks — Lab',
    startsAt: EXAM_START,
    endsAt: EXAM_END,
    status: 'ACTIVE',
    version: 1,
  },
  {
    id: 'booking-lecture',
    roomId: IDS.room.c301,
    activityId: IDS.activity.lecture,
    title: 'Thermodynamics',
    startsAt: EXAM_START,
    endsAt: EXAM_END,
    status: 'ACTIVE',
    version: 1,
  },
];

const FULL_SHIFT = { startsAt: at(-120), endsAt: at(480) };

function staff(args: {
  id: string;
  fullName: string;
  role: StaffMember['role'];
  skills: string[];
  shifts?: StaffMember['shifts'];
  busyWindows?: StaffMember['busyWindows'];
  openWorkOrders?: number;
}): StaffMember {
  return {
    id: args.id,
    fullName: args.fullName,
    role: args.role,
    departmentId: IDS.department,
    skills: args.skills,
    shifts: args.shifts ?? [FULL_SHIFT],
    busyActivityIds: (args.busyWindows ?? []).map((w) => w.activityId),
    busyWindows: args.busyWindows ?? [],
    openWorkOrders: args.openWorkOrders ?? 0,
  };
}

const window = (activityId: string) => ({
  activityId,
  startsAt: EXAM_START,
  endsAt: EXAM_END,
});

export const staffMembers: StaffMember[] = [
  staff({ id: IDS.staff.meera, fullName: 'Dr. Meera Iyer', role: 'REQUESTER', skills: ['INVIGILATE'] }),
  staff({ id: IDS.staff.arjun, fullName: 'Arjun Rao', role: 'REQUESTER', skills: ['INVIGILATE'] }),
  staff({ id: IDS.staff.priya, fullName: 'Priya Nair', role: 'REQUESTER', skills: ['INVIGILATE'] }),
  // Rohan's shift ends 30 minutes into the exam: the forced deficit.
  staff({
    id: IDS.staff.rohan,
    fullName: 'Rohan Das',
    role: 'REQUESTER',
    skills: ['INVIGILATE'],
    shifts: [{ startsAt: at(-120), endsAt: at(30) }],
  }),
  staff({ id: IDS.staff.sunita, fullName: 'Sunita Verma', role: 'REQUESTER', skills: ['INVIGILATE'] }),
  staff({
    id: IDS.staff.nikhil,
    fullName: 'Nikhil Menon',
    role: 'REQUESTER',
    skills: ['INVIGILATE'],
    busyWindows: [window(IDS.activity.placement)],
  }),
  staff({
    id: IDS.staff.deepa,
    fullName: 'Deepa Krishnan',
    role: 'REQUESTER',
    skills: ['INVIGILATE'],
    busyWindows: [window(IDS.activity.lab)],
  }),
  staff({
    id: IDS.staff.imran,
    fullName: 'Imran Sheikh',
    role: 'REQUESTER',
    skills: ['INVIGILATE'],
    busyWindows: [window(IDS.activity.lecture)],
  }),
  staff({ id: IDS.staff.ravi, fullName: 'Ravi Kumar', role: 'TECHNICIAN', skills: ['ELECTRICAL'], openWorkOrders: 1 }),
  staff({ id: IDS.staff.nisha, fullName: 'Nisha Pillai', role: 'TECHNICIAN', skills: ['NETWORK'] }),
  staff({ id: IDS.staff.farhan, fullName: 'Farhan Ali', role: 'TECHNICIAN', skills: ['NETWORK'] }),
  staff({ id: IDS.staff.suresh, fullName: 'Suresh Patil', role: 'DEPARTMENT_MANAGER', skills: ['ELECTRICAL'] }),
  staff({ id: IDS.staff.kavita, fullName: 'Kavita Rao', role: 'DEPARTMENT_MANAGER', skills: ['NETWORK'] }),
  staff({ id: IDS.staff.ananya, fullName: 'Ananya Menon', role: 'FACILITIES_ADMIN', skills: [] }),
  staff({ id: IDS.staff.vikram, fullName: 'Vikram Shetty', role: 'PROCUREMENT_APPROVER', skills: [] }),
];

export const activityStaff: Record<string, string[]> = {
  [IDS.activity.exam]: [IDS.staff.meera, IDS.staff.arjun, IDS.staff.priya, IDS.staff.rohan],
  [IDS.activity.placement]: [IDS.staff.nikhil],
  [IDS.activity.lab]: [IDS.staff.deepa],
  [IDS.activity.lecture]: [IDS.staff.imran],
};

export const incident: Incident = {
  id: IDS.incident,
  code: 'INC-0001',
  category: 'ELECTRICAL',
  subtype: 'power',
  severity: 'P1',
  status: 'TRIAGED',
  continuityStatus: 'AT_RISK',
  roomId: IDS.room.b204,
  assetId: IDS.asset,
  departmentId: IDS.department,
  reporterId: IDS.staff.meera,
  summary: 'B-204: power failure, lights out, exam starts in 40 minutes.',
  isSafety: false,
  slaDueAt: at(60),
  activityDeadlineAt: EXAM_START,
  createdAt: NOW,
  version: 1,
};

export const workOrder: WorkOrder = {
  id: IDS.workOrder,
  code: 'WO-05000',
  incidentId: IDS.incident,
  departmentId: IDS.department,
  assigneeId: IDS.staff.ravi,
  status: 'BLOCKED',
  blockedReason: 'Required part MCB-32A is out of stock; procurement needed.',
  requiredSkill: 'ELECTRICAL',
  notes: null,
  version: 1,
};

/** The full planner input for the seeded scenario. */
export function buildPlannerInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    incident,
    now: NOW,
    failedRoomId: IDS.room.b204,
    activityDeadline: EXAM_START,
    activities,
    rooms,
    bookings,
    staff: staffMembers,
    activityStaff,
    parts,
    approvers: [
      { id: IDS.staff.ananya, role: 'FACILITIES_ADMIN' },
      { id: IDS.staff.suresh, role: 'DEPARTMENT_MANAGER' },
    ],
    workOrder,
    requiredPartId: IDS.part.mcb32,
    requiredPartQty: 1,
    spareEquipmentPartId: null,
    spareEquipmentQty: 0,
    reporterId: IDS.staff.meera,
    ...overrides,
  };
}
