import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorkspaceByEmail, db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { publicWorkspace } from '@/lib/server/public-data';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Введите email и пароль' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await auth.api.signInEmail({
      headers: req.headers,
      body: { email: cleanEmail, password },
      asResponse: true,
    });

    if (!result.ok) {
      // Check if user is strictly a legacy workspace user without a Better Auth credential account
      let isLegacyAccount = false;
      const workspace = await getWorkspaceByEmail(cleanEmail);
      if (workspace && workspace.passwordHash && workspace.passwordHash.startsWith('hash_')) {
        if (db) {
          const baUser = await db.query.users.findFirst({
            where: eq(schema.users.email, cleanEmail),
          });
          if (!baUser) {
            isLegacyAccount = true;
          } else {
            const credAccount = await db.query.accounts.findFirst({
              where: and(
                eq(schema.accounts.userId, baUser.id),
                eq(schema.accounts.providerId, 'credential')
              ),
            });
            if (!credAccount) isLegacyAccount = true;
          }
        } else {
          isLegacyAccount = true;
        }
      }

      if (isLegacyAccount) {
        return NextResponse.json({
          success: false,
          code: 'NEED_PASSWORD_SETUP',
          error: 'Для вашего аккаунта необходимо задать надёжный пароль через восстановление доступа.',
        }, { status: 401 });
      }

      return NextResponse.json({ success: false, error: 'Неверный email или пароль' }, { status: 401 });
    }

    // REQUIREMENT 1: Forbid workspace access and ownership for unverified email
    if (db) {
      const baUser = await db.query.users.findFirst({
        where: eq(schema.users.email, cleanEmail),
      });
      if (baUser && !baUser.emailVerified) {
        const response = NextResponse.json({
          success: true,
          authenticated: true,
          emailVerified: false,
          hasWorkspace: false,
          redirectTo: '/register?step=1&verify=true',
          message: 'Подтвердите адрес электронной почты для доступа к рабочему пространству',
        });
        for (const cookie of result.headers.getSetCookie()) {
          response.headers.append('set-cookie', cookie);
        }
        return response;
      }
    }

    const workspace = await getWorkspaceByEmail(cleanEmail);
    if (!workspace) {
      // Authenticated with Better Auth, but workspace is not yet created
      const response = NextResponse.json({
        success: true,
        hasWorkspace: false,
        redirectTo: '/register?step=2',
        message: 'Завершите создание компании на странице регистрации',
      });
      for (const cookie of result.headers.getSetCookie()) {
        response.headers.append('set-cookie', cookie);
      }
      return response;
    }

    const response = NextResponse.json({
      success: true,
      hasWorkspace: true,
      workspace: publicWorkspace(workspace),
    });

    response.cookies.set('ai_os_workspace_id', workspace.id, {
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 30,
    });

    for (const cookie of result.headers.getSetCookie()) {
      response.headers.append('set-cookie', cookie);
    }

    return response;
  } catch (err: unknown) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Не удалось войти. Попробуйте ещё раз.' }, { status: 400 });
  }
}
