import { NextRequest, NextResponse, connection } from 'next/server';
import { adminCan } from '@/src/server/admin/access';
import { getChannelAdminStats } from '@/lib/server/admin/channels-stats';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await adminCan('channels');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Доступ разрешен только SuperAdmin платформы' },
        { status: 403 }
      );
    }

    const periodParam = req.nextUrl.searchParams.get('period');
    const period = periodParam === '7d' || periodParam === '30d' ? periodParam : 'today';

    const stats = await getChannelAdminStats(period);
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка при получении статистики каналов',
      },
      { status: 500 }
    );
  }
}
