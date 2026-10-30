import type { UserRole, RequesterKind } from '@/lib/domain/enums';

export type PersonaId = 'student' | 'teacher' | 'technician' | 'superadmin' | 'depthead' | 'inventory';

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
    description: 'Files disruption queries with photos, tracks classroom relocations, and receives verified resolution receipts.',
  },
  teacher: {
    id: 'teacher',
    name: 'Prof. Ananya Sen',
    role: 'DEPARTMENT_MANAGER',
    title: 'Senior Faculty & Exam Proctor',
    identifier: 'Faculty ID #CS-208',
    department: 'Department of Computer Science & Engineering · Academic Block 2',
    avatarEmoji: '👩‍🏫',
    badgeBg: 'bg-[#E0F2FE]',
    badgeBorder: 'border-[#7DD3FC]',
    subdivision: 'student',
    description: 'Oversees lecture halls, verifies exam continuity, and tracks student relocation alerts.',
  },
  technician: {
    id: 'technician',
    name: 'Rajesh Kumar',
    role: 'TECHNICIAN',
    title: 'Lead Field Operations Specialist',
    identifier: 'Badge #TK-808 (HVAC & High-Voltage)',
    department: 'Central Facilities & Campus Maintenance Division',
    avatarEmoji: '🔧',
    badgeBg: 'bg-[#DCFCE7]',
    badgeBorder: 'border-[#86EFAC]',
    subdivision: 'management',
    description: 'Receives real-time work orders with student photos, updates repair stages, and marks issues as resolved.',
  },
  superadmin: {
    id: 'superadmin',
    name: 'Chief Controller',
    role: 'FACILITIES_ADMIN',
    title: 'Campus Chief Super Admin',
    identifier: 'Clearance #FAC-001 (Global Command)',
    department: 'Global Campus Operations Command Centre',
    avatarEmoji: '🛡️',
    badgeBg: 'bg-[#FDA4AF]',
    badgeBorder: 'border-[#FB7185]',
    subdivision: 'management',
    description: 'Reviews incoming student photo reports, executes atomic YES/NO approvals, and oversees blast radius solver.',
  },
  depthead: {
    id: 'depthead',
    name: 'Dr. K. Raman',
    role: 'DEPARTMENT_MANAGER',
    title: 'Department Head (EEE In-Charge)',
    identifier: 'HOD ID #EE-101',
    department: 'Department of Electrical & Electronics Engineering (EEE Block)',
    avatarEmoji: '👨‍🏫',
    badgeBg: 'bg-[#FEF9C3]',
    badgeBorder: 'border-[#FDE047]',
    subdivision: 'management',
    description: 'Monitors EEE department room health, power grid status, lab equipment readiness, and faculty proctors.',
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
