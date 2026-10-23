import { NextRequest, NextResponse, connection } from 'next/server';
import { getConversationById, updateConversation, getMessagesByConversationId, createMessage } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  try {
    const { id } = await params;
    const conv = await getConversationById(id);
    if (!conv) {
      return NextResponse.json({ success: false, error: 'Диалог не найден' }, { status: 404 });
    }

    const messages = await getMessagesByConversationId(id);
    return NextResponse.json({ success: true, conversation: conv, messages });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !['active', 'human_takeover', 'closed'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Недопустимый статус' }, { status: 400 });
    }

    const updated = await updateConversation(id, { status });
    return NextResponse.json({ success: true, conversation: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  try {
    const { id } = await params;
    const conv = await getConversationById(id);
    if (!conv) {
      return NextResponse.json({ success: false, error: 'Диалог не найден' }, { status: 404 });
    }

    const body = await req.json();
    const { text, sender = 'human' } = body;

    if (!text) {
      return NextResponse.json({ success: false, error: 'Текст сообщения обязателен' }, { status: 400 });
    }

    const newMsg = await createMessage({
      conversationId: id,
      workspaceId: conv.workspaceId,
      sender: sender as 'client' | 'agent' | 'human',
      text,
      tokensCost: 0, // Human messages do not cost AI tokens
    });

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
