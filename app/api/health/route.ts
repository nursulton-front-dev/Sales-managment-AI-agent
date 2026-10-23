import { NextRequest, NextResponse, connection } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
import { isNeonConfigured } from '@/src/db';

export async function GET(req: NextRequest) {
  await connection();
  const startTime = Date.now();
  const checks: Record<string, any> = {};

  // 1. Neon Database Check
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.includes('placeholder')) {
      const sql = neon(dbUrl);
      const pingStart = Date.now();
      const dbRes = await sql`SELECT current_database(), now();`;
      const pingMs = Date.now() - pingStart;

      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;

      checks.neonPostgres = {
        status: 'CONNECTED',
        database: dbRes[0]?.current_database || 'neondb',
        pingMs,
        tablesCount: tables.length,
        tables: tables.map((t: any) => t.table_name),
      };
    } else {
      checks.neonPostgres = {
        status: 'LOCAL_FALLBACK',
        message: 'DATABASE_URL not configured, using JSON file store',
      };
    }
  } catch (err: any) {
    checks.neonPostgres = {
      status: 'ERROR',
      error: err.message,
    };
  }

  // 2. Resend API Check
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && resendKey.startsWith('re_')) {
      checks.resend = {
        status: 'CONFIGURED',
        apiKeyPrefix: resendKey.substring(0, 7) + '...',
      };
    } else {
      checks.resend = {
        status: 'MISSING_OR_INVALID',
        message: 'RESEND_API_KEY missing or not starting with re_',
      };
    }
  } catch (err: any) {
    checks.resend = {
      status: 'ERROR',
      error: err.message,
    };
  }

  // 3. Better Auth Check
  checks.betterAuth = {
    status: process.env.BETTER_AUTH_SECRET ? 'CONFIGURED' : 'SECRET_MISSING',
    url: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    secretConfigured: Boolean(process.env.BETTER_AUTH_SECRET),
  };

  // 4. Overall Status
  const isHealthy =
    checks.neonPostgres.status === 'CONNECTED' &&
    checks.resend.status === 'CONFIGURED' &&
    checks.betterAuth.status === 'CONFIGURED';

  return NextResponse.json({
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    totalDurationMs: Date.now() - startTime,
    env: {
      appEnv: process.env.NEXT_PUBLIC_APP_ENV || 'development',
      neonConfigured: isNeonConfigured,
    },
    services: checks,
  });
}
