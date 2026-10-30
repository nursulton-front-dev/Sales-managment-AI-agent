import { NextRequest, NextResponse } from 'next/server';
import { getAllAgents } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';
import { createSupportTicket } from '@/lib/server/support';
import { saveWidget, widgetForWorkspace, takeRateLimit } from '@/lib/server/widget/repository';
import { normalizeOrigin, WidgetError } from '@/lib/server/widget/security';

async function identity() {
  const session = await getServerSessionContext();
  if (!session.workspaceId) throw new WidgetError('Требуется авторизация', 401);
  if (!['owner', 'admin', 'super_admin'].includes(session.role)) throw new WidgetError('Недостаточно прав', 403);
  return session;
}
function failure(error: unknown) {
  if (!(error instanceof WidgetError)) console.error('Widget settings storage failed');
  return NextResponse.json({ success: false, error: error instanceof WidgetError ? error.message : 'Не удалось сохранить настройки чата. Повторите позже или обратитесь в поддержку.' }, { status: error instanceof WidgetError ? error.status : 500 });
}
export async function GET() {
  try {
    const session = await identity();
    return NextResponse.json({ success: true, widget: await widgetForWorkspace(session.workspaceId!), embedOrigin: process.env.APP_URL || process.env.BETTER_AUTH_URL || null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function PUT(request: NextRequest) {
  try {
    const session = await identity();
    const body = await request.json();
    if (typeof body.agentId !== 'string' || typeof body.enabled !== 'boolean' || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 80 || typeof body.greeting !== 'string' || !body.greeting.trim() || body.greeting.length > 500 || !/^#[0-9a-f]{6}$/i.test(body.color) || !['left', 'right'].includes(body.position) || !Array.isArray(body.allowedOrigins) || !body.allowedOrigins.length || body.allowedOrigins.length > 10 || body.allowedOrigins.some((origin: unknown) => typeof origin !== 'string')) throw new WidgetError('Проверьте сотрудника, сайты и оформление чата');
    const agents = await getAllAgents(session.workspaceId!);
    if (!agents.some((agent) => agent.id === body.agentId && (!body.enabled || agent.isActive))) throw new WidgetError('Выберите действующего сотрудника вашей компании');
    const allowedOrigins = [...new Set<string>(body.allowedOrigins.map(normalizeOrigin))];
    const widget = await saveWidget(session.workspaceId!, { agentId: body.agentId, enabled: body.enabled, title: body.title.trim(), greeting: body.greeting.trim(), color: body.color, position: body.position, allowedOrigins });
    return NextResponse.json({ success: true, widget });
  } catch (error) { return failure(error); }
}
export async function POST() {
  try {
    const session = await identity();
    const widget = await widgetForWorkspace(session.workspaceId!);
    if (!widget) throw new WidgetError('Сначала сохраните адрес сайта и настройки чата');
    if (!await takeRateLimit(`widget-help:${session.workspaceId}`, 1, 3600_000)) throw new WidgetError('Заявка уже отправлялась в течение часа. Проверьте раздел поддержки.', 429);
    const ticket = await createSupportTicket({ workspaceId: session.workspaceId!, authorEmail: session.userEmail!, authorName: session.userName || 'Пользователь', type: 'question', subject: 'Помощь с установкой чата на сайт', description: `Нужна помощь с установкой виджета.\nСайты: ${widget.allowedOrigins.join(', ')}\nВиджет: ${widget.id}` });
    return NextResponse.json({ success: true, ticketId: ticket.id, ticketNumber: ticket.ticketNumber });
  } catch (error) { return failure(error); }
}
