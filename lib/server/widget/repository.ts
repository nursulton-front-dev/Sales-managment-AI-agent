import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/src/db';
import { websiteWidgets, widgetSessions, integrationRateLimits, type WebsiteWidget } from '@/src/db/schema';
import { localIntegrations } from '@/lib/server/channels/local-store';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export async function widgetById(id: string): Promise<WebsiteWidget | null> {
  if (db) return (await db.select().from(websiteWidgets).where(eq(websiteWidgets.id, id)))[0] || null;
  return localIntegrations((store) => store.widgets.find((widget) => widget.id === id) || null);
}
export async function widgetForWorkspace(workspaceId: string): Promise<WebsiteWidget | null> {
  if (db) return (await db.select().from(websiteWidgets).where(eq(websiteWidgets.workspaceId, workspaceId)))[0] || null;
  return localIntegrations((store) => store.widgets.find((widget) => widget.workspaceId === workspaceId) || null);
}
export type WidgetSettings = Pick<WebsiteWidget, 'agentId' | 'enabled' | 'title' | 'greeting' | 'color' | 'position' | 'allowedOrigins'>;
export async function saveWidget(workspaceId: string, settings: WidgetSettings) {
  const existing = await widgetForWorkspace(workspaceId);
  const widget: WebsiteWidget = { id: existing?.id || randomUUID(), workspaceId, ...settings, lastSeenAt: existing?.lastSeenAt || null, lastSeenOrigin: existing?.lastSeenOrigin || null, updatedAt: new Date() };
  if (db) {
    const [saved] = await db.insert(websiteWidgets).values(widget).onConflictDoUpdate({ target: websiteWidgets.workspaceId, set: { ...settings, updatedAt: widget.updatedAt } }).returning();
    return saved;
  }
  return localIntegrations((store) => {
    const index = store.widgets.findIndex((item) => item.workspaceId === workspaceId);
    if (index === -1) store.widgets.push(widget);
    else store.widgets[index] = { ...widget, id: store.widgets[index].id };
    return index === -1 ? widget : store.widgets[index];
  }, true);
}
export async function markWidgetSeen(id: string, origin: string) {
  const patch = { lastSeenAt: new Date(), lastSeenOrigin: origin };
  if (db) await db.update(websiteWidgets).set(patch).where(eq(websiteWidgets.id, id));
  else localIntegrations((store) => { const widget = store.widgets.find((item) => item.id === id); if (widget) Object.assign(widget, patch); }, true);
}
export async function createWidgetSession(widget: WebsiteWidget, origin: string) {
  const token = randomBytes(32).toString('hex');
  const session = { tokenHash: hashToken(token), widgetId: widget.id, origin, conversationId: randomUUID(), expiresAt: new Date(Date.now() + 7 * 86400_000) };
  if (db) await db.insert(widgetSessions).values(session);
  else localIntegrations((store) => {
    store.sessions = store.sessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
    store.sessions.push(session);
  }, true);
  return token;
}
export async function findWidgetSession(widgetId: string, origin: string, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = hashToken(token);
  if (db) return (await db.select().from(widgetSessions).where(and(eq(widgetSessions.tokenHash, tokenHash), eq(widgetSessions.widgetId, widgetId), eq(widgetSessions.origin, origin), gt(widgetSessions.expiresAt, new Date()))))[0] || null;
  return localIntegrations((store) => store.sessions.find((session) => session.tokenHash === tokenHash && session.widgetId === widgetId && session.origin === origin && new Date(session.expiresAt).getTime() > Date.now()) || null);
}

export async function takeRateLimit(key: string, maximum: number, windowMs = 60_000): Promise<boolean> {
  const now = Date.now();
  const id = hashToken(`${key}:${Math.floor(now / windowMs)}`);
  const expiresAt = new Date((Math.floor(now / windowMs) + 1) * windowMs);
  if (db) {
    const [row] = await db.insert(integrationRateLimits).values({ id, count: 1, expiresAt }).onConflictDoUpdate({
      target: integrationRateLimits.id,
      set: { count: sql`${integrationRateLimits.count} + 1` },
      setWhere: sql`${integrationRateLimits.count} < ${maximum}`,
    }).returning();
    return Boolean(row);
  }
  return localIntegrations((store) => {
    for (const [key, value] of Object.entries(store.limits)) if (value.expiresAt <= now) delete store.limits[key];
    const value = store.limits[id] || { count: 0, expiresAt: expiresAt.getTime() };
    if (value.count >= maximum) return false;
    store.limits[id] = { ...value, count: value.count + 1 };
    return true;
  }, true);
}
