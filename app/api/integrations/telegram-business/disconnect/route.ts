import { NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { updateWorkspace } from '@/src/db';

export async function POST() {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    await updateWorkspace(session.workspaceId, {
      telegramBusinessConnected: false,
      telegramBusinessConnectionId: null,
      telegramBusinessUserId: null,
      telegramBusinessUsername: null,
      telegramBusinessCanReply: false,
      telegramBusinessEnabled: false,
      telegramBusinessAgentId: null,
      telegramBusinessConnectedAt: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ошибка при отключении' },
      { status: 500 }
    );
  }
}
