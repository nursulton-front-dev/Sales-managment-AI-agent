import { sql } from 'drizzle-orm';
import { getServerSessionContext } from '@/src/server/auth/session';
import { db } from '@/src/db';
import { completeReservation } from '@/lib/calendar/reservations';

export async function GET() {
  const session = await getServerSessionContext();
  if (!session.workspaceId) return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
  if (!db) return Response.json({ error: 'Хранилище записи недоступно' }, { status: 503 });
  try {
    const result = await db.execute(sql`SELECT id, starts_at, ends_at, status, updated_at FROM calendar_reservations
      WHERE workspace_id = ${session.workspaceId} ORDER BY updated_at DESC LIMIT 50`);
    return Response.json({ reservations: result.rows });
  } catch {
    return Response.json({ error: 'Не удалось загрузить записи' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSessionContext();
  if (!session.workspaceId || !session.workspace) return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  if (!db) return Response.json({ error: 'Хранилище записи недоступно' }, { status: 503 });
  try {
    const body = await request.json();
    if (typeof body.id !== 'string' || body.id.length > 100 || !['reconcile', 'release'].includes(body.action)) return Response.json({ error: 'Некорректный запрос' }, { status: 400 });
    if (body.action === 'release') {
      // Only before the durable create boundary; a late worker's CAS will then fail.
      const result = await db.execute(sql`UPDATE calendar_reservations SET status = 'rejected', updated_at = now()
        WHERE id = ${body.id} AND workspace_id = ${session.workspaceId} AND status = 'reserved' RETURNING id`);
      return Response.json({ released: result.rows.length === 1 }, { status: result.rows.length ? 200 : 409 });
    }
    const result = await db.execute(sql`SELECT * FROM calendar_reservations WHERE id = ${body.id} AND workspace_id = ${session.workspaceId}`);
    const row = result.rows[0];
    if (!row) return Response.json({ error: 'Запись не найдена' }, { status: 404 });
    if (row.status === 'reserved') return Response.json({ error: 'Создание не начиналось. Можно освободить резерв.' }, { status: 409 });
    if (!session.workspace.googleRefreshToken) return Response.json({ error: 'Подключите календарь для проверки результата' }, { status: 409 });
    // This path only reconciles an existing create; it never sends another create request.
    const outcome = await completeReservation(row as unknown as Parameters<typeof completeReservation>[0], session.workspace.googleRefreshToken);
    return Response.json(outcome);
  } catch {
    return Response.json({ error: 'Результат пока не подтверждён. Повторите проверку позже.' }, { status: 503 });
  }
}
