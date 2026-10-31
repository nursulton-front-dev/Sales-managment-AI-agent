import { after } from 'next/server';
import { getMessagesByConversationId, getConversationById } from '@/src/db';
import { enqueueEvent, getChannelEvent, channelId, conversationEvents } from '@/lib/server/channels/events';
import { processChannelEvent } from '@/lib/server/channels/processor';
import { authorizeWidget, readWidgetBody, WidgetError, widgetFailure, widgetOptions, widgetResponse } from '@/lib/server/widget/security';
import { findWidgetSession, takeRateLimit } from '@/lib/server/widget/repository';
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
async function visitor(request: Request, context: Context) {
  const { widget, origin } = await authorizeWidget(request, (await context.params).id);
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  const session = await findWidgetSession(widget.id, origin, token);
  if (!session) throw new WidgetError('Сессия чата истекла. Откройте чат заново.', 401);
  return { widget, origin, session };
}
export async function OPTIONS(request: Request, context: Context) { return widgetOptions(request, (await context.params).id); }
export async function GET(request: Request, context: Context) {
  try {
    const { session, widget } = await visitor(request, context);
    if (!await takeRateLimit(`poll:${session.tokenHash}`, 40)) throw new WidgetError('Слишком много запросов', 429);
    const [messages, conversation, related] = await Promise.all([getMessagesByConversationId(session.conversationId), getConversationById(session.conversationId), conversationEvents(widget.workspaceId, session.conversationId)]);
    const due = related.find((event) => ['pending', 'retry', 'processing'].includes(event.status));
    if (due) after(() => processChannelEvent(due.id));
    return widgetResponse(request, { success: true,
      messages: messages.map((message) => ({ id: message.id, sender: message.sender, text: message.text, createdAt: message.createdAt })),
      status: conversation?.status || 'active',
      pending: related.some((event) => ['pending', 'processing', 'retry'].includes(event.status)),
      needsHelp: related.some((event) => event.status === 'review'),
    });
  } catch (error) { return widgetFailure(request, error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const { widget, origin, session } = await visitor(request, context);
    const { text, requestId } = await readWidgetBody(request);
    if (typeof text !== 'string' || !text.trim() || text.length > 4000 || typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) throw new WidgetError('Введите сообщение до 4000 символов');
    const conversation = await getConversationById(session.conversationId);
    if (conversation?.status === 'closed') throw new WidgetError('Этот диалог завершён. Начните новый чат.', 409);
    const id = channelId('WebWidget', session.tokenHash, requestId);
    const existing = await getChannelEvent(id);
    if (existing && existing.payload.text !== text.trim()) throw new WidgetError('Идентификатор сообщения уже использован', 409);
    if (!existing && (!await takeRateLimit(`messages:${session.tokenHash}`, 10) || !await takeRateLimit(`widget-messages:${widget.id}`, 100))) throw new WidgetError('Слишком много сообщений. Подождите минуту.', 429);
    const event = existing || await enqueueEvent({ id, workspaceId: widget.workspaceId, channel: 'WebWidget', conversationId: session.conversationId,
      payload: { agentId: widget.agentId, contact: `web:${session.conversationId}`, clientName: `Посетитель ${new URL(origin).hostname}`, text: text.trim() },
    });
    after(() => processChannelEvent(event.id));
    return widgetResponse(request, { success: true, accepted: true, eventId: event.id }, 202);
  } catch (error) { return widgetFailure(request, error); }
}
