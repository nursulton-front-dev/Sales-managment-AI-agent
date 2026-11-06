import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/src/db';
import { sql } from 'drizzle-orm';
import { PLATFORM_OWNER_EMAIL, isStaffRole, hasAdminPermission, type AdminRole, type AdminPermission } from './policy';

export function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)) return result.rows as T[];
  return [];
}
export async function getAdminIdentity() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.emailVerified) return null;
  const email = session.user.email.trim().toLowerCase();
  let role: AdminRole;
  if (email === PLATFORM_OWNER_EMAIL) role = 'super_admin';
  else {
    if (!db) return null;
    const record = rows<{ role: unknown }>(await db.execute(sql`
      SELECT role FROM platform_admin_access
      WHERE email = ${email} AND user_id = ${session.user.id} AND status = 'active'
    `))[0];
    if (!record || !isStaffRole(record.role)) return null;
    role = record.role;
  }
  return { userId: session.user.id, userEmail: email, userName: session.user.name, role, isSuperAdmin: role === 'super_admin' };
}
export async function adminCan(permission: AdminPermission) {
  const identity = await getAdminIdentity();
  return identity && hasAdminPermission(identity.role, permission) ? identity : null;
}
