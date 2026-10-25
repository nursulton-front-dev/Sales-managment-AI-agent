import { NextRequest, NextResponse, connection } from 'next/server';
import { clearAllTestData } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';
import { neon } from '@neondatabase/serverless';

const ADMIN_RESET_PASSWORD = process.env.ADMIN_RESET_PASSWORD || 'Nursulton_2011';

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Доступ к очистке базы данных разрешен только SuperAdmin платформы.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { password } = body;

    // Strict password verification
    if (!password || typeof password !== 'string' || password !== ADMIN_RESET_PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный пароль для подтверждения очистки базы данных.',
        },
        { status: 403 }
      );
    }

    // 1. Clear via repository helper (Drizzle + JSON store)
    await clearAllTestData();

    // 2. Direct SQL cleanup on Neon if configured
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder')) {
      const sql = neon(process.env.DATABASE_URL);
      await sql`DELETE FROM support_messages;`.catch(() => {});
      await sql`DELETE FROM support_tickets;`.catch(() => {});
      await sql`DELETE FROM admin_audit_logs;`.catch(() => {});
      await sql`DELETE FROM messages;`.catch(() => {});
      await sql`DELETE FROM conversations;`.catch(() => {});
      await sql`DELETE FROM appointments;`.catch(() => {});
      await sql`DELETE FROM orders;`.catch(() => {});
      await sql`DELETE FROM token_logs;`.catch(() => {});
      await sql`DELETE FROM leads;`.catch(() => {});
      await sql`DELETE FROM agents;`.catch(() => {});
      await sql`DELETE FROM support_sessions;`.catch(() => {});
      await sql`DELETE FROM trial_grants;`.catch(() => {});
      await sql`DELETE FROM workspaces;`.catch(() => {});
      await sql`DELETE FROM sessions;`.catch(() => {});
      await sql`DELETE FROM accounts;`.catch(() => {});
      await sql`DELETE FROM users;`.catch(() => {});
      await sql`DELETE FROM verifications;`.catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'База данных успешно очищена.',
      counts: { workspaces: 0, agents: 0, leads: 0, token_logs: 0 },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

