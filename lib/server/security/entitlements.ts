import type { Workspace } from '@/src/db/schema';

export interface EntitlementCheckResult {
  entitled: boolean;
  reason?: 'inactive' | 'subscription_expired' | 'insufficient_balance';
}

/**
 * Single source of truth for workspace AI entitlements across all channels
 * (Telegram, Instagram, WebWidget).
 */
export function isWorkspaceEntitled(workspace: Workspace | null | undefined): EntitlementCheckResult {
  if (!workspace || workspace.status !== 'active') {
    return { entitled: false, reason: 'inactive' };
  }

  // Check subscription or trial expiration
  if (workspace.subExpiresAt && new Date(workspace.subExpiresAt).getTime() <= Date.now()) {
    return { entitled: false, reason: 'subscription_expired' };
  }

  // Check token balance
  if (typeof workspace.tokenBalance === 'number' && workspace.tokenBalance <= 0) {
    return { entitled: false, reason: 'insufficient_balance' };
  }

  return { entitled: true };
}
