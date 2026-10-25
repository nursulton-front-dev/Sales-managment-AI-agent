import { NextRequest, NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { getWorkspaceById, updateWorkspace } from '@/src/db';

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    if (!['owner', 'admin', 'super_admin'].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Недостаточно прав' }, { status: 403 });
    }

    const ws = await getWorkspaceById(session.workspaceId);
    if (!ws) {
      return NextResponse.json({ success: false, error: 'Организация не найдена' }, { status: 404 });
    }

    // Atomic disconnect: remove tokens, reset status, turn off autoReply
    await updateWorkspace(session.workspaceId, {
      instagramConnected: false,
      instagramUserId: null,
      instagramUsername: null,
      instagramAccessToken: null,
      instagramTokenExpiresAt: null,
      instagramScopes: [],
      instagramStatus: 'disconnected',
      instagramLastError: null,
      instagramAutoReply: false,
      instagramAgentId: null,
    });

    return NextResponse.json({
      success: true,
      message: 'Instagram-аккаунт успешно отключен. Все сохранённые токены удалены.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
