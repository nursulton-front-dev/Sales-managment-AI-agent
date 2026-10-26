import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createWorkspace, getWorkspaceByEmail, hasClaimedTrial, recordTrialGrant } from '@/src/db';
import { publicWorkspace } from '@/lib/server/public-data';

export async function POST(req: NextRequest) {
  try {
    const identity = await auth.api.getSession({ headers: req.headers });
    if (!identity) return NextResponse.json({ success: false, error: 'Сначала создайте аккаунт' }, { status: 401 });
    const body = await req.json();
    const email = identity.user.email.toLowerCase();
    const existing = await getWorkspaceByEmail(email);
    let workspace = existing;
    if (!workspace) {
      if (typeof body.companyName !== 'string' || !body.companyName.trim() || body.companyName.length > 200) return NextResponse.json({ success: false, error: 'Укажите название компании' }, { status: 400 });
      const phone = typeof body.ownerPhone === 'string' ? body.ownerPhone.slice(0, 40) : '';
      const trialEligible = identity.user.emailVerified && !await hasClaimedTrial(email, phone);
      workspace = await createWorkspace({ id: `ws_${crypto.randomUUID()}`, companyName: body.companyName.trim(), niche: typeof body.niche === 'string' ? body.niche.slice(0, 100) : 'other', ownerName: identity.user.name, ownerEmail: email, ownerPhone: phone, passwordHash: 'managed-by-auth', teamSize: '1', dailyLeadsVolume: '<20', plan: 'trial', tokenBalance: trialEligible ? 100 : 0, status: 'active', emailVerified: identity.user.emailVerified, subExpiresAt: new Date(Date.now() + 3 * 86400000) });
      if (trialEligible) await recordTrialGrant(email, phone, workspace.id, 100);
    }
    const response = NextResponse.json({ success: true, workspace: publicWorkspace(workspace) });
    response.cookies.set('ai_os_workspace_id', workspace.id, { path: '/', httpOnly: true, secure: req.nextUrl.protocol === 'https:', sameSite: 'lax', maxAge: 86400 * 30 });
    return response;
  } catch { return NextResponse.json({ success: false, error: 'Не удалось создать компанию. Повторите позже.' }, { status: 500 }); }
}
