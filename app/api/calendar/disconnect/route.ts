import { NextRequest, NextResponse } from 'next/server';
import { updateWorkspace, getWorkspaceById, getAllWorkspaces } from '@/src/db';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await req.json().catch(() => ({}));
    const cookieStore = await cookies();
    const targetId = workspaceId || cookieStore.get('ai_os_workspace_id')?.value;

    let ws = null;
    if (targetId) {
      ws = await getWorkspaceById(targetId);
    }
    if (!ws) {
      const all = await getAllWorkspaces();
      if (all.length > 0) ws = all[0];
    }

    if (ws) {
      await updateWorkspace(ws.id, {
        googleCalendarConnected: false,
        googleRefreshToken: null,
        googleCalendarEmail: null,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Google Календарь успешно отключен',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
