import { timingSafeEqual } from 'node:crypto';
import { drainChannelEvents } from '@/lib/server/channels/processor';
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization') || '';
  const authorization = `Bearer ${expected}`;
  if (!expected || Buffer.byteLength(provided) !== Buffer.byteLength(authorization) || !timingSafeEqual(Buffer.from(provided), Buffer.from(authorization))) return Response.json({ success: false }, { status: 401 });
  try { return Response.json({ success: true, processed: await drainChannelEvents() }); }
  catch { console.error('Channel recovery failed'); return Response.json({ success: false }, { status: 500 }); }
}
