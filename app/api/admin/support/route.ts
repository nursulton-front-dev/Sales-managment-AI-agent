import { NextResponse, connection } from 'next/server';
import { adminCan } from '@/src/server/admin/access';
import { getAllSupportTicketsForAdmin } from '@/lib/server/support';

export async function GET() {
  await connection();
  try {
    const session = await adminCan('support');
    if (!session) {
      return NextResponse.json({ success: false, error: 'Доступ разрешен только SuperAdmin' }, { status: 403 });
    }

    const tickets = await getAllSupportTicketsForAdmin();
    return NextResponse.json({ success: true, tickets });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Ошибка запроса' }, { status: 500 });
  }
}
