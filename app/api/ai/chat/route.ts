import { NextRequest, NextResponse, connection } from 'next/server';
import { processAgentMessage } from '@/lib/ai/gateway';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    const { message, agentId, workspaceId, history, clientName, clientPhone, channel, isSandbox } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Поле message обязательно' }, { status: 400 });
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: 'Сообщение слишком длинное (максимум 4000 символов)' }, { status: 400 });
    }

    // Tenant boundary: prevent forging arbitrary workspaceId
    const effectiveWorkspaceId =
      isSandbox && session.workspaceId
        ? session.workspaceId
        : workspaceId || session.workspaceId;

    const result = await processAgentMessage({
      message,
      agentId,
      workspaceId: effectiveWorkspaceId,
      history,
      clientName,
      clientPhone,
      channel,
      isSandbox: Boolean(isSandbox),
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in AI chat route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
