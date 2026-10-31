import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { TOKEN_PACKAGES } from '@/lib/pricing';
export async function POST(req: NextRequest) {
  const session = await getServerSessionContext();
  if (!session.workspaceId) return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
  const { packageId } = await req.json();
  if (!TOKEN_PACKAGES.some((pack) => pack.id === packageId)) return NextResponse.json({ success: false, error: 'Неизвестный пакет' }, { status: 400 });
  return NextResponse.json({ success: false, error: 'Онлайн-оплата пока недоступна' }, { status: 503 });
}
