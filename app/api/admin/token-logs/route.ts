import { NextResponse, connection } from 'next/server';
import { getAllTokenLogs } from '@/src/db';
import { adminCan } from '@/src/server/admin/access';

export async function GET() {
  await connection();
  try {
    const session = await adminCan('billing');
    if (!session) {
      return NextResponse.json({ success: false, error: 'Доступ разрешен только SuperAdmin платформы' }, { status: 403 });
    }

    const logs = await getAllTokenLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка запроса' }, { status: 500 });
  }
}
