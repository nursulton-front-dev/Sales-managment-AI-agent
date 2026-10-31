import { NextRequest, NextResponse } from 'next/server';
import { processAgentMessage } from '@/lib/ai/gateway';
import { getServerSessionContext } from '@/src/server/auth/session';
import { getAllAgents } from '@/src/db';

/** The browser chat endpoint is always a sandbox. Live channels use their verified webhooks. */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    const { message, agentId, history } = await req.json();
    if (typeof message !== 'string' || !message.trim() || message.length > 4000) return NextResponse.json({ success: false, error: 'Введите сообщение до 4000 символов' }, { status: 400 });
    const agent = (await getAllAgents(session.workspaceId)).find((item) => item.id === agentId);
    if (!agent) return NextResponse.json({ success: false, error: 'Сотрудник не найден' }, { status: 404 });
    const safeHistory = Array.isArray(history) ? history.slice(-20).filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string' && item.content.length <= 4000) : [];
    const result = await processAgentMessage({ message, agentId: agent.id, workspaceId: session.workspaceId, history: safeHistory, isSandbox: true });
    return NextResponse.json({ success: true, reply: result.reply, tokensCost: result.tokensCost });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Не удалось получить ответ' }, { status: 500 }); }
}
