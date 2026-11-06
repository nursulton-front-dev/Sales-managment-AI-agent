import { NextRequest, NextResponse, connection } from 'next/server';
import { getAllTokenLogs } from '@/src/db';
import { adminCan } from '@/src/server/admin/access';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await adminCan('billing');
    if (!session) {
      return NextResponse.json({ success: false, error: 'Доступ разрешен только SuperAdmin платформы' }, { status: 403 });
    }

    const logs = await getAllTokenLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
