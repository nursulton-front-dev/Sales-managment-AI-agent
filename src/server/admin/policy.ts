export const PLATFORM_OWNER_EMAIL = 'maxramovnursulton1@gmail.com';
export const STAFF_ROLES = ['support', 'finance', 'operator'] as const;
export type StaffRole = typeof STAFF_ROLES[number];
export type AdminRole = 'super_admin' | StaffRole;
export type AdminPermission = 'team' | 'workspaces' | 'billing' | 'support' | 'channels' | 'operations' | 'audit';
const permissions: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: ['team', 'workspaces', 'billing', 'support', 'channels', 'operations', 'audit'],
  support: ['support'],
  finance: ['workspaces', 'billing'],
  operator: ['channels', 'operations'],
};
export function hasAdminPermission(role: AdminRole | null, permission: AdminPermission) {
  return role !== null && permissions[role]?.includes(permission) === true;
}
export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && STAFF_ROLES.includes(value as StaffRole);
}
export function adminHome(role: AdminRole) {
  return role === 'support' ? '/admin/support' : role === 'operator' ? '/admin/channels' : role === 'finance' ? '/admin/billing' : '/admin';
}
