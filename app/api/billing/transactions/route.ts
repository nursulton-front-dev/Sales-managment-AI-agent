import { NextResponse, connection } from 'next/server';
import { getAllTokenLogs } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET() {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspace) {
      return NextResponse.json({ success: true, logs: [] });
    }

    const logs = await getAllTokenLogs(session.workspace.id);
    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Ошибка запроса' }, { status: 500 });
  }
}
