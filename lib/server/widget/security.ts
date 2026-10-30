import { getAllAgents, getWorkspaceById } from '@/src/db';
import { widgetById } from './repository';
import { widgetTextColor } from '@/lib/widget-presentation';
import { readLimitedText, RequestBodyError } from '@/lib/server/request-body';

export class WidgetError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}
export function normalizeOrigin(value: string) {
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.hostname.includes('*')) throw new Error();
    return url.origin;
  } catch { throw new WidgetError('Укажите адрес сайта с https:// без пути. Для localhost разрешён http://.'); }
}
export function publicWidget(widget: Awaited<ReturnType<typeof widgetById>>) {
  if (!widget) throw new WidgetError('Чат недоступен', 404);
  return { id: widget.id, title: widget.title, greeting: widget.greeting, color: widget.color, foreground: widgetTextColor(widget.color), position: widget.position };
}
export async function authorizeWidget(request: Request, id: string) {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') throw new WidgetError('Не удалось определить сайт', 403);
  const widget = await widgetById(id);
  if (!widget?.enabled || !widget.allowedOrigins.includes(origin)) throw new WidgetError('Чат на этом сайте недоступен', 403);
  const [workspace, agents] = await Promise.all([getWorkspaceById(widget.workspaceId), getAllAgents(widget.workspaceId)]);
  if (!workspace || workspace.status !== 'active' || !agents.some((agent) => agent.id === widget.agentId && agent.isActive)) throw new WidgetError('Чат временно недоступен', 503);
  return { widget, origin };
}
export function widgetResponse(request: Request, body: unknown, status = 200) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin', 'X-Content-Type-Options': 'nosniff' };
  // Authorization is enforced before returning any private/configuration data; no cookies are used.
  if (origin && origin !== 'null') headers['Access-Control-Allow-Origin'] = origin;
  if (status === 429) headers['Retry-After'] = '60';
  return new Response(JSON.stringify(body), { status, headers });
}
export function widgetFailure(request: Request, error: unknown) {
  if (!(error instanceof WidgetError)) console.error('Widget request failed (internal error)');
  return widgetResponse(request, { success: false, error: error instanceof WidgetError ? error.message : 'Чат временно недоступен. Попробуйте позже.' }, error instanceof WidgetError ? error.status : 500);
}
export async function readWidgetBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new WidgetError('Ожидается JSON', 415);
  let text: string;
  try { text = await readLimitedText(request, 12_000); }
  catch (error) { if (error instanceof RequestBodyError) throw new WidgetError(error.message, error.status); throw error; }
  try { const body = JSON.parse(text); if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error(); return body; }
  catch { throw new WidgetError('Некорректный запрос'); }
}
export async function widgetOptions(request: Request, id: string) {
  try {
    await authorizeWidget(request, id);
    const response = widgetResponse(request, {});
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '600');
    return response;
  } catch (error) { return widgetFailure(request, error); }
}
