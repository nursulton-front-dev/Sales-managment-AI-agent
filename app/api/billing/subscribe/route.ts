import { NextRequest, NextResponse, connection } from 'next/server';
import { updateWorkspace, recordTokenTransaction, getWorkspaceById } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

const PLANS: Record<string, { name: string; usdPrice: string; tokens: number }> = {
  start: { name: 'START', usdPrice: '29', tokens: 2000 },
  business: { name: 'BUSINESS', usdPrice: '59', tokens: 6000 },
  pro: { name: 'PRO', usdPrice: '119', tokens: 15000 },
};

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspace) {
      return NextResponse.json({ success: false, error: 'Организация не найдена' }, { status: 404 });
    }

    const body = await req.json();
    const { planId, paymentMethod = 'direct' } = body;

    const plan = PLANS[planId?.toLowerCase()];
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Неизвестный тариф' }, { status: 400 });
    }

    // Update workspace plan and expiration (30 days)
    await updateWorkspace(session.workspace.id, {
      plan: planId.toLowerCase(),
      subExpiresAt: new Date(Date.now() + 30 * 86400 * 1000),
    });

    // Award plan tokens atomically and record payment
    const res = await recordTokenTransaction({
      workspaceId: session.workspace.id,
      actionType: 'subscription',
      tokensDelta: plan.tokens,
      amountUsd: plan.usdPrice,
      paymentMethod,
      description: `Активация подписки ${plan.name} (+${plan.tokens.toLocaleString()} токенов, $${plan.usdPrice}/мес через ${paymentMethod.toUpperCase()})`,
    });

    return NextResponse.json({
      success: true,
      newBalance: res.newBalance,
      plan: plan.name,
      message: `Тариф ${plan.name} успешно активирован! Начислено +${plan.tokens.toLocaleString()} токенов.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
