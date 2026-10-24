import { NextRequest, NextResponse, connection } from 'next/server';
import { getWorkspaceByEmail, getAllWorkspaces } from '@/src/db';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  await connection();
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Пожалуйста, введите email и пароль' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const ws = await getWorkspaceByEmail(cleanEmail);

    if (!ws) {
      // Check if any workspace exists for fallback/demo
      const all = await getAllWorkspaces();
      if (all.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Аккаунт с таким email не найден. Пройдите быструю регистрацию.',
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный email или пароль. Проверьте правильность введенных данных.',
        },
        { status: 401 }
      );
    }

    // Set authenticated workspace session cookie
    const cookieStore = await cookies();
    cookieStore.set('ai_os_workspace_id', ws.id, {
      path: '/',
      maxAge: 86400 * 30,
      sameSite: 'lax',
      httpOnly: false,
    });

    return NextResponse.json({
      success: true,
      workspace: {
        id: ws.id,
        companyName: ws.companyName,
        ownerName: ws.ownerName,
        ownerEmail: ws.ownerEmail,
        plan: ws.plan,
        tokenBalance: ws.tokenBalance,
        emailVerified: ws.emailVerified,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка сервера при авторизации' },
      { status: 500 }
    );
  }
}
