import { headers } from 'next/headers';
import { randomBytes, createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/src/db';
import { adminCan, rows } from '@/src/server/admin/access';
import { PLATFORM_OWNER_EMAIL, isStaffRole } from '@/src/server/admin/policy';
const fail = (error: string, status: number) => Response.json({ success: false, error }, { status });

export async function GET() {
  try {
    if (!await adminCan('team')) return fail('Доступ запрещён', 403);
    if (!db) return fail('База данных недоступна', 503);
    const members = rows(await db.execute(sql`SELECT email, role, status, expires_at, updated_at FROM platform_admin_access ORDER BY updated_at DESC`));
    const events = rows(await db.execute(sql`SELECT actor_email, target_email, action, role, created_at FROM platform_admin_access_events ORDER BY id DESC LIMIT 100`));
    return Response.json({ success: true, owner: PLATFORM_OWNER_EMAIL, members, events }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('Не удалось загрузить доступы. Проверьте миграцию админки.', 503); }
}

export async function POST(req: Request) {
  try {
    // Same-origin guard supplements cookie SameSite for privileged mutations.
    if (req.headers.get('origin') !== new URL(req.url).origin) return fail('Недопустимый источник запроса', 403);
    const body = await req.json();
    if (!db) return fail('База данных недоступна', 503);
    if (body.action === 'accept') {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user.emailVerified) return fail('Войдите с подтверждённым email приглашения', 403);
      if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) return fail('Недействительное приглашение', 400);
      const email = session.user.email.trim().toLowerCase();
      const hash = createHash('sha256').update(body.token).digest('hex');
      const accepted = rows(await db.execute(sql`
        WITH changed AS (
          UPDATE platform_admin_access SET status = 'active', user_id = ${session.user.id}, token_hash = NULL, expires_at = NULL, updated_at = NOW()
          WHERE email = ${email} AND token_hash = ${hash} AND status = 'pending' AND expires_at > NOW()
          RETURNING email, role
        ), logged AS (
          INSERT INTO platform_admin_access_events(actor_email, target_email, action, role)
          SELECT ${email}, email, 'accept', role FROM changed
        ) SELECT role FROM changed
      `));
      return accepted.length ? Response.json({ success: true }) : fail('Приглашение истекло, отозвано или предназначено другому email', 400);
    }
    const admin = await adminCan('team');
    if (!admin) return fail('Только главный администратор управляет доступом', 403);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || email === PLATFORM_OWNER_EMAIL) return fail('Укажите email сотрудника. Доступ владельца неизменяем.', 400);
    if (body.action === 'invite') {
      if (!isStaffRole(body.role)) return fail('Недопустимая роль', 400);
      const token = randomBytes(32).toString('hex');
      const hash = createHash('sha256').update(token).digest('hex');
      const changed = rows(await db.execute(sql`
        WITH changed AS (
          INSERT INTO platform_admin_access(email, role, status, token_hash, expires_at)
          VALUES (${email}, ${body.role}, 'pending', ${hash}, NOW() + INTERVAL '24 hours')
          ON CONFLICT(email) DO UPDATE SET role = EXCLUDED.role, status = 'pending', user_id = NULL,
            token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, updated_at = NOW()
          WHERE platform_admin_access.status <> 'active'
          RETURNING email, role
        ), logged AS (
          INSERT INTO platform_admin_access_events(actor_email, target_email, action, role)
          SELECT ${admin.userEmail}, email, 'invite', role FROM changed
        ) SELECT email FROM changed
      `));
      return changed.length ? Response.json({ success: true, invitationPath: `/admin-invite#${token}` }) : fail('Сотрудник уже активен. Используйте смену роли.', 409);
    }
    if (body.action !== 'revoke' && body.action !== 'change_role') return fail('Неизвестное действие', 400);
    if (body.action === 'change_role' && !isStaffRole(body.role)) return fail('Недопустимая роль', 400);
    const changed = rows(await db.execute(sql`
      WITH changed AS (
        UPDATE platform_admin_access SET
          role = CASE WHEN ${body.action} = 'change_role' THEN ${isStaffRole(body.role) ? body.role : 'support'} ELSE role END,
          status = CASE WHEN ${body.action} = 'revoke' THEN 'revoked' ELSE status END,
          token_hash = NULL, expires_at = NULL, updated_at = NOW()
        WHERE email = ${email} AND (${body.action} = 'revoke' OR status = 'active') RETURNING email, role
      ), logged AS (
        INSERT INTO platform_admin_access_events(actor_email, target_email, action, role)
        SELECT ${admin.userEmail}, email, ${body.action}, role FROM changed
      ) SELECT email FROM changed
    `));
    return changed.length ? Response.json({ success: true }) : fail('Активный сотрудник не найден', 404);
  } catch { return fail('Не удалось изменить доступ. Проверьте миграцию админки.', 503); }
}
