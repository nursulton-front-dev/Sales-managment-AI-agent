import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendAuthEmailOTP } from '@/lib/auth';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';

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
    const { loginAttemptId } = await req.json();

    if (!loginAttemptId || typeof loginAttemptId !== 'string') {
      return NextResponse.json({ success: false, error: 'Укажите идентификатор попытки входа' }, { status: 400 });
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
        error: 'Попытка входа не найдена или срок действия кода истёк. Начните вход заново.',
        restartRequired: true,
      }, { status: 400 });
    }

    if (record.expiresAt <= new Date()) {
      await db.delete(schema.verifications).where(eq(schema.verifications.id, attemptRowId));
      return NextResponse.json({
        success: false,
        error: 'Срок действия сессии входа истёк. Начните вход заново.',
        restartRequired: true,
      }, { status: 400 });
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
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    // Atomic 60-second cooldown check in verifications table
    const rateLimitId = `rate-limit:login:${cleanEmail}`;
    const rateLimitRes = await db.execute(sql`
      INSERT INTO ${schema.verifications} (id, identifier, value, expires_at, created_at, updated_at)
      VALUES (${rateLimitId}, ${rateLimitId}, ${clientIp}, NOW() + INTERVAL '60 seconds', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET expires_at = NOW() + INTERVAL '60 seconds',
          updated_at = NOW(),
          value = EXCLUDED.value
      WHERE verifications.expires_at <= NOW()
      RETURNING id
    `);

    const rateLimitRows = extractRows<{ id: string }>(rateLimitRes);
    if (rateLimitRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Пожалуйста, подождите 60 секунд перед повторным запросом кода.',
      }, { status: 429 });
    }

    // Generate new fresh 6-digit OTP & invalidate previous one
    const newOtp = crypto.randomInt(100000, 1000000).toString();
    const salt = process.env.BETTER_AUTH_SECRET || 'gapchi-login-secret-salt';
    const newHash = crypto
      .createHash('sha256')
      .update(`${salt}:${cleanEmail}:${loginAttemptId}:${newOtp}`)
      .digest('base64url');

    const parts = record.value.split(':');
    const rememberMe = parts[2] || '0';

    await db
      .update(schema.verifications)
      .set({
        value: `${newHash}:0:${rememberMe}`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(schema.verifications.id, attemptRowId));

    // Send new OTP via Resend
    try {
      await sendAuthEmailOTP({
        email: cleanEmail,
        otp: newOtp,
        type: 'login-verification',
      });
    } catch (sendErr: unknown) {
      console.error('[Resend 2FA Error]:', sendErr);
      return NextResponse.json({
        success: false,
        error: sendErr instanceof Error ? sendErr.message : 'Не удалось отправить код повторно. Попробуйте позже.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Новый проверочный код отправлен на вашу почту.',
      resendCooldown: 60,
    });
  } catch (err: unknown) {
    console.error('Resend code error:', err);
    return NextResponse.json({ success: false, error: 'Не удалось отправить код повторно.' }, { status: 500 });
  }
}
