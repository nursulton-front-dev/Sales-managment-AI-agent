import { NextRequest, NextResponse, connection } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { getAllWorkspaces } from '@/src/db';
import { sql } from 'drizzle-orm';

function extractRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as T[];
  if (typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';

    if (!db) {
      throw new Error('База данных временно недоступна');
    }

    // Shared distributed rate limit via PostgreSQL
    const rateLimitKey = `rate-limit:public-support:${ip}`;
    const rateRes = await db.execute(sql`
      INSERT INTO ${schema.verifications} (id, identifier, value, expires_at, created_at, updated_at)
      VALUES (${rateLimitKey}, ${rateLimitKey}, '1', NOW() + INTERVAL '15 minutes', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET value = (CASE WHEN verifications.expires_at <= NOW() THEN 1 ELSE (COALESCE(NULLIF(verifications.value, ''), '0')::integer + 1) END)::text,
          expires_at = (CASE WHEN verifications.expires_at <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE verifications.expires_at END),
          updated_at = NOW()
      RETURNING value
    `);
    const count = parseInt(extractRows<{ value: string }>(rateRes)[0]?.value || '1', 10);
    if (count > 5) {
      return NextResponse.json(
        { success: false, error: 'Слишком много обращений. Пожалуйста, подождите 15 минут перед повторной отправкой.' },
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

    // Isolate public unverified submissions from customer workspaces:
    // Never assign unauthenticated public tickets to customer workspaces.
    const allWorkspaces = await getAllWorkspaces();
    const systemWs = allWorkspaces.find((w) => w.id === 'ws_system_support' || w.companyName === 'gapcha AI Platform')
      || allWorkspaces.find((w) => w.ownerEmail.includes('admin') || w.ownerEmail.includes('founder'))
      || allWorkspaces[0];

    if (!systemWs) {
      throw new Error('Система поддержки временно настраивается');
    }

    // Atomic ticket number generation
    const maxNumRes = await db.execute(sql`SELECT COALESCE(MAX(ticket_number), 1000) AS max_num FROM ${schema.supportTickets}`);
    const maxNumRows = extractRows<{ max_num: number | string }>(maxNumRes);
    const maxNum = parseInt(String(maxNumRows[0]?.max_num || '1000'), 10);
    const ticketNumber = maxNum + 1;

    const ticketId = `ticket_pub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const cleanAuthorName = `[Публичное обращение] ${authorName?.trim() || email.split('@')[0]}`;
    const cleanSubject = subject?.trim() || 'Публичное обращение (404 страница)';
    const cleanDescription = message.trim();

    const [ticket] = await db
      .insert(schema.supportTickets)
      .values({
        id: ticketId,
        ticketNumber,
        workspaceId: systemWs.id,
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
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
      },
      message: 'Ваше обращение принято. Мы свяжемся с вами по указанному адресу электронной почты.',
    });
  } catch (error: any) {
    console.error('Public support ticket error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка при отправке обращения' },
      { status: 500 }
    );
  }
}
