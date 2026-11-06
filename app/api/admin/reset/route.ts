import { adminCan } from '@/src/server/admin/access';
export async function POST() {
  if (!await adminCan('team')) return Response.json({ success: false }, { status: 403 });
  return Response.json({ success: false, error: 'Массовая очистка базы через веб-панель отключена. Используйте проверенную процедуру с резервной копией.' }, { status: 410 });
}
