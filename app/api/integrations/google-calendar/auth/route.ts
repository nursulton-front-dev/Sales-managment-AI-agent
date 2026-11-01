import { NextRequest } from 'next/server';
import { GET as calendarAuthHandler } from '@/app/api/calendar/auth/route';

export async function GET(req: NextRequest) {
  return calendarAuthHandler(req);
}

