import { getServerSessionContext } from '@/src/server/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { updateWorkspace, getWorkspaceById, getAllWorkspaces } from '@/src/db';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionContext();
    const ws = session.workspace;
    if (!ws) return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    if (ws) {
      await updateWorkspace(ws.id, {
        googleCalendarConnected: false,
        googleRefreshToken: null,
        googleCalendarEmail: null,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Google Календарь успешно отключен',
    });
  } catch (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : 'Ошибка запроса') }, { status: 500 });
  }
}
