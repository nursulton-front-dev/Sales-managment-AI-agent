import { publicWorkspace } from '@/lib/server/public-data';
import { NextRequest, NextResponse, connection } from 'next/server';
import { updateWorkspace } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET() {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.userEmail) {
      return NextResponse.json(
        { success: false, authenticated: false, error: 'Сессия не авторизована' },
        { status: 401 }
      );
    }

    if (!session.workspace) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        hasWorkspace: false,
        user: {
          name: session.userName,
          email: session.userEmail,
          emailVerified: session.userEmailVerified,
        },
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      hasWorkspace: true,
      workspace: publicWorkspace(session.workspace),
      isSuperAdmin: session.isSuperAdmin,
      isImpersonating: session.isImpersonating,
      supportSessionReason: session.supportSessionReason,
      role: session.role,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error instanceof Error ? error.message : 'Ошибка запроса') }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspace) {
      return NextResponse.json({ success: false, error: 'Организация не найдена' }, { status: 404 });
    }

    const body = await req.json();
    const { companyName, ownerName, ownerPhone, niche, googleCalendarWorkingHours, googleCalendarSlotDuration } = body;

    const updates: Parameters<typeof updateWorkspace>[1] = {};
    if (companyName !== undefined) {
      if (typeof companyName !== 'string' || !companyName.trim() || companyName.length > 200) return NextResponse.json({ success: false, error: 'Укажите название компании до 200 символов' }, { status: 400 });
      updates.companyName = companyName.trim();
    }
    if (typeof ownerName === 'string' && ownerName.trim() && ownerName.length <= 200) updates.ownerName = ownerName.trim();
    if (typeof niche === 'string' && niche.length <= 100) updates.niche = niche;
    if (typeof ownerPhone === 'string' && ownerPhone.length <= 40) updates.ownerPhone = ownerPhone;
    if (googleCalendarWorkingHours !== undefined) {
      if (typeof googleCalendarWorkingHours !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(googleCalendarWorkingHours) || googleCalendarWorkingHours.slice(0,5) >= googleCalendarWorkingHours.slice(6)) return NextResponse.json({ success: false, error: 'Проверьте рабочие часы' }, { status: 400 });
      updates.googleCalendarWorkingHours = googleCalendarWorkingHours;
    }
    if (googleCalendarSlotDuration !== undefined) {
      if (![15, 30, 45, 60, 90, 120].includes(Number(googleCalendarSlotDuration))) return NextResponse.json({ success: false, error: 'Некорректная длительность записи' }, { status: 400 });
      updates.googleCalendarSlotDuration = Number(googleCalendarSlotDuration);
    }

    const updated = await updateWorkspace(session.workspace.id, updates);
    return NextResponse.json({ success: true, workspace: updated ? publicWorkspace(updated) : null });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error instanceof Error ? error.message : 'Ошибка запроса') }, { status: 500 });
  }
}
