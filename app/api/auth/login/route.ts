import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorkspaceByEmail } from '@/src/db';
import { publicWorkspace } from '@/lib/server/public-data';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string') return NextResponse.json({ success: false, error: 'Введите email и пароль' }, { status: 400 });
    const result = await auth.api.signInEmail({ headers: req.headers, body: { email: email.trim().toLowerCase(), password }, asResponse: true });
    if (!result.ok) return NextResponse.json({ success: false, error: 'Неверный email или пароль' }, { status: 401 });
    const workspace = await getWorkspaceByEmail(email.trim().toLowerCase());
    const response = NextResponse.json(workspace ? { success: true, workspace: publicWorkspace(workspace) } : { success: false, error: 'Завершите создание компании на странице регистрации' });
    for (const cookie of result.headers.getSetCookie()) response.headers.append('set-cookie', cookie);
    if (workspace) response.cookies.set('ai_os_workspace_id', workspace.id, { httpOnly: true, secure: req.nextUrl.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 86400 * 30 });
    return response;
  } catch { return NextResponse.json({ success: false, error: 'Не удалось войти. Попробуйте ещё раз.' }, { status: 400 }); }
}
