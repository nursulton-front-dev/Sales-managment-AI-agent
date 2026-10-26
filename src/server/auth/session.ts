import { cookies, headers } from 'next/headers';
import { getWorkspaceById, getWorkspaceByEmail, getActiveSupportSession } from '@/src/db';
import type { Workspace } from '@/src/db/schema';
import { auth } from '@/lib/auth';

export const FOUNDER_SUPERADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.SUPERADMIN_EMAIL || 'maxramovnursulton1@gmail.com';
export interface UserSessionContext {
  workspace: Workspace | null; workspaceId: string | null; userEmail: string | null; userName: string | null;
  role: 'super_admin' | 'owner' | 'admin' | 'member'; isSuperAdmin: boolean; isImpersonating: boolean;
  supportSessionReason?: string;
}

export async function getServerSessionContext(explicitWorkspaceId?: string): Promise<UserSessionContext> {
  const identity = await auth.api.getSession({ headers: await headers() });
  const empty: UserSessionContext = { workspace: null, workspaceId: null, userEmail: null, userName: null, role: 'member', isSuperAdmin: false, isImpersonating: false };
  if (!identity) return empty;
  const email = identity.user.email.toLowerCase();
  const isSuperAdmin = identity.user.emailVerified && email === FOUNDER_SUPERADMIN_EMAIL.toLowerCase();
  const owned = await getWorkspaceByEmail(email);
  const targetId = explicitWorkspaceId || (await cookies()).get('ai_os_workspace_id')?.value;
  let workspace = owned;
  let isImpersonating = false;
  let supportSessionReason: string | undefined;
  if (targetId && targetId !== owned?.id) {
    if (!isSuperAdmin) return empty;
    const support = await getActiveSupportSession(targetId);
    if (!support || support.superAdminEmail.toLowerCase() !== email || Date.now() - new Date(support.startedAt).getTime() > 2 * 3600000) return empty;
    workspace = await getWorkspaceById(targetId);
    isImpersonating = true;
    supportSessionReason = support.reason;
  }
  if (workspace && !isImpersonating) workspace = { ...workspace, emailVerified: identity.user.emailVerified };
  return { workspace, workspaceId: workspace?.id || null, userEmail: email, userName: identity.user.name,
    role: isSuperAdmin ? 'super_admin' : owned ? 'owner' : 'member', isSuperAdmin, isImpersonating, supportSessionReason };
}
export async function assertSuperAdmin() { return (await getServerSessionContext()).isSuperAdmin; }
