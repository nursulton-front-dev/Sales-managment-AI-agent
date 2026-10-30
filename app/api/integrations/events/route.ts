import { after } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { workspaceEvents } from '@/lib/server/channels/events';
import { processChannelEvent } from '@/lib/server/channels/processor';
import { eventErrors } from '@/lib/server/channels/errors';
export const maxDuration = 60;
export async function GET() {
  const session = await getServerSessionContext();
  if (!session.workspaceId) return Response.json({ success: false }, { status: 401 });
  try {
    const events = await workspaceEvents(session.workspaceId);
    return Response.json({ success: true, events: events.map((event) => ({ id: event.id, channel: event.channel, status: event.status, attempts: event.attempts, createdAt: event.createdAt, availableAt: event.availableAt, conversationId: event.conversationId, error: eventErrors[event.errorCode || ''] || null })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ success: false, error: 'Журнал сообщений временно недоступен. Повторите позже.' }, { status: 500 }); }
}
export async function POST() {
  const session = await getServerSessionContext();
  if (!session.workspaceId) return Response.json({ success: false }, { status: 401 });
  try {
    const events = (await workspaceEvents(session.workspaceId)).filter((event) => ['pending', 'retry', 'processing'].includes(event.status));
    after(async () => { await Promise.all(events.slice(0, 4).map((event) => processChannelEvent(event.id))); });
    return Response.json({ success: true });
  } catch { return Response.json({ success: false }, { status: 500 }); }
}
