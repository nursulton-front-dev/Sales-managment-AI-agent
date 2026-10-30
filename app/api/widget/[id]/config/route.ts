import { authorizeWidget, publicWidget, widgetFailure, widgetOptions, widgetResponse, WidgetError } from '@/lib/server/widget/security';
import { markWidgetSeen, takeRateLimit } from '@/lib/server/widget/repository';
type Context = { params: Promise<{ id: string }> };
export async function OPTIONS(request: Request, context: Context) { return widgetOptions(request, (await context.params).id); }
export async function GET(request: Request, context: Context) {
  try {
    const { widget, origin } = await authorizeWidget(request, (await context.params).id);
    if (!await takeRateLimit(`config:${widget.id}`, 300)) throw new WidgetError('Слишком много запросов', 429);
    await markWidgetSeen(widget.id, origin);
    return widgetResponse(request, { success: true, widget: publicWidget(widget) });
  } catch (error) { return widgetFailure(request, error); }
}
