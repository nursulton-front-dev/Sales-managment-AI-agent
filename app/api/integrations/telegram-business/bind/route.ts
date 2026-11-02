import { NextRequest, NextResponse, connection } from 'next/server';
import crypto from 'node:crypto';
import { getServerSessionContext } from '@/src/server/auth/session';
import { getAllAgents, createTelegramBusinessBinding } from '@/src/db';
import { getServiceBotUsername } from '@/lib/server/telegram';

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await req.json();
    const { agentId } = body;
    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ success: false, error: 'Выберите ИИ-сотрудника' }, { status: 400 });
    }

    const agents = await getAllAgents(session.workspaceId);
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ success: false, error: 'Сотрудник не найден в текущей организации' }, { status: 404 });
    }

    const nonce = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL

    await createTelegramBusinessBinding({
      id: nonce,
      workspaceId: session.workspaceId,
      agentId: agent.id,
      expiresAt,
    });

    const botUsername = getServiceBotUsername();
    const bindUrl = `https://t.me/${botUsername}?start=bind_${nonce}`;

    return NextResponse.json({
      success: true,
      nonce,
      botUsername,
      bindUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ошибка при создании запроса привязки' },
      { status: 500 }
    );
  }
}
