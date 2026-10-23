import { NextRequest, NextResponse, connection } from 'next/server';
import { recordTokenTransaction, getWorkspaceById } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

const PACKAGES: Record<string, { name: string; tokens: number; usdPrice: string; uzsPrice: string }> = {
  'pack-mini': { name: 'Пакет Мини', tokens: 1000, usdPrice: '10', uzsPrice: '125 000 сум' },
  'pack-optima': { name: 'Пакет Оптима', tokens: 3000, usdPrice: '25', uzsPrice: '320 000 сум' },
  'pack-max': { name: 'Пакет Макс', tokens: 10000, usdPrice: '70', uzsPrice: '890 000 сум' },
};

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspace) {
      return NextResponse.json({ success: false, error: 'Организация не найдена' }, { status: 404 });
    }

    const body = await req.json();
    const { packageId, paymentMethod = 'direct' } = body;

    const pack = PACKAGES[packageId];
    if (!pack) {
      return NextResponse.json({ success: false, error: 'Неизвестный пакет токенов' }, { status: 400 });
    }

    // Atomic transaction in Neon DB
    const res = await recordTokenTransaction({
      workspaceId: session.workspace.id,
      actionType: 'topup',
      tokensDelta: pack.tokens,
      amountUsd: pack.usdPrice,
      paymentMethod,
      description: `Покупка ${pack.name} (+${pack.tokens.toLocaleString()} токенов, ${pack.usdPrice}$ через ${paymentMethod.toUpperCase()})`,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newBalance: res.newBalance,
      tokensAdded: pack.tokens,
      message: `Баланс успешно пополнен на +${pack.tokens.toLocaleString()} токенов!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
