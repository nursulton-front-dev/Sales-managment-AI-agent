import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, lte, or, sql } from 'drizzle-orm';
import { db, updateConversation } from '@/src/db';
import { channelEvents, type ChannelEvent, type ChannelPayload } from '@/src/db/schema';
import { localIntegrations } from './local-store';

export function channelId(...parts: string[]) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

export async function getChannelEvent(id: string): Promise<ChannelEvent | null> {
  if (db) return (await db.select().from(channelEvents).where(eq(channelEvents.id, id)))[0] || null;
  return localIntegrations((store) => store.events.find((event) => event.id === id) || null);
}

export async function enqueueEvent(input: Pick<ChannelEvent, 'id' | 'workspaceId' | 'channel' | 'conversationId'> & { payload: ChannelPayload }) {
  const now = new Date();
  const event: ChannelEvent = { ...input, sequence: 0, status: 'pending', stage: 'received', attempts: 0, availableAt: now, lockedUntil: null, errorCode: null, createdAt: now, updatedAt: now };
  if (db) {
    await db.insert(channelEvents).values({ ...event, sequence: undefined }).onConflictDoNothing();
    return (await getChannelEvent(event.id))!;
  }
  return localIntegrations((store) => {
    const existing = store.events.find((item) => item.id === event.id);
    if (existing) return existing;
    event.sequence = (store.events.at(-1)?.sequence || 0) + 1;
    store.events.push(event);
    return event;
  }, true);
}

export async function patchEvent(id: string, patch: Partial<Pick<ChannelEvent, 'status' | 'stage' | 'payload' | 'availableAt' | 'lockedUntil' | 'errorCode'>>) {
  const values = { ...patch, updatedAt: new Date() };
  if (db) {
    await db.update(channelEvents).set(values).where(eq(channelEvents.id, id));
  } else {
    localIntegrations((store) => {
      const event = store.events.find((item) => item.id === id);
      if (event) Object.assign(event, values);
    }, true);
  }
}

export async function claimEvent(id: string): Promise<ChannelEvent | null> {
  const now = new Date();
  const previous = await getChannelEvent(id);
  if (!previous) return null;
  if (previous.status === 'processing') {
    if (!previous.lockedUntil || new Date(previous.lockedUntil) > now) return null;
    if (['generating', 'sending'].includes(previous.stage)) {
      // A crash may have happened after a debit/send. Never blindly repeat these side effects.
      if (db) {
        await db.execute(sql`WITH changed AS (
          UPDATE channel_events SET status = 'review', error_code = 'outcome_unknown', locked_until = NULL, updated_at = ${now.toISOString()}
          WHERE id = ${id} AND status = 'processing' AND stage = ${previous.stage} AND locked_until <= ${now.toISOString()}
          RETURNING conversation_id
        ) UPDATE conversations SET status = 'human_takeover' FROM changed WHERE conversations.id = changed.conversation_id`);
      } else {
        // Pause first: a process crash between the two local files must leave the safer state.
        await updateConversation(previous.conversationId, { status: 'human_takeover' });
        localIntegrations((store) => {
          const event = store.events.find((item) => item.id === id);
          if (event?.status === 'processing' && event.stage === previous.stage && event.lockedUntil && new Date(event.lockedUntil) <= now) { Object.assign(event, { status: 'review', errorCode: 'outcome_unknown', lockedUntil: null, updatedAt: now }); return true; }
          return false;
        }, true);
      }
      return null;
    }
  }
  const eligible = (event: ChannelEvent) =>
    ((['pending', 'retry'].includes(event.status) && new Date(event.availableAt) <= now) ||
      (event.status === 'processing' && event.lockedUntil && new Date(event.lockedUntil) <= now));
  const values = { status: 'processing', lockedUntil: new Date(now.getTime() + 180_000), updatedAt: now };
  if (db) {
    try {
      const [claimed] = await db.update(channelEvents).set({ ...values, attempts: sql`${channelEvents.attempts} + 1` })
        .where(and(eq(channelEvents.id, id), or(
          and(inArray(channelEvents.status, ['pending', 'retry']), lte(channelEvents.availableAt, now)),
          and(eq(channelEvents.status, 'processing'), lte(channelEvents.lockedUntil, now), inArray(channelEvents.stage, ['received', 'prepared', 'delivered'])),
        ), sql`NOT EXISTS (SELECT 1 FROM channel_events AS older WHERE older.conversation_id = ${channelEvents.conversationId} AND older.sequence < ${channelEvents.sequence} AND older.status IN ('pending', 'retry', 'processing'))`)).returning();
      return claimed || null;
    } catch (error) {
      // The partial unique index serializes processing within one conversation across workers.
      if ((error as { cause?: { code?: string }; code?: string }).cause?.code === '23505' || (error as { code?: string }).code === '23505') return null;
      throw error;
    }
  }
  return localIntegrations((store) => {
    const event = store.events.find((item) => item.id === id);
    if (!event || !eligible(event) || store.events.some((other) => other.id !== id && other.conversationId === event.conversationId && (other.status === 'processing' || (other.sequence < event.sequence && ['pending', 'retry'].includes(other.status))))) return null;
    Object.assign(event, values, { attempts: event.attempts + 1 });
    return { ...event };
  }, true);
}

export async function dueEvents(limit = 20) {
  const now = new Date();
  if (db) return db.select().from(channelEvents).where(or(
    and(inArray(channelEvents.status, ['pending', 'retry']), lte(channelEvents.availableAt, now)),
    and(eq(channelEvents.status, 'processing'), lte(channelEvents.lockedUntil, now)),
  )).orderBy(channelEvents.sequence).limit(limit);
  return localIntegrations((store) => store.events.filter((event) =>
    (['pending', 'retry'].includes(event.status) && new Date(event.availableAt) <= now) ||
    (event.status === 'processing' && event.lockedUntil && new Date(event.lockedUntil) <= now))
    .sort((a, b) => a.sequence - b.sequence).slice(0, limit));
}

export async function workspaceEvents(workspaceId: string) {
  if (db) return db.select().from(channelEvents).where(eq(channelEvents.workspaceId, workspaceId)).orderBy(desc(channelEvents.createdAt)).limit(30);
  return localIntegrations((store) => store.events.filter((event) => event.workspaceId === workspaceId).slice(-30).reverse());
}

export async function conversationEvents(workspaceId: string, conversationId: string) {
  const unfinished = ['pending', 'retry', 'processing', 'review'];
  if (db) return db.select().from(channelEvents).where(and(eq(channelEvents.workspaceId, workspaceId), eq(channelEvents.conversationId, conversationId), inArray(channelEvents.status, unfinished))).orderBy(channelEvents.sequence).limit(20);
  return localIntegrations((store) => store.events.filter((event) => event.workspaceId === workspaceId && event.conversationId === conversationId && unfinished.includes(event.status)).slice(0, 20));
}
