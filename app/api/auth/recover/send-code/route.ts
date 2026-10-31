import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth, sendAuthEmailOTP } from '@/lib/auth';
import { getWorkspaceByEmail, db } from '@/src/db';
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

// In-memory fallback map for process-level filtering
const emailCooldownMap = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const now = Date.now();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Укажите корректный email' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Fast local memory check
    const localLast = emailCooldownMap.get(cleanEmail);
    if (localLast && now - localLast < 60000) {
      return NextResponse.json({
        success: false,
        error: 'Пожалуйста, подождите 60 секунд перед повторным запросом кода.',
      }, { status: 429 });
    }

    // Atomic database-backed rate limiting reservation in shared storage
    // Guarantees cross-instance protection across all distributed Vercel lambdas
    if (db) {
      const rateLimitId = `rate-limit:recover:${cleanEmail}`;
      const rateLimitIdentifier = `rate-limit:recover:${cleanEmail}`;

      const res = await db.execute(sql`
        INSERT INTO ${schema.verifications} (id, identifier, value, expires_at, created_at, updated_at)
        VALUES (${rateLimitId}, ${rateLimitIdentifier}, ${clientIp}, NOW() + INTERVAL '60 seconds', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
        SET expires_at = NOW() + INTERVAL '60 seconds',
            updated_at = NOW(),
            value = EXCLUDED.value
        WHERE verifications.expires_at <= NOW()
        RETURNING id
      `);

      const rows = extractRows<{ id: string }>(res);
      if (rows.length === 0) {
        emailCooldownMap.set(cleanEmail, now);
        return NextResponse.json({
          success: false,
          error: 'Пожалуйста, подождите 60 секунд перед повторным запросом кода.',
        }, { status: 429 });
      }
    }

    emailCooldownMap.set(cleanEmail, now);

    // Uniform response: NEVER disclose whether account exists
    const uniformResponse = {
      success: true,
      message: 'Если указанный email зарегистрирован, на него отправлен 6-значный проверочный код.',
    };

    // Check user & workspace existence
    let existingUser = null;
    if (db) {
      const userRows = await db.select().from(schema.users).where(eq(schema.users.email, cleanEmail)).limit(1);
      if (userRows.length > 0) existingUser = userRows[0];
    }
    const existingWorkspace = await getWorkspaceByEmail(cleanEmail);

    // If neither exists, rate limit is already atomically reserved above. Return uniform 200.
    if (!existingUser && !existingWorkspace) {
      return NextResponse.json(uniformResponse);
    }

    // FLOW A: Existing Better Auth User
    if (existingUser) {
      try {
        await auth.api.requestPasswordResetEmailOTP({
          body: { email: cleanEmail },
          headers: req.headers,
        });
      } catch (baErr) {
        console.warn('[Better Auth Recovery Warning]:', baErr);
      }
      return NextResponse.json(uniformResponse);
    }

    // FLOW B: Legacy workspace owner without Better Auth user/account
    if (existingWorkspace && db) {
      const otp = Math.floor(100000 + crypto.randomInt(900000)).toString();
      const hash = crypto.createHash('sha256').update(otp).digest('base64url');
      const identifier = `legacy-migration:${cleanEmail}`;

      // Delete any existing legacy verification for this email
      await db.delete(schema.verifications).where(eq(schema.verifications.identifier, identifier));

      // Insert new single-use verification with max 3 attempts and 15 min expiry
      await db.insert(schema.verifications).values({
        id: `ver_${crypto.randomUUID()}`,
        identifier,
        value: `${hash}:0`, // hash:attempts
        expiresAt: new Date(now + 15 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Dispatch via unified mail transport
      await sendAuthEmailOTP({
        email: cleanEmail,
        otp,
        type: 'legacy-migration',
      });
    }

    return NextResponse.json(uniformResponse);
  } catch (err: unknown) {
    console.error('Recover send-code error:', err);
    return NextResponse.json({
      success: false,
      error: 'Не удалось обработать запрос на восстановление. Повторите позже.',
    }, { status: 500 });
  }
}
