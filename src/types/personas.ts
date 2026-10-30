import type { UserRole, RequesterKind } from '@/lib/domain/enums';

export type PersonaId = 'student' | 'teacher' | 'technician' | 'superadmin' | 'inventory';

export interface PersonaProfile {
  id: PersonaId;
  name: string;
  role: UserRole;
  title: string;
  identifier: string;
  department: string;
  avatarEmoji: string;
  badgeBg: string;
  badgeBorder: string;
  subdivision: 'student' | 'management';
  description: string;
}

export const DEMO_PERSONAS: Record<PersonaId, PersonaProfile> = {
  student: {
    id: 'student',
    name: 'Aarav Patel',
    role: 'REQUESTER',
    title: 'Student (CSE Year 3)',
    identifier: 'Roll #22CS045',
    department: 'Computer Science & Engineering · Hostel Block C-302',
    avatarEmoji: '🎓',
    badgeBg: 'bg-[#FEF9C3]',
    badgeBorder: 'border-[#FDE047]',
    subdivision: 'student',
    description: 'Files disruption queries, tracks classroom relocations, and receives verified resolution receipts.',
  },
  teacher: {
    id: 'teacher',
    name: 'Dr. K. Raman',
    role: 'DEPARTMENT_MANAGER',
    title: 'Faculty & HOD Electrical Engg',
    identifier: 'Faculty ID #EE-104',
    department: 'Department of Electrical & Electronics · B-Wing Room 204',
    avatarEmoji: '👨‍🏫',
    badgeBg: 'bg-[#E0F2FE]',
    badgeBorder: 'border-[#7DD3FC]',
    subdivision: 'student',
    description: 'Monitors classroom & lab health, triggers academic priority recovery, and oversees exam continuity.',
  },
  technician: {
    id: 'technician',
    name: 'Rajesh Kumar',
    role: 'TECHNICIAN',
    title: 'Field Operations Specialist',
    identifier: 'Badge #TK-808 (HVAC & High-Voltage)',
    department: 'Central Facilities & Campus Maintenance Division',
    avatarEmoji: '🔧',
    badgeBg: 'bg-[#DCFCE7]',
    badgeBorder: 'border-[#86EFAC]',
    subdivision: 'management',
    description: 'Receives real-time work orders, updates repair stages, reserves inventory parts, and posts photo evidence.',
  },
  superadmin: {
    id: 'superadmin',
    name: 'Chief Controller',
    role: 'FACILITIES_ADMIN',
    title: 'Campus Chief Super Admin',
    identifier: 'Clearance #FAC-001 (Global Operations)',
    department: 'Global Campus Operations Command Centre',
    avatarEmoji: '🛡️',
    badgeBg: 'bg-[#FDA4AF]',
    badgeBorder: 'border-[#FB7185]',
    subdivision: 'management',
    description: 'Reviews AI recovery plans, oversees campus complaint metrics, queries technical AI chat, and executes atomic approvals.',
  },
  inventory: {
    id: 'inventory',
    name: 'S. Venkatesh',
    role: 'PROCUREMENT_APPROVER',
    title: 'Stores & Procurement Manager',
    identifier: 'Inventory Lead #INV-042',
    department: 'Central Engineering Stores & Spare Parts Procurement',
    avatarEmoji: '📦',
    badgeBg: 'bg-[#FEF9C3]',
    badgeBorder: 'border-[#FDE047]',
    subdivision: 'management',
    description: 'Manages spare breakers and cabling stocks, approves technician part reservations, and issues POs.',
  },
};
