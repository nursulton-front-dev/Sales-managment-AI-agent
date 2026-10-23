import { NextRequest, NextResponse } from 'next/server';
import { clearAllTestData } from '@/src/db';
import { neon } from '@neondatabase/serverless';

export async function POST(req: NextRequest) {
  try {
    // 1. Clear via repository helper
    await clearAllTestData();

    // 2. Direct SQL cleanup on Neon if configured
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder')) {
      const sql = neon(process.env.DATABASE_URL);
      await sql`DELETE FROM token_logs;`;
      await sql`DELETE FROM leads;`;
      await sql`DELETE FROM agents;`;
      await sql`DELETE FROM workspaces;`;
      await sql`DELETE FROM sessions;`;
      await sql`DELETE FROM accounts;`;
      await sql`DELETE FROM users;`;
      await sql`DELETE FROM verifications;`;
    }

    return NextResponse.json({
      success: true,
      message: 'База данных Neon и локальное хранилище успешно очищены (0 записей).',
      counts: { workspaces: 0, agents: 0, leads: 0, token_logs: 0 },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
