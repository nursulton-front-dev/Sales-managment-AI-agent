import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/lib/auth';
import { db, getWorkspaceByEmail, updateWorkspace } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { validatePasswordPolicy } from '@/lib/password';
import { publicWorkspace } from '@/lib/server/public-data';

function splitAtLastColon(input: string): [string, string] {
  const idx = input.lastIndexOf(':');
  if (idx === -1) return [input, ''];
  return [input.slice(0, idx), input.slice(idx + 1)];
}

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
    const { email, code, newPassword } = await req.json();
    if (!email || typeof email !== 'string' || !code || typeof code !== 'string' || !newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ success: false, error: 'Заполните все обязательные поля' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // 1. Validate new password strength policy
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return NextResponse.json({ success: false, error: policy.error }, { status: 400 });
    }

    // Check user & workspace existence
    let existingUser = null;
    if (db) {
      const userRows = await db.select().from(schema.users).where(eq(schema.users.email, cleanEmail)).limit(1);
      if (userRows.length > 0) existingUser = userRows[0];
    }
    const existingWorkspace = await getWorkspaceByEmail(cleanEmail);

    if (!existingUser && !existingWorkspace) {
      return NextResponse.json({ success: false, error: 'Неверный проверочный код или срок его действия истёк' }, { status: 400 });
    }

    let finalUserId: string | null = null;

    // FLOW A: Existing Better Auth User
    if (existingUser) {
      finalUserId = existingUser.id;
      // Use Better Auth's native single-use atomic resetPasswordEmailOTP
      try {
        await auth.api.resetPasswordEmailOTP({
          headers: req.headers,
          body: {
            email: cleanEmail,
            otp: cleanCode,
            password: newPassword,
          },
        });
      } catch (baErr: unknown) {
        console.warn('[Better Auth resetPasswordEmailOTP failed]:', baErr);
        return NextResponse.json({
          success: false,
          error: 'Неверный или истёкший проверочный код. Попробуйте запросить новый.',
        }, { status: 400 });
      }

      // Requirement 3: Revoke previous sessions after password reset
      if (db) {
        await db.delete(schema.sessions).where(eq(schema.sessions.userId, existingUser.id));
      }
    } else if (existingWorkspace && db) {
      // FLOW B: Legacy workspace owner without Better Auth user/account
      const identifier = `legacy-migration:${cleanEmail}`;
      const records = await db.select().from(schema.verifications).where(eq(schema.verifications.identifier, identifier)).limit(1);
      const record = records[0];

      if (!record || record.expiresAt < new Date()) {
        if (record) await db.delete(schema.verifications).where(eq(schema.verifications.id, record.id));
        return NextResponse.json({
          success: false,
          error: 'Срок действия кода истёк или код не найден. Запросите новый код.',
        }, { status: 400 });
      }

      const [storedHash, attemptsStr] = splitAtLastColon(record.value);
      const attempts = parseInt(attemptsStr || '0', 10);
      if (attempts >= 3) {
        await db.delete(schema.verifications).where(eq(schema.verifications.id, record.id));
        return NextResponse.json({
          success: false,
          error: 'Превышено максимальное число попыток (3). Запросите проверочный код заново.',
        }, { status: 403 });
      }

      const inputHash = crypto.createHash('sha256').update(cleanCode).digest('base64url');
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
          SET value = split_part(value, ':', 1) || ':' || (COALESCE(NULLIF(split_part(value, ':', 2), ''), '0')::integer + 1),
              updated_at = NOW()
          WHERE id = ${record.id}
            AND identifier = ${identifier}
            AND expires_at > NOW()
            AND (COALESCE(NULLIF(split_part(value, ':', 2), ''), '0')::integer < 3)
          RETURNING value
        `);
        const updateRows = extractRows<{ value: string }>(updateResult);

        if (updateRows.length > 0) {
          const updatedVal = updateRows[0]?.value || '';
          const newAttempts = parseInt(splitAtLastColon(updatedVal)[1] || '1', 10);
          if (newAttempts >= 3) {
            await db.delete(schema.verifications).where(eq(schema.verifications.id, record.id));
            return NextResponse.json({
              success: false,
              error: 'Превышено максимальное число попыток (3). Запросите проверочный код заново.',
            }, { status: 403 });
          }
          return NextResponse.json({
            success: false,
            error: `Неверный проверочный код. Осталось попыток: ${3 - newAttempts}.`,
          }, { status: 400 });
        } else {
          // Record was already locked out (attempts >= 3), expired, or deleted
          await db.delete(schema.verifications).where(eq(schema.verifications.id, record.id));
          return NextResponse.json({
            success: false,
            error: 'Превышено максимальное число попыток (3) или срок действия кода истёк. Запросите проверочный код заново.',
          }, { status: 403 });
        }
      }

      // Single-use atomic consume: delete the verification row with returning check
      // ATOMICALLY checks actual expires_at > NOW() and attempts < 3 at redemption time!
      const deleteResult = await db.execute(sql`
        DELETE FROM ${schema.verifications}
        WHERE id = ${record.id}
          AND identifier = ${identifier}
          AND expires_at > NOW()
          AND (COALESCE(NULLIF(split_part(value, ':', 2), ''), '0')::integer < 3)
        RETURNING id, value
      `);
      const deletedRows = extractRows<{ id: string; value: string }>(deleteResult);

      if (deletedRows.length === 0) {
        // Clean up if a row with exhausted attempts or expired still exists
        await db.delete(schema.verifications).where(eq(schema.verifications.id, record.id));
        return NextResponse.json({
          success: false,
          error: 'Превышено максимальное число попыток (3), срок действия проверочного кода истёк или код уже был использован.',
        }, { status: 403 });
      }

      // Safe creation of Better Auth user and credential account
      const now = new Date();
      finalUserId = `u_${crypto.randomUUID()}`;
      const hashedPassword = await hashPassword(newPassword);

      await db.insert(schema.users).values({
        id: finalUserId,
        name: existingWorkspace.ownerName || cleanEmail.split('@')[0],
        email: cleanEmail,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(schema.accounts).values({
        id: `acc_${crypto.randomUUID()}`,
        userId: finalUserId,
        accountId: finalUserId,
        providerId: 'credential',
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });

      // Revoke any previous sessions for this userId
      await db.delete(schema.sessions).where(eq(schema.sessions.userId, finalUserId));
    }

    // Update workspace if exists: mark managed-by-auth and verified email
    let workspace = await getWorkspaceByEmail(cleanEmail);
    if (workspace) {
      workspace = await updateWorkspace(workspace.id, {
        passwordHash: 'managed-by-auth',
        emailVerified: true,
      });
    }

    // Automatically log user in with newly reset password and issue fresh session
    const signInResult = await auth.api.signInEmail({
      headers: req.headers,
      body: { email: cleanEmail, password: newPassword },
      asResponse: true,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Пароль успешно обновлён',
      workspace: workspace ? publicWorkspace(workspace) : null,
      hasWorkspace: Boolean(workspace),
    });

    if (signInResult) {
      for (const cookie of signInResult.headers.getSetCookie()) {
        response.headers.append('set-cookie', cookie);
      }
    }

    if (workspace) {
      response.cookies.set('ai_os_workspace_id', workspace.id, {
        httpOnly: true,
        secure: req.nextUrl.protocol === 'https:',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 30,
      });
    }

    return response;
  } catch (err: unknown) {
    console.error('Reset password error:', err);
    return NextResponse.json({
      success: false,
      error: 'Не удалось обновить пароль. Попробуйте ещё раз.',
    }, { status: 500 });
  }
}
