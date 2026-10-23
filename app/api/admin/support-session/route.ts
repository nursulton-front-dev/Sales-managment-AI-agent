import { NextRequest, NextResponse, connection } from 'next/server';
import { createSupportSession, endSupportSession, getActiveSupportSession, getWorkspaceById } from '@/src/db';
import { getServerSessionContext, FOUNDER_SUPERADMIN_EMAIL } from '@/src/server/auth/session';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Доступ разрешен только super_admin платформы' }, { status: 403 });
    }

    const body = await req.json();
    const { targetWorkspaceId, reason } = body;

    if (!targetWorkspaceId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Обязательные поля: targetWorkspaceId, reason (причина входа)' },
        { status: 400 }
      );
    }

    const targetWs = await getWorkspaceById(targetWorkspaceId);
    if (!targetWs) {
      return NextResponse.json({ success: false, error: 'Организация не найдена' }, { status: 404 });
    }

    // Create audit log session
    const supportSession = await createSupportSession(
      FOUNDER_SUPERADMIN_EMAIL,
      targetWorkspaceId,
      reason
    );

    // Set cookie to target workspace
    const cookieStore = await cookies();
    cookieStore.set('ai_os_workspace_id', targetWorkspaceId, {
      path: '/',
      maxAge: 3600 * 2, // 2 hour max support window
      sameSite: 'lax',
    });

    return NextResponse.json({
      success: true,
      supportSession,
      targetWorkspace: targetWs,
      message: `Support-сессия активирована для "${targetWs.companyName}". Причина: ${reason}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (session.workspaceId) {
      const active = await getActiveSupportSession(session.workspaceId);
      if (active) {
        await endSupportSession(active.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Support-сессия завершена. Возврат в панель администратора.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
