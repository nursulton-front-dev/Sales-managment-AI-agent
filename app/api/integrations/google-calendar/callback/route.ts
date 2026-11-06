import { NextRequest } from 'next/server';
import { GET as handleCalendarCallback } from '@/app/api/calendar/callback/route';

export async function GET(req: NextRequest) {
  return handleCalendarCallback(req);
}

