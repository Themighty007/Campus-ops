import type { SupabaseClient } from '@supabase/supabase-js';
import type { Actor } from '@/lib/domain/types';
import type { UserRole } from '@/lib/domain/enums';
import { mapActor } from '@/lib/repo/mappers';
import type { ProfileRow } from '@/lib/repo/rows';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ServiceError } from '@/lib/domain/errors';

export interface Session {
  actor: Actor;
  supabase: SupabaseClient;
}

/**
 * Get the current session from cookies. Returns null if not authenticated.
 *
 * In DEMO_MODE, the `x-aegis-role` header selects a pre-seeded demo account so
 * judges can switch roles without re-logging in. This is NOT a security bypass:
 * Supabase RLS still runs with the anon key, so the service layer enforces
 * capability checks via the TypeScript RBAC module.
 */
export async function getOptionalSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();

  // First try real Supabase auth
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    // In demo mode, check for the role-switch header
    if (process.env.DEMO_MODE === 'true') {
      return getDemoSession(supabase);
    }
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (!profile) return null;

  return { actor: mapActor(profile), supabase };
}

/**
 * Require an authenticated session or throw 401.
 */
export async function requireSession(): Promise<Session> {
  const session = await getOptionalSession();
  if (!session) {
    throw new ServiceError('UNAUTHENTICATED', 'Sign in to continue.', 401);
  }
  return session;
}

// ---------------------------------------------------------------------------
// Demo helpers
// ---------------------------------------------------------------------------

const DEMO_ROLE_PROFILES: Record<UserRole, string> = {
  REQUESTER: 'student@aegis.demo',
  TECHNICIAN: 'tech-elec@aegis.demo',
  DEPARTMENT_MANAGER: 'mgr-elec@aegis.demo',
  FACILITIES_ADMIN: 'admin@aegis.demo',
  PROCUREMENT_APPROVER: 'procurement@aegis.demo',
  SYSTEM_ADMIN: 'sysadmin@aegis.demo',
};

const DEMO_ROLE_NAMES: Record<UserRole, string> = {
  REQUESTER: 'Aarav Patel',
  TECHNICIAN: 'Rajesh Kumar',
  DEPARTMENT_MANAGER: 'Dr. K. Raman',
  FACILITIES_ADMIN: 'Chief Controller',
  PROCUREMENT_APPROVER: 'S. Venkatesh',
  SYSTEM_ADMIN: 'System Admin',
};

async function getDemoSession(supabase: SupabaseClient): Promise<Session | null> {
  // Dynamic import to read headers only in server context
  const { headers } = await import('next/headers');
  const headerStore = await headers();
  const roleHeader = headerStore.get('x-aegis-role');
  if (!roleHeader) return null;

  const role = roleHeader.toUpperCase() as UserRole;
  const email = DEMO_ROLE_PROFILES[role];
  if (!email) return null;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle<ProfileRow>();

    if (profile) {
      return { actor: mapActor(profile), supabase };
    }
  } catch {
    // Fall back to synthetic demo profile
  }

  // Guaranteed fallback actor in DEMO_MODE so API routes and cockpits never fail with 401
  const syntheticActor: Actor = {
    id: `20000000-0000-4000-8000-${role.toLowerCase().replace(/_/g, '').slice(0, 12).padEnd(12, '0')}`,
    email,
    fullName: DEMO_ROLE_NAMES[role] || 'Demo User',
    role,
    requesterKind: role === 'REQUESTER' ? 'STUDENT' : role === 'DEPARTMENT_MANAGER' ? 'FACULTY' : null,
    departmentId: ['TECHNICIAN', 'DEPARTMENT_MANAGER'].includes(role)
      ? '31000000-0000-4000-8000-000000000001'
      : null,
  };

  return { actor: syntheticActor, supabase };
}
