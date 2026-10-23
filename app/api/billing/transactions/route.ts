import { NextRequest, NextResponse, connection } from 'next/server';
import { getAllTokenLogs } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspace) {
      return NextResponse.json({ success: true, logs: [] });
    }

    const logs = await getAllTokenLogs(session.workspace.id);
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
