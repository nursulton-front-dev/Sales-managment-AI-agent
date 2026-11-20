const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
process.loadEnvFile('.env.local');
const { neon } = require('@neondatabase/serverless');

const OWNER_EMAIL = 'maxramovnursulton1@gmail.com';

async function clean() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('Starting safe database cleanup...');

  // 1. Delete dependent tables
  console.log('- Cleaning support messages and tickets...');
  await sql.query('DELETE FROM support_messages;');
  await sql.query('DELETE FROM support_tickets;');
  await sql.query('DELETE FROM support_sessions;');

  console.log('- Cleaning audit logs, AI execution logs, and channel events...');
  await sql.query('DELETE FROM admin_audit_logs;');
  await sql.query('DELETE FROM ai_execution_logs;');
  await sql.query('DELETE FROM channel_events;');
  await sql.query('DELETE FROM instagram_events;');
  await sql.query('DELETE FROM widget_sessions;');
  await sql.query('DELETE FROM website_widgets;');
  await sql.query('DELETE FROM integration_rate_limits;');
  await sql.query('DELETE FROM telegram_business_bindings;');

  console.log('- Cleaning calendar reservations and knowledge requests...');
  await sql.query('DELETE FROM calendar_reservations;');
  await sql.query('DELETE FROM calendar_resources;');
  await sql.query('DELETE FROM knowledge_requests;');

  console.log('- Cleaning chat messages, conversations, leads, orders, appointments...');
  await sql.query('DELETE FROM messages;');
  await sql.query('DELETE FROM conversations;');
  await sql.query('DELETE FROM appointments;');
  await sql.query('DELETE FROM orders;');
  await sql.query('DELETE FROM leads;');

  console.log('- Cleaning agents, token logs, trial grants...');
  await sql.query('DELETE FROM agents;');
  await sql.query('DELETE FROM token_logs;');
  await sql.query('DELETE FROM trial_grants;');

  console.log('- Cleaning platform admin access & access events...');
  await sql.query('DELETE FROM platform_admin_access_events;');
  await sql.query('DELETE FROM platform_admin_access;');

  console.log('- Cleaning workspaces (deleting all test workspaces)...');
  await sql.query('DELETE FROM workspaces;');

  console.log('- Cleaning verifications...');
  await sql.query('DELETE FROM verifications;');

  console.log(`- Cleaning other users, preserving platform owner (${OWNER_EMAIL})...`);
  // Find owner user ID
  const ownerRows = await sql.query('SELECT id FROM users WHERE lower(email) = $1', [OWNER_EMAIL]);
  const ownerId = ownerRows[0]?.id;

  if (ownerId) {
    await sql.query('DELETE FROM sessions WHERE user_id <> $1', [ownerId]);
    await sql.query('DELETE FROM accounts WHERE user_id <> $1', [ownerId]);
    await sql.query('DELETE FROM users WHERE id <> $1', [ownerId]);
  } else {
    await sql.query('DELETE FROM sessions;');
    await sql.query('DELETE FROM accounts;');
    await sql.query('DELETE FROM users;');
  }

  console.log('\n--- CLEANUP COMPLETE ---');

  // Verify counts
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  for (const t of tables) {
    const res = await sql.query(`SELECT COUNT(*)::int as count FROM "${t.table_name}"`);
    console.log(`${t.table_name}: ${res[0].count}`);
  }
}

clean().catch((err) => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
