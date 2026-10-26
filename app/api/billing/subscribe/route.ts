import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { PLANS_LIST } from '@/lib/pricing';
export async function POST(req: NextRequest) {
  const session = await getServerSessionContext();
  if (!session.workspaceId) return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
  const { planId } = await req.json();
  if (!PLANS_LIST.some((plan) => plan.id === planId)) return NextResponse.json({ success: false, error: 'Неизвестный тариф' }, { status: 400 });
  // A browser request is not proof of payment. Activate only from a verified provider event.
  return NextResponse.json({ success: false, error: 'Онлайн-оплата пока недоступна' }, { status: 503 });
}
