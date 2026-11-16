import { getServerSessionContext } from '@/src/server/auth/session';
import { getGoogleCalendarFreeBusy } from '@/lib/calendar/google';

/** Connectivity test is read-only. Bookings use the reservation coordinator. */
export async function POST(request: Request) {
  const session = await getServerSessionContext();
  if (!session.workspace) return Response.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ success: false, error: 'Недопустимый источник запроса' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.action !== 'check') return Response.json({ success: false, error: 'Этот endpoint проверяет подключение без создания или изменения встреч.', code: 'READ_ONLY_CHECK' }, { status: 409 });
  const token = session.workspace.googleRefreshToken;
  if (!session.workspace.googleCalendarConnected || !token) return Response.json({ success: false, error: 'Календарь не подключён' }, { status: 409 });
  try {
    const start = new Date();
    await getGoogleCalendarFreeBusy(token, start.toISOString(), new Date(start.getTime() + 3600000).toISOString());
    return Response.json({ success: true, message: 'Подключение к календарю проверено. События не создавались.', isLiveApi: true });
  } catch {
    return Response.json({ success: false, error: 'Не удалось проверить календарь. Попробуйте позже.' }, { status: 502 });
  }
}
