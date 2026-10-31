import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createWorkspace, getWorkspaceByEmail, hasClaimedTrial, recordTrialGrant, recordTokenTransaction } from '@/src/db';
import { publicWorkspace } from '@/lib/server/public-data';

export async function POST(req: NextRequest) {
  try {
    const identity = await auth.api.getSession({ headers: req.headers });
    if (!identity?.user) {
      return NextResponse.json({ success: false, error: 'Сначала выполните вход или подтвердите email' }, { status: 401 });
    }

    // REQUIREMENT 1: Prohibit workspace creation or binding ownership to unverified email
    if (!identity.user.emailVerified) {
      return NextResponse.json({
        success: false,
        error: 'Создание компании и привязка владения разрешены только для подтверждённого адреса электронной почты.',
      }, { status: 403 });
    }

    const body = await req.json();
    const email = identity.user.email.toLowerCase();
    const existing = await getWorkspaceByEmail(email);
    let workspace = existing;

    if (!workspace) {
      if (typeof body.companyName !== 'string' || !body.companyName.trim() || body.companyName.length > 200) {
        return NextResponse.json({ success: false, error: 'Укажите название компании (до 200 символов)' }, { status: 400 });
      }

      const phone = typeof body.ownerPhone === 'string' ? body.ownerPhone.slice(0, 40) : '';
      const isEmailVerified = Boolean(identity.user.emailVerified);
      const trialClaimed = await hasClaimedTrial(email, phone);
      const trialEligible = isEmailVerified && !trialClaimed;

      // All newly created workspaces start on 'trial'. Paid plans require checkout.
      // Initial balance is 0, and if trialEligible, 100 tokens are granted via recordTokenTransaction
      // to ensure single ledger entry and prevent double-granting.
      workspace = await createWorkspace({
        id: `ws_${crypto.randomUUID()}`,
        companyName: body.companyName.trim(),
        niche: typeof body.niche === 'string' ? body.niche.slice(0, 100) : 'other',
        ownerName: identity.user.name || (typeof body.ownerName === 'string' ? body.ownerName.slice(0, 200) : 'Владелец'),
        ownerEmail: email,
        ownerPhone: phone,
        passwordHash: 'managed-by-auth',
        teamSize: typeof body.teamSize === 'string' ? body.teamSize : '1',
        dailyLeadsVolume: typeof body.dailyLeadsVolume === 'string' ? body.dailyLeadsVolume : '<20',
        plan: 'trial',
        tokenBalance: 0,
        status: 'active',
        emailVerified: isEmailVerified,
        subExpiresAt: new Date(Date.now() + 3 * 86400000),
      });

      if (trialEligible) {
        await recordTrialGrant(email, phone, workspace.id, 100);
        await recordTokenTransaction({
          workspaceId: workspace.id,
          actionType: 'trial_grant',
          tokensDelta: 100,
          description: 'Бонус за регистрацию и подтверждение email',
        });
        workspace.tokenBalance = 100;
      }
    }

    const response = NextResponse.json({
      success: true,
      workspace: publicWorkspace(workspace),
      message: 'Рабочее пространство успешно настроено',
    });

    response.cookies.set('ai_os_workspace_id', workspace.id, {
      path: '/',
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 86400 * 30,
    });

    return response;
  } catch (err: unknown) {
    console.error('Registration finish error:', err);
    return NextResponse.json({ success: false, error: 'Не удалось создать компанию. Повторите позже.' }, { status: 500 });
  }
}
