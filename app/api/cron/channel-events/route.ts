import { timingSafeEqual } from 'node:crypto';
import { drainChannelEvents } from '@/lib/server/channels/processor';

export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const url = new URL(request.url);
  const queryKey = url.searchParams.get('key');
  if (queryKey) {
    const bExpected = Buffer.from(expected);
    const bProvided = Buffer.from(queryKey);
    if (bExpected.length === bProvided.length && timingSafeEqual(bExpected, bProvided)) {
      return true;
    }
  }

  const provided = request.headers.get('authorization') || '';
  const authorization = `Bearer ${expected}`;
  const bAuth = Buffer.from(authorization);
  const bProvided = Buffer.from(provided);
  return bAuth.length === bProvided.length && timingSafeEqual(bAuth, bProvided);
}

async function handleCron(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const processed = await drainChannelEvents();
    return Response.json({
      success: true,
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Channel recovery failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
