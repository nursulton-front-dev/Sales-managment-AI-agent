import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
export async function POST(req: NextRequest) {
  try {
    const identity = await auth.api.getSession({ headers: req.headers });
    if (!identity) return NextResponse.json({ success: false, error: 'Требуется вход в аккаунт' }, { status: 401 });
    await auth.api.sendVerificationOTP({ headers: req.headers, body: { email: identity.user.email, type: 'email-verification' } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: 'Не удалось отправить код. Проверьте доступность почты и повторите позже.' }, { status: 400 }); }
}
