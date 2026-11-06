import { NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { getWorkspaceById, updateWorkspace } from '@/src/db';

export async function POST() {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const ws = await getWorkspaceById(session.workspaceId);
    if (!ws || !ws.telegramBusinessConnected) {
      return NextResponse.json({ success: false, error: 'Telegram-аккаунт не подключён' }, { status: 400 });
    }

    const newEnabled = !ws.telegramBusinessEnabled;
    await updateWorkspace(session.workspaceId, {
      telegramBusinessEnabled: newEnabled,
    });

    if (!newEnabled) {
      const { cancelWorkspaceChannelEvents } = await import('@/lib/server/channels/events');
      await cancelWorkspaceChannelEvents(session.workspaceId, 'Telegram', 'telegram_business_disabled');
    }

    return NextResponse.json({ success: true, enabled: newEnabled });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ошибка при изменении состояния' },
      { status: 500 }
    );
  }
}
