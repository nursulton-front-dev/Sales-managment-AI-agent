import { getAdminIdentity } from '@/src/server/admin/access';
export async function GET() {
  try {
    const identity = await getAdminIdentity();
    return Response.json(identity ? { success: true, ...identity } : { success: false }, { status: identity ? 200 : 403, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ success: false, error: 'Не удалось проверить доступ' }, { status: 503 });
  }
}
