import { NextRequest, NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { getWorkspaceById, updateWorkspace, getAllAgents } from '@/src/db';

export async function GET() {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const ws = await getWorkspaceById(session.workspaceId);
    if (!ws) {
      return NextResponse.json({ success: false, error: 'Организация не найдена' }, { status: 404 });
    }

    const isConnected = Boolean(ws.instagramConnected && ws.instagramAccessToken);
    let status = ws.instagramStatus || (isConnected ? 'connected' : 'disconnected');

    // Check token expiry
    if (isConnected && ws.instagramTokenExpiresAt) {
      const expiresAt = new Date(ws.instagramTokenExpiresAt).getTime();
      const now = Date.now();
      if (expiresAt <= now) {
        status = 'needs_reconnect';
      }
    }

    const availableAgents = await getAllAgents(ws.id);

    return NextResponse.json({
      success: true,
      configured: Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET),
      connected: isConnected && status === 'connected',
      status, // 'disconnected' | 'connected' | 'needs_reconnect' | 'error'
      username: ws.instagramUsername,
      userId: ws.instagramUserId,
      tokenExpiresAt: ws.instagramTokenExpiresAt,
      scopes: ws.instagramScopes || [],
      agentId: ws.instagramAgentId,
      autoReply: Boolean(ws.instagramAutoReply),
      lastError: ws.instagramLastError,
      agents: availableAgents.map((a) => ({ id: a.id, name: a.name, isActive: a.isActive })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Ошибка запроса' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    if (!['owner', 'admin', 'super_admin'].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await req.json();
    const { agentId, autoReply } = body;

    const ws = await getWorkspaceById(session.workspaceId);
    if (!ws) {
      return NextResponse.json({ success: false, error: 'Организация не найдена' }, { status: 404 });
    }

    const updates: { instagramAgentId?: string | null; instagramAutoReply?: boolean } = {};

    if (agentId !== undefined && agentId !== null && typeof agentId !== 'string') {
      return NextResponse.json({ success: false, error: 'Некорректный агент' }, { status: 400 });
    }
    if (autoReply !== undefined && typeof autoReply !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Некорректное значение автоответов' }, { status: 400 });
    }

    if (agentId !== undefined) {
      if (agentId) {
        // Validate agent belongs to workspace
        const agents = await getAllAgents(session.workspaceId);
        const agentExists = agents.find((a) => a.id === agentId);
        if (!agentExists) {
          return NextResponse.json({ success: false, error: 'Выбранный агент не найден' }, { status: 400 });
        }
      }
      updates.instagramAgentId = agentId || null;
    }

    if (autoReply !== undefined) {
      // Cannot turn on autoReply without connected Instagram account and selected agent
      if (autoReply && !ws.instagramConnected) {
        return NextResponse.json(
          { success: false, error: 'Нельзя включить автоответы без подключённого аккаунта Instagram' },
          { status: 400 }
        );
      }
      if (autoReply && !(updates.instagramAgentId === undefined ? ws.instagramAgentId : updates.instagramAgentId)) {
        return NextResponse.json(
          { success: false, error: 'Сначала выберите ответственного агента' },
          { status: 400 }
        );
      }
      updates.instagramAutoReply = Boolean(autoReply);
    }

    const effectiveAgentId = updates.instagramAgentId === undefined ? ws.instagramAgentId : updates.instagramAgentId;
    const effectiveAutoReply = updates.instagramAutoReply === undefined ? ws.instagramAutoReply : updates.instagramAutoReply;
    if (effectiveAutoReply && !effectiveAgentId) {
      return NextResponse.json({ success: false, error: 'Выключите автоответы перед удалением агента' }, { status: 400 });
    }

    await updateWorkspace(session.workspaceId, updates);

    return NextResponse.json({
      success: true,
      instagramAgentId: effectiveAgentId,
      instagramAutoReply: effectiveAutoReply,
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Ошибка запроса' }, { status: 500 });
  }
}
