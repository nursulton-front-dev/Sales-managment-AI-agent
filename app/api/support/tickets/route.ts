import { NextRequest, NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { createSupportTicket, getCustomerTickets } from '@/lib/server/support';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.userEmail || !session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const tickets = await getCustomerTickets(session.userEmail, session.workspaceId);
    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.userEmail || !session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await req.json();
    const { type, subject, description, attachments } = body;

    if (!subject || !description || !type) {
      return NextResponse.json(
        { success: false, error: 'Заполните тип обращения, тему и описание' },
        { status: 400 }
      );
    }

    // Validate attachments: max 3 files, allowed mime types
    const validAttachments = Array.isArray(attachments) ? attachments.slice(0, 3) : [];

    const ticket = await createSupportTicket({
      workspaceId: session.workspaceId,
      authorEmail: session.userEmail,
      authorName: session.userName || 'Пользователь',
      type,
      subject: subject.trim(),
      description: description.trim(),
      attachments: validAttachments,
    });

    return NextResponse.json({
      success: true,
      ticket,
      message: `Обращение #${ticket.ticketNumber} успешно создано`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
