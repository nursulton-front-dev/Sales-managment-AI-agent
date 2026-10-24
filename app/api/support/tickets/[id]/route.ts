import { NextRequest, NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import {
  getSupportTicketById,
  getTicketMessages,
  addSupportMessage,
  markTicketAsReadByCustomer,
  updateTicketStatus,
} from '@/lib/server/support';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const { id } = await params;
    const session = await getServerSessionContext();
    if (!session.userEmail || !session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const ticket = await getSupportTicketById(id);
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Обращение не найдено' }, { status: 404 });
    }

    // Tenant check: customer can only read their own ticket
    if (!session.isSuperAdmin && ticket.authorEmail !== session.userEmail) {
      return NextResponse.json({ success: false, error: 'Доступ запрещён' }, { status: 403 });
    }

    const messages = await getTicketMessages(id, false); // No internal notes for customer
    await markTicketAsReadByCustomer(id);

    return NextResponse.json({
      success: true,
      ticket,
      messages,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const { id } = await params;
    const session = await getServerSessionContext();
    if (!session.userEmail || !session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const ticket = await getSupportTicketById(id);
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Обращение не найдено' }, { status: 404 });
    }

    // Tenant check
    if (!session.isSuperAdmin && ticket.authorEmail !== session.userEmail) {
      return NextResponse.json({ success: false, error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await req.json();
    const { text, attachments, reopen } = body;

    if (!text && !reopen) {
      return NextResponse.json({ success: false, error: 'Текст сообщения не может быть пустым' }, { status: 400 });
    }

    if (reopen && ticket.status === 'resolved') {
      await updateTicketStatus(id, 'in_progress');
    }

    const msg = await addSupportMessage({
      ticketId: id,
      senderRole: 'customer',
      senderEmail: session.userEmail,
      senderName: session.userName || 'Пользователь',
      text: text || 'Клиент возобновил обращение',
      isInternalNote: false,
      attachments: attachments || [],
    });

    return NextResponse.json({ success: true, message: msg });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
