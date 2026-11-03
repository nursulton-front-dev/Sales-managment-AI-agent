import { NextRequest, NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { retryStuckEvent } from '@/lib/server/admin/channels-stats';

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Доступ разрешен только SuperAdmin платформы' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Укажите идентификатор события (eventId)' },
        { status: 400 }
      );
    }

    const result = await retryStuckEvent(eventId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка при повторной обработке события',
      },
      { status: 500 }
    );
  }
}
