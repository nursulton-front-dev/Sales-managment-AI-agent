import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAdminIdentity } from '@/src/server/admin/access';
import AdminShell from './AdminShell';
async function AuthorizedAdmin({ children }: { children: React.ReactNode }) {
  const identity = await getAdminIdentity();
  if (!identity) redirect('/login?redirect=%2Fadmin');
  return <AdminShell identity={identity}>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="p-8" role="status">Проверяем доступ…</p>}><AuthorizedAdmin>{children}</AuthorizedAdmin></Suspense>;
}
