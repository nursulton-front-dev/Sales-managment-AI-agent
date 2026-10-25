import { NextRequest, NextResponse, connection } from 'next/server';
import { getWorkspaceById, updateWorkspace } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspace) {
      return NextResponse.json(
        { success: false, authenticated: false, error: 'Организация не найдена или сессия не авторизована' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      workspace: session.workspace,
      isSuperAdmin: session.isSuperAdmin,
      isImpersonating: session.isImpersonating,
      supportSessionReason: session.supportSessionReason,
      role: session.role,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    const { companyName, ownerPhone, googleCalendarWorkingHours, googleCalendarSlotDuration } = body;

    const updates: any = {};
    if (companyName) updates.companyName = companyName;
    if (ownerPhone) updates.ownerPhone = ownerPhone;
    if (googleCalendarWorkingHours) updates.googleCalendarWorkingHours = googleCalendarWorkingHours;
    if (googleCalendarSlotDuration) updates.googleCalendarSlotDuration = parseInt(googleCalendarSlotDuration, 10);

    const updated = await updateWorkspace(session.workspace.id, updates);
    return NextResponse.json({ success: true, workspace: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
