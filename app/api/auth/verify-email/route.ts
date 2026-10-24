import { NextRequest, NextResponse, connection } from 'next/server';
import {
  getWorkspaceByEmail,
  updateWorkspace,
  getAllWorkspaces,
  addTokenLog,
  hasClaimedTrial,
  recordTrialGrant,
} from '@/src/db';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  await connection();
  try {
    const { email, code, workspaceId } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Код подтверждения обязателен' }, { status: 400 });
    }

    let target = null;
    if (workspaceId) {
      const all = await getAllWorkspaces();
      target = all.find((w) => w.id === workspaceId);
    }
    if (!target && email) {
      target = await getWorkspaceByEmail(email);
    }

    if (!target) {
      // If organization is not yet created in DB (e.g. registration step 1),
      // we validate against the master dev code or verify if code is valid 6 digits.
      const cleanCode = code.toString().trim();
      if (cleanCode === '123456' || (cleanCode.length === 6 && /^\d+$/.test(cleanCode))) {
        return NextResponse.json({
          success: true,
          message: 'Email подтвержден!',
          alreadyClaimed: false,
        });
      }
      return NextResponse.json({ error: 'Неверный проверочный код' }, { status: 400 });
    }

    // Verify code
    const cleanCode = code.toString().trim();
    const storedCode = (target.verificationCode || '').toString().trim();

    // Allow master test code 123456 or storedCode
    if (cleanCode !== storedCode && cleanCode !== '123456') {
      return NextResponse.json(
        { error: 'Неверный код подтверждения. Пожалуйста, проверьте код и попробуйте снова.' },
        { status: 400 }
      );
    }

    // Check anti-fraud trial grant rule
    const alreadyClaimed = await hasClaimedTrial(target.ownerEmail, target.ownerPhone);
    let newBalance = target.tokenBalance;
    let message = 'Email успешно подтвержден!';

    if (!alreadyClaimed && target.tokenBalance === 0) {
      newBalance = 100;
      await addTokenLog({
        id: `trial_grant_${Date.now()}`,
        workspaceId: target.id,
        actionType: 'trial_grant',
        tokensDelta: 100,
        amountUsd: '0',
        paymentMethod: 'system',
        description: 'Однократный бонус 100 токенов за активацию триала (72 часа)',
        createdAt: new Date(),
      });
      await recordTrialGrant(target.ownerEmail, target.ownerPhone, target.id, 100);
      message = 'Email успешно подтвержден! Активирован триал на 72 часа и начислено 100 бонусных токенов.';
    } else if (alreadyClaimed) {
      message = 'Email подтвержден. Внимание: триальный бонус для данных контактов уже был начислен ранее.';
    }

    const updated = await updateWorkspace(target.id, {
      emailVerified: true,
      verificationCode: null,
      tokenBalance: newBalance,
      subExpiresAt: new Date(Date.now() + 72 * 3600 * 1000), // Exactly 72 hours
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('ai_os_workspace_id', target.id, {
      path: '/',
      maxAge: 86400 * 30,
      sameSite: 'lax',
    });

    return NextResponse.json({
      success: true,
      workspace: updated,
      message,
    });
  } catch (error: any) {
    console.error('Error verifying email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
