import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/lib/auth';
import { getWorkspaceByEmail, db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { publicWorkspace } from '@/lib/server/public-data';

function extractRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as T[];
  if (typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const { loginAttemptId, code } = await req.json();

    if (
      !loginAttemptId ||
      typeof loginAttemptId !== 'string' ||
      !code ||
      typeof code !== 'string'
    ) {
      return NextResponse.json({ success: false, error: 'Укажите попытку входа и проверочный код' }, { status: 400 });
    }

    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json({ success: false, error: 'Код должен состоять ровно из 6 цифр' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Сервер авторизации временно недоступен' }, { status: 503 });
    }

    const attemptRowId = `login-attempt:${loginAttemptId}`;
    const records = await db
      .select()
      .from(schema.verifications)
      .where(eq(schema.verifications.id, attemptRowId))
      .limit(1);

    const record = records[0];
    if (!record) {
      return NextResponse.json({
        success: false,
        error: 'Попытка входа не найдена или срок действия кода истёк. Пожалуйста, начните вход заново.',
        restartRequired: true,
      }, { status: 400 });
    }

    const now = new Date();
    if (record.expiresAt <= now) {
      await db.delete(schema.verifications).where(eq(schema.verifications.id, attemptRowId));
      return NextResponse.json({
        success: false,
        error: 'Срок действия проверочного кода истёк (10 минут). Пожалуйста, начните вход заново.',
        restartRequired: true,
      }, { status: 400 });
    }

    const [storedHash, attemptsStr, rememberMeStr] = record.value.split(':');
    const attempts = parseInt(attemptsStr || '0', 10);
    const rememberMe = rememberMeStr === '1';

    if (attempts >= 3) {
      await db.delete(schema.verifications).where(eq(schema.verifications.id, attemptRowId));
      return NextResponse.json({
        success: false,
        error: 'Превышено максимальное число неверных попыток (3). Пожалуйста, начните вход заново.',
        restartRequired: true,
      }, { status: 403 });
    }

    // Extract user email safely from identifier 'login-otp:${cleanEmail}:${loginAttemptId}'
    const prefix = 'login-otp:';
    const suffix = `:${loginAttemptId}`;
    if (!record.identifier.startsWith(prefix) || !record.identifier.endsWith(suffix)) {
      await db.delete(schema.verifications).where(eq(schema.verifications.id, attemptRowId));
      return NextResponse.json({
        success: false,
        error: 'Недействительная попытка входа. Начните вход заново.',
        restartRequired: true,
      }, { status: 400 });
    }

    const cleanEmail = record.identifier.slice(prefix.length, record.identifier.length - suffix.length);
    const salt = process.env.BETTER_AUTH_SECRET || 'gapcha-login-secret-salt';
    const inputHash = crypto
      .createHash('sha256')
      .update(`${salt}:${cleanEmail}:${loginAttemptId}:${cleanCode}`)
      .digest('base64url');

    let isMatch = false;
    try {
      isMatch = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash));
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      // Atomic SQL increment to avoid race conditions between parallel invalid requests
      const updateResult = await db.execute(sql`
        UPDATE ${schema.verifications}
        SET value = split_part(value, ':', 1) || ':' || (COALESCE(NULLIF(split_part(value, ':', 2), ''), '0')::integer + 1) || ':' || split_part(value, ':', 3),
            updated_at = NOW()
        WHERE id = ${attemptRowId}
          AND expires_at > NOW()
          AND (COALESCE(NULLIF(split_part(value, ':', 2), ''), '0')::integer < 3)
        RETURNING value
      `);

      const updateRows = extractRows<{ value: string }>(updateResult);
      if (updateRows.length > 0) {
        const parts = updateRows[0].value.split(':');
        const newAttempts = parseInt(parts[1] || '1', 10);
        if (newAttempts >= 3) {
          await db.delete(schema.verifications).where(eq(schema.verifications.id, attemptRowId));
          return NextResponse.json({
            success: false,
            error: 'Превышено максимальное число неверных попыток (3). Пожалуйста, начните вход заново.',
            restartRequired: true,
          }, { status: 403 });
        }

        const remaining = 3 - newAttempts;
        return NextResponse.json({
          success: false,
          error: `Неверный проверочный код. Осталось попыток: ${remaining}.`,
          remainingAttempts: remaining,
        }, { status: 400 });
      } else {
        // Record was already locked out (attempts >= 3) or expired
        await db.delete(schema.verifications).where(eq(schema.verifications.id, attemptRowId));
        return NextResponse.json({
          success: false,
          error: 'Превышено максимальное число неверных попыток (3) или срок действия кода истёк.',
          restartRequired: true,
        }, { status: 403 });
      }
    }

    // 4. Atomic single-use redemption: atomically delete record
    const deleteResult = await db.execute(sql`
      DELETE FROM ${schema.verifications}
      WHERE id = ${attemptRowId}
        AND expires_at > NOW()
        AND (COALESCE(NULLIF(split_part(value, ':', 2), ''), '0')::integer < 3)
      RETURNING id
    `);

    const deletedRows = extractRows<{ id: string }>(deleteResult);
    if (deletedRows.length === 0) {
      await db.delete(schema.verifications).where(eq(schema.verifications.id, attemptRowId));
      return NextResponse.json({
        success: false,
        error: 'Код уже был использован или срок его действия истёк. Пожалуйста, начните вход заново.',
        restartRequired: true,
      }, { status: 403 });
    }

    // 5. Code is verified and consumed!
    // Issue Better Auth session using unified complete2FALogin endpoint
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, cleanEmail),
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const sessionResult = await auth.api.complete2FALogin({
      headers: req.headers,
      body: {
        userId: user.id,
        rememberMe,
      },
      asResponse: true,
    });

    if (!sessionResult.ok) {
      console.error('[complete2FALogin Failed]:', await sessionResult.text());
      return NextResponse.json({ success: false, error: 'Не удалось создать сессию. Попробуйте ещё раз.' }, { status: 500 });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      const response = NextResponse.json({
        success: true,
        authenticated: true,
        emailVerified: false,
        hasWorkspace: false,
        redirectTo: '/register?step=1&verify=true',
        message: 'Подтвердите адрес электронной почты для доступа к рабочему пространству',
      });
      for (const cookie of sessionResult.headers.getSetCookie()) {
        response.headers.append('set-cookie', cookie);
      }
      return response;
    }

    // Check workspace existence
    const workspace = await getWorkspaceByEmail(cleanEmail);
    if (!workspace) {
      const response = NextResponse.json({
        success: true,
        hasWorkspace: false,
        redirectTo: '/register?step=2',
        message: 'Завершите создание компании на странице регистрации',
      });
      for (const cookie of sessionResult.headers.getSetCookie()) {
        response.headers.append('set-cookie', cookie);
      }
      return response;
    }

    // Workspace exists: grant full access to dashboard
    const response = NextResponse.json({
      success: true,
      hasWorkspace: true,
      workspace: publicWorkspace(workspace),
      redirectTo: '/dashboard',
    });

    response.cookies.set('ai_os_workspace_id', workspace.id, {
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: rememberMe ? 86400 * 30 : undefined,
    });

    for (const cookie of sessionResult.headers.getSetCookie()) {
      response.headers.append('set-cookie', cookie);
    }

    return response;
  } catch (err: unknown) {
    console.error('Verify code error:', err);
    return NextResponse.json({ success: false, error: 'Не удалось проверить код. Попробуйте ещё раз.' }, { status: 500 });
  }
}
