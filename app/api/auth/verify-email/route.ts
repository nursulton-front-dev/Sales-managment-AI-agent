import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorkspaceByEmail, updateWorkspace, hasClaimedTrial, recordTrialGrant, recordTokenTransaction } from '@/src/db';
import { publicWorkspace } from '@/lib/server/public-data';
export async function POST(req: NextRequest) {
  try {
    const identity = await auth.api.getSession({ headers: req.headers });
    if (!identity) return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    const { code } = await req.json();
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return NextResponse.json({ success: false, error: 'Введите шестизначный код' }, { status: 400 });
    const result = await auth.api.verifyEmailOTP({ headers: req.headers, body: { email: identity.user.email, otp: code }, asResponse: true });
    if (!result.ok) return NextResponse.json({ success: false, error: 'Код неверен или истёк. Запросите новый.' }, { status: 400 });
    let workspace = await getWorkspaceByEmail(identity.user.email.toLowerCase());
    if (workspace && !workspace.emailVerified) {
      if (!await hasClaimedTrial(workspace.ownerEmail, workspace.ownerPhone)) {
        await recordTrialGrant(workspace.ownerEmail, workspace.ownerPhone, workspace.id, 100);
        await recordTokenTransaction({ workspaceId: workspace.id, actionType: 'trial_grant', tokensDelta: 100, description: 'Однократный бонус за подтверждение email' });
      }
      workspace = await updateWorkspace(workspace.id, { emailVerified: true, verificationCode: null });
    }
    const response = NextResponse.json({ success: true, workspace: workspace ? publicWorkspace(workspace) : undefined });
    for (const cookie of result.headers.getSetCookie()) response.headers.append('set-cookie', cookie);
    return response;
  } catch { return NextResponse.json({ success: false, error: 'Не удалось подтвердить email' }, { status: 400 }); }
}
