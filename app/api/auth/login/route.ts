import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendAuthEmailOTP } from '@/lib/auth';
import { getWorkspaceByEmail, db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyPassword } from 'better-auth/crypto';

function extractRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as T[];
  if (typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, rememberMe } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Введите email и пароль' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    if (!db) {
      return NextResponse.json({ success: false, error: 'Сервер авторизации временно недоступен' }, { status: 503 });
    }

    // 0. Pre-Auth Rate Limiting: protect against brute-force attacks by IP and target account
    const ipLimitId = `rate-limit:login-ip:${clientIp}`;
    const failedLimitId = `rate-limit:login-failed:${cleanEmail}`;

    // A. IP throttle: max 30 attempts per 5 minutes per IP
    const ipRes = await db.execute(sql`
      INSERT INTO ${schema.verifications} (id, identifier, value, expires_at, created_at, updated_at)
      VALUES (${ipLimitId}, ${ipLimitId}, '1', NOW() + INTERVAL '5 minutes', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET value = (CASE WHEN verifications.expires_at <= NOW() THEN 1 ELSE (COALESCE(NULLIF(verifications.value, ''), '0')::integer + 1) END)::text,
          expires_at = (CASE WHEN verifications.expires_at <= NOW() THEN NOW() + INTERVAL '5 minutes' ELSE verifications.expires_at END),
          updated_at = NOW()
      RETURNING value
    `);
    const ipAttempts = parseInt(extractRows<{ value: string }>(ipRes)[0]?.value || '1', 10);
    if (ipAttempts > 30) {
      return NextResponse.json(
        { success: false, error: 'Слишком много попыток входа с вашего IP-адреса. Пожалуйста, подождите 5 минут.' },
        { status: 429 }
      );
    }

    // B. Account lockout: max 5 failed attempts per 5 minutes per email
    const failedCheck = await db.select().from(schema.verifications).where(eq(schema.verifications.id, failedLimitId)).limit(1);
    if (failedCheck[0] && failedCheck[0].expiresAt > new Date() && parseInt(failedCheck[0].value || '0', 10) >= 5) {
      return NextResponse.json(
        { success: false, error: 'Слишком много неудачных попыток входа для этого аккаунта. Пожалуйста, подождите 5 минут.' },
        { status: 429 }
      );
    }

    // 1. Verify credential account & password
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, cleanEmail),
    });

    let isPasswordCorrect = false;

    if (user) {
      const credAccount = await db.query.accounts.findFirst({
        where: and(
          eq(schema.accounts.userId, user.id),
          eq(schema.accounts.providerId, 'credential')
        ),
      });

      if (credAccount && credAccount.password) {
        try {
          isPasswordCorrect = await verifyPassword({
            hash: credAccount.password,
            password,
          });
        } catch {
          isPasswordCorrect = false;
        }
      }
    }

    if (!isPasswordCorrect) {
      // Increment failed attempts for this email
      await db.execute(sql`
        INSERT INTO ${schema.verifications} (id, identifier, value, expires_at, created_at, updated_at)
        VALUES (${failedLimitId}, ${failedLimitId}, '1', NOW() + INTERVAL '5 minutes', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
        SET value = (CASE WHEN verifications.expires_at <= NOW() THEN 1 ELSE (COALESCE(NULLIF(verifications.value, ''), '0')::integer + 1) END)::text,
            expires_at = (CASE WHEN verifications.expires_at <= NOW() THEN NOW() + INTERVAL '5 minutes' ELSE verifications.expires_at END),
            updated_at = NOW()
      `);

      // Check if user is strictly a legacy workspace user without a Better Auth credential account
      const workspace = await getWorkspaceByEmail(cleanEmail);
      if (workspace && workspace.passwordHash && workspace.passwordHash.startsWith('hash_')) {
        return NextResponse.json({
          success: false,
          code: 'NEED_PASSWORD_SETUP',
          error: 'Для вашего аккаунта необходимо задать надёжный пароль через восстановление доступа.',
        }, { status: 401 });
      }

      return NextResponse.json({ success: false, error: 'Неверный email или пароль' }, { status: 401 });
    }

    // Password is correct: clear failed attempts for this email
    await db.delete(schema.verifications).where(eq(schema.verifications.id, failedLimitId));

    // 2. Atomic 60-second cooldown check in shared storage (verifications table)
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
        error: 'Пожалуйста, подождите 60 секунд перед повторным запросом кода подтверждения.',
      }, { status: 429 });
    }

    // 3. Invalidate any existing login attempts for this email
    await db.execute(sql`
      DELETE FROM ${schema.verifications}
      WHERE identifier LIKE ${'login-otp:' + cleanEmail + ':%'}
    `);

    // 4. Generate unique loginAttemptId & cryptographically secure 6-digit OTP
    const loginAttemptId = 'att_' + crypto.randomUUID().replace(/-/g, '');
    const otp = crypto.randomInt(100000, 1000000).toString();
    const salt = process.env.BETTER_AUTH_SECRET || 'gapchi-login-secret-salt';
    const hashedCode = crypto
      .createHash('sha256')
      .update(`${salt}:${cleanEmail}:${loginAttemptId}:${otp}`)
      .digest('base64url');

    const attemptRowId = `login-attempt:${loginAttemptId}`;
    const attemptIdentifier = `login-otp:${cleanEmail}:${loginAttemptId}`;
    const rememberMeFlag = rememberMe ? '1' : '0';

    // Store in schema.verifications with 10-minute TTL and 0 initial attempts
    await db.insert(schema.verifications).values({
      id: attemptRowId,
      identifier: attemptIdentifier,
      value: `${hashedCode}:0:${rememberMeFlag}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Send login verification email via Resend
    try {
      await sendAuthEmailOTP({
        email: cleanEmail,
        otp,
        type: 'login-verification',
      });
    } catch (sendErr: unknown) {
      // Clean up verification attempt so user can retry cleanly without being locked
      await db.delete(schema.verifications).where(eq(schema.verifications.id, attemptRowId));
      console.error('[Login 2FA Email Error]:', sendErr);
      return NextResponse.json({
        success: false,
        error: sendErr instanceof Error ? sendErr.message : 'Не удалось отправить письмо с кодом. Повторите позже.',
      }, { status: 500 });
    }

    // 6. Return response requiring 2FA. NO session cookies are attached!
    // Server access remains 100% blocked until verify-code succeeds.
    return NextResponse.json({
      success: true,
      requires2FA: true,
      loginAttemptId,
      maskedEmail: maskEmail(cleanEmail),
      resendCooldown: 60,
    });
  } catch (err: unknown) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Не удалось войти. Попробуйте ещё раз.' }, { status: 500 });
  }
}
