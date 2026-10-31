import { validateAttachments, attachmentLinks } from '@/lib/server/support/attachments';
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
    if (!session.isSuperAdmin && (ticket.authorEmail !== session.userEmail || ticket.workspaceId !== session.workspaceId)) {
      return NextResponse.json({ success: false, error: 'Доступ запрещён' }, { status: 403 });
    }

    const messages = await getTicketMessages(id, false); // No internal notes for customer
    await markTicketAsReadByCustomer(id);

    return NextResponse.json({
      success: true,
      ticket,
      messages: messages.map(attachmentLinks),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error instanceof Error ? error.message : 'Ошибка запроса') }, { status: 500 });
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
    if (!session.isSuperAdmin && (ticket.authorEmail !== session.userEmail || ticket.workspaceId !== session.workspaceId)) {
      return NextResponse.json({ success: false, error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await req.json();
    const { text, attachments, reopen } = body;

    if ((!text && !reopen) || (text !== undefined && (typeof text !== 'string' || !text.trim() || text.length > 10000))) {
      return NextResponse.json({ success: false, error: 'Текст сообщения не может быть пустым' }, { status: 400 });
    }

    let validAttachments;
    try { validAttachments = validateAttachments(attachments); } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Некорректные вложения' }, { status: 400 }); }

    if (reopen && ['resolved', 'closed'].includes(ticket.status)) {
      await updateTicketStatus(id, 'in_progress');
    }

    const msg = await addSupportMessage({
      ticketId: id,
      senderRole: 'customer',
      senderEmail: session.userEmail,
      senderName: session.userName || 'Пользователь',
      text: text || 'Клиент возобновил обращение',
      isInternalNote: false,
      attachments: validAttachments,
    });

    return NextResponse.json({ success: true, message: msg ? attachmentLinks(msg) : null });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error instanceof Error ? error.message : 'Ошибка запроса') }, { status: 500 });
  }
}
