import { NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { getWorkspaceById, getAllAgents } from '@/src/db';
import { getServiceBotUsername } from '@/lib/server/telegram';

export async function GET() {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const [workspace, agents] = await Promise.all([
      getWorkspaceById(session.workspaceId),
      getAllAgents(session.workspaceId),
    ]);

    if (!workspace) {
      return NextResponse.json({ success: false, error: 'Организация не найдена' }, { status: 404 });
    }

    const assignedAgent = workspace.telegramBusinessAgentId
      ? agents.find((a) => a.id === workspace.telegramBusinessAgentId)
      : null;

    return NextResponse.json({
      success: true,
      botUsername: getServiceBotUsername(),
      connected: Boolean(workspace.telegramBusinessConnected),
      connectionId: workspace.telegramBusinessConnectionId || null,
      userId: workspace.telegramBusinessUserId || null,
      username: workspace.telegramBusinessUsername || null,
      canReply: Boolean(workspace.telegramBusinessCanReply),
      enabled: Boolean(workspace.telegramBusinessEnabled),
      agentId: workspace.telegramBusinessAgentId || null,
      agentName: assignedAgent?.name || null,
      connectedAt: workspace.telegramBusinessConnectedAt || null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ошибка при получении статуса' },
      { status: 500 }
    );
  }
}
