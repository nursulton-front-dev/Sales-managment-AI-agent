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
    if (!session.isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Доступ разрешен только SuperAdmin' }, { status: 403 });
    }

    const body = await req.json();
    const { text, isInternalNote, status, assignedTo, attachments } = body;

    if (status) {
      await updateTicketStatus(id, status, assignedTo);
    }

    let msg = null;
    if (text) {
      msg = await addSupportMessage({
        ticketId: id,
        senderRole: 'support',
        senderEmail: session.userEmail || 'support@aibusiness.os',
        senderName: session.userName || 'Команда поддержки AI Business OS',
        text,
        isInternalNote: Boolean(isInternalNote),
        attachments: attachments || [],
      });
    }

    const updatedTicket = await getSupportTicketById(id);
    return NextResponse.json({
      success: true,
      message: msg,
      ticket: updatedTicket,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
