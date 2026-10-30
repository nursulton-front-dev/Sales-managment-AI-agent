import { authorizeWidget, readWidgetBody, widgetFailure, widgetOptions, widgetResponse, WidgetError } from '@/lib/server/widget/security';
import { createWidgetSession, takeRateLimit } from '@/lib/server/widget/repository';
type Context = { params: Promise<{ id: string }> };
export async function OPTIONS(request: Request, context: Context) { return widgetOptions(request, (await context.params).id); }
export async function POST(request: Request, context: Context) {
  try {
    const { widget, origin } = await authorizeWidget(request, (await context.params).id);
    await readWidgetBody(request);
    if (!await takeRateLimit(`sessions:${widget.id}`, 100, 3600_000)) throw new WidgetError('Слишком много новых обращений. Попробуйте позже.', 429);
    const token = await createWidgetSession(widget, origin);
    return widgetResponse(request, { success: true, token });
  } catch (error) { return widgetFailure(request, error); }
}
