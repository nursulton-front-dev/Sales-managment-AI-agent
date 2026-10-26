import { validateAttachments, attachmentLinks } from '@/lib/server/support/attachments';
import { NextRequest, NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import {
  getSupportTicketById,
  getTicketMessages,
  addSupportMessage,
  updateTicketStatus,
  markTicketAsReadBySupport,
} from '@/lib/server/support';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const { id } = await params;
    const session = await getServerSessionContext();
    if (!session.isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Доступ разрешен только SuperAdmin' }, { status: 403 });
    }

    const ticket = await getSupportTicketById(id);
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Обращение не найдено' }, { status: 404 });
    }

    // Include internal notes for admin
    const messages = await getTicketMessages(id, true);
    await markTicketAsReadBySupport(id);

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
    if (!session.isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Доступ разрешен только SuperAdmin' }, { status: 403 });
    }

    const body = await req.json();
    const { text, isInternalNote, status, assignedTo, attachments } = body;

    if (!await getSupportTicketById(id)) return NextResponse.json({ success: false, error: 'Обращение не найдено' }, { status: 404 });
    if ((status !== undefined && !['new', 'in_progress', 'waiting_user', 'resolved', 'closed'].includes(status)) || (text !== undefined && (typeof text !== 'string' || !text.trim() || text.length > 10000)) || (assignedTo !== undefined && assignedTo !== null && (typeof assignedTo !== 'string' || assignedTo.length > 200))) return NextResponse.json({ success: false, error: 'Проверьте сообщение и статус' }, { status: 400 });
    let validAttachments;
    try { validAttachments = validateAttachments(attachments); } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Некорректные вложения' }, { status: 400 }); }
    if (status) {
      await updateTicketStatus(id, status, assignedTo);
    }

    let msg = null;
    if (text) {
      msg = await addSupportMessage({
        ticketId: id,
        senderRole: 'support',
        senderEmail: session.userEmail || 'support@aibusiness.os',
        senderName: session.userName || 'Команда заботы Chorla AI',
        text,
        isInternalNote: Boolean(isInternalNote),
        attachments: validAttachments,
      });
    }

    const updatedTicket = await getSupportTicketById(id);
    return NextResponse.json({
      success: true,
      message: msg ? attachmentLinks(msg) : null,
      ticket: updatedTicket,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error instanceof Error ? error.message : 'Ошибка запроса') }, { status: 500 });
  }
}
