import { NextRequest, NextResponse, connection } from 'next/server';
import { getAllConversations, createConversation } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspaceId');
    const workspaceId =
      session.isSuperAdmin && requestedWorkspaceId
        ? requestedWorkspaceId
        : session.workspaceId;

    const conversations = await getAllConversations(workspaceId);
    return NextResponse.json({ success: true, conversations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await req.json();
    const workspaceId = session.workspaceId;

    if (!body.clientName || !body.clientPhone) {
      return NextResponse.json(
        { success: false, error: 'Обязательные поля: clientName, clientPhone' },
        { status: 400 }
      );
    }

    const conv = await createConversation({
      workspaceId,
      agentId: body.agentId || null,
      clientName: body.clientName,
      clientPhone: body.clientPhone,
      channel: body.channel || 'Telegram',
      status: 'active',
      lastMessageText: body.initialMessage || 'Начало диалога',
    });

    return NextResponse.json({ success: true, conversation: conv });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
