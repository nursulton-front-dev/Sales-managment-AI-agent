import { NextRequest, NextResponse, connection } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { adminCan } from '@/src/server/admin/access';

export async function GET(req: NextRequest) {
  await connection();
  const startTime = Date.now();

  let dbConnected = false;
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.includes('placeholder')) {
      const sql = neon(dbUrl);
      await sql`SELECT 1;`;
      dbConnected = true;
    }
  } catch {
    dbConnected = false;
  }

  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'));
  const betterAuthConfigured = Boolean(process.env.BETTER_AUTH_SECRET);
  const isHealthy = dbConnected && resendConfigured && betterAuthConfigured;

  // Check if caller is authenticated platform admin with operations rights
  const isAdmin = await adminCan('operations');

  if (!isAdmin) {
    // Public minimal health check: never expose internal infrastructure, table names or keys
    return NextResponse.json({
      status: isHealthy ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
    });
  }

  // Authenticated admin view: structured status without sensitive values or key prefixes
  return NextResponse.json({
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    services: {
      database: { status: dbConnected ? 'CONNECTED' : 'DISCONNECTED' },
      email: { status: resendConfigured ? 'CONFIGURED' : 'UNAVAILABLE' },
      auth: { status: betterAuthConfigured ? 'CONFIGURED' : 'SECRET_MISSING' },
    },
  });
}
