import { NextRequest, NextResponse, connection } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { getAllWorkspaces } from '@/src/db';

// Rate limiting in-memory store: IP / Email -> timestamp array
const rateLimitMap = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 5; // Max 5 tickets per 15 minutes per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS) {
    rateLimitMap.set(ip, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Слишком много обращений. Пожалуйста, подождите 15 минут перед повторной отправкой.',
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, message, authorName, subject } = body;

    // Strict validation
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 255) {
      return NextResponse.json(
        { success: false, error: 'Пожалуйста, укажите корректный адрес электронной почты' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Сообщение должно содержать не менее 5 символов' },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { success: false, error: 'Сообщение слишком длинное (максимум 4000 символов)' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('База данных временно недоступна');
    }

    // Resolve target workspace: either existing workspace with this email or default system workspace
    const allWorkspaces = await getAllWorkspaces();
    const existingWs = allWorkspaces.find((w) => w.ownerEmail.toLowerCase() === email.trim().toLowerCase());
    const targetWorkspaceId = existingWs ? existingWs.id : allWorkspaces[0]?.id;

    if (!targetWorkspaceId) {
      throw new Error('Система поддержки временно настраивается');
    }

    // Generate ticket number
    const allTickets = await db.select().from(schema.supportTickets);
    const ticketNumber = 1000 + allTickets.length + 1;
    const ticketId = `ticket_pub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const cleanAuthorName = authorName?.trim() || email.split('@')[0];
    const cleanSubject = subject?.trim() || 'Публичное обращение (404 страница)';
    const cleanDescription = message.trim();

    const [ticket] = await db
      .insert(schema.supportTickets)
      .values({
        id: ticketId,
        ticketNumber,
        workspaceId: targetWorkspaceId,
        authorEmail: email.trim().toLowerCase(),
        authorName: cleanAuthorName,
        type: 'question',
        subject: cleanSubject,
        description: cleanDescription,
        status: 'new',
        unreadByCustomer: false,
        unreadBySupport: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create initial message
    await db.insert(schema.supportMessages).values({
      id: `msg_pub_${Date.now()}`,
      ticketId,
      senderRole: 'customer',
      senderEmail: email.trim().toLowerCase(),
      senderName: cleanAuthorName,
      text: cleanDescription,
      isInternalNote: false,
      attachments: [],
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      ticketNumber: ticket.ticketNumber,
      message: `Ваше обращение #${ticket.ticketNumber} успешно зарегистрировано. Команда поддержки ответит на ${email.trim()}.`,
    });
  } catch (err: any) {
    console.error('Public support ticket error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Не удалось отправить обращение' },
      { status: 500 }
    );
  }
}
