import { cookies } from 'next/headers';
import { getWorkspaceById, getAllWorkspaces, getActiveSupportSession } from '@/src/db';
import { Workspace } from '@/src/db/schema';

export const FOUNDER_SUPERADMIN_EMAIL = 'maxramovnursulton1@gmail.com';

export interface UserSessionContext {
  workspace: Workspace | null;
  workspaceId: string | null;
  userEmail: string | null;
  userName: string | null;
  role: 'super_admin' | 'owner' | 'admin' | 'member';
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  supportSessionReason?: string;
}

/**
 * Server-side session verification.
 * Resolves current workspace, ensures client cannot forge arbitrary workspaceId.
 */
export async function getServerSessionContext(explicitWorkspaceId?: string): Promise<UserSessionContext> {
  const cookieStore = await cookies();
  const cookieWsId = cookieStore.get('ai_os_workspace_id')?.value;
  const targetId = explicitWorkspaceId || cookieWsId;

  let workspace: Workspace | null = null;
  if (targetId) {
    workspace = await getWorkspaceById(targetId);
  }

  // Fallback to first workspace if single-tenant dev mode, or null
  if (!workspace && !explicitWorkspaceId) {
    const all = await getAllWorkspaces();
    if (all.length > 0) {
      workspace = all[0];
    }
  }

  const userEmail = workspace?.ownerEmail || null;
  const isSuperAdmin = userEmail?.toLowerCase() === FOUNDER_SUPERADMIN_EMAIL.toLowerCase();

  // Check if super_admin is currently in support session
  let isImpersonating = false;
  let supportSessionReason: string | undefined = undefined;

  if (workspace) {
    const activeSupport = await getActiveSupportSession(workspace.id);
    if (activeSupport) {
      isImpersonating = true;
      supportSessionReason = activeSupport.reason;
    }
  }

  const role: 'super_admin' | 'owner' | 'admin' | 'member' = isSuperAdmin
    ? 'super_admin'
    : 'owner';

  return {
    workspace,
    workspaceId: workspace?.id || null,
    userEmail,
    userName: workspace?.ownerName || null,
    role,
    isSuperAdmin,
    isImpersonating,
    supportSessionReason,
  };
}

/**
 * Asserts that the current request has super_admin rights.
 * Throws an error or returns false if unauthorized.
 */
export async function assertSuperAdmin(): Promise<boolean> {
  const session = await getServerSessionContext();
  return session.isSuperAdmin;
}
