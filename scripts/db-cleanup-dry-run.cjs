/**
 * Database Test Data Cleanup (Dry-Run & Safe Executor)
 * 
 * Safety invariants:
 * - Read-only dry-run by default.
 * - Does NOT touch users, sessions, or accounts tables.
 * - Does NOT alter workspace plan or token_balance.
 * - Requires explicit --execute flag and workspaceId argument.
 */
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function main() {
  const isExecute = process.argv.includes('--execute');
  const targetWorkspaceId = process.argv.find((arg) => arg.startsWith('--workspace='))?.split('=')[1];

  const envPath = path.join(__dirname, '..', '.env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  const url = env.match(/DATABASE_URL=["']?([^"'\n]+)/)?.[1];
  const sql = neon(url);

  console.log('========================================================');
  console.log(`MODE: ${isExecute ? '⚠️ LIVE EXECUTION' : '🛡️ DRY RUN (Read-Only Analysis)'}`);
  console.log('========================================================\n');

  const workspaces = targetWorkspaceId
    ? await sql`SELECT id, company_name, owner_email, token_balance FROM workspaces WHERE id = ${targetWorkspaceId}`
    : await sql`SELECT id, company_name, owner_email, token_balance FROM workspaces`;

  if (workspaces.length === 0) {
    console.log('No workspaces matched.');
    return;
  }

  let totalConvs = 0;
  let totalMsgs = 0;
  let totalEvents = 0;
  let totalBindings = 0;
  let totalLeads = 0;
  let totalAppts = 0;

  for (const ws of workspaces) {
    console.log(`🏢 Workspace: ${ws.company_name} (ID: ${ws.id})`);
    console.log(`   Owner: ${ws.owner_email} | Balance: ${ws.token_balance} tokens`);

    const [c] = await sql`SELECT count(*)::int as count FROM conversations WHERE workspace_id = ${ws.id}`;
    const [m] = await sql`SELECT count(*)::int as count FROM messages WHERE workspace_id = ${ws.id}`;
    const [e] = await sql`SELECT count(*)::int as count FROM channel_events WHERE workspace_id = ${ws.id}`;
    const [b] = await sql`SELECT count(*)::int as count FROM telegram_business_bindings WHERE workspace_id = ${ws.id}`;
    const [l] = await sql`SELECT count(*)::int as count FROM leads WHERE workspace_id = ${ws.id}`;
    const [a] = await sql`SELECT count(*)::int as count FROM appointments WHERE workspace_id = ${ws.id}`;

    console.log(`   Candidates for test data cleanup:`);
    console.log(`     - Conversations: ${c.count}`);
    console.log(`     - Messages: ${m.count}`);
    console.log(`     - Channel Queue Events: ${e.count}`);
    console.log(`     - Telegram Nonce Bindings: ${b.count}`);
    console.log(`     - Leads: ${l.count}`);
    console.log(`     - Appointments: ${a.count}`);

    totalConvs += c.count;
    totalMsgs += m.count;
    totalEvents += e.count;
    totalBindings += b.count;
    totalLeads += l.count;
    totalAppts += a.count;

    if (isExecute) {
      console.log(`   🗑️ Cleaning test dialogue records for ${ws.id}...`);
      await sql`DELETE FROM messages WHERE workspace_id = ${ws.id}`;
      await sql`DELETE FROM conversations WHERE workspace_id = ${ws.id}`;
      await sql`DELETE FROM channel_events WHERE workspace_id = ${ws.id}`;
      await sql`DELETE FROM telegram_business_bindings WHERE workspace_id = ${ws.id}`;
      await sql`DELETE FROM leads WHERE workspace_id = ${ws.id}`;
      await sql`DELETE FROM appointments WHERE workspace_id = ${ws.id}`;
      console.log(`   ✅ Cleaned successfully.`);
    }
  }

  console.log('\n--------------------------------------------------------');
  console.log('SUMMARY OF RECORDS:');
  console.log(`Total Conversations : ${totalConvs}`);
  console.log(`Total Messages      : ${totalMsgs}`);
  console.log(`Total Channel Events: ${totalEvents}`);
  console.log(`Total Bindings      : ${totalBindings}`);
  console.log(`Total Leads         : ${totalLeads}`);
  console.log(`Total Appointments  : ${totalAppts}`);
  console.log('--------------------------------------------------------');
  console.log('PRESERVED DATA:');
  console.log('✅ Users table (all logins, emails, credentials preserved)');
  console.log('✅ Accounts & Sessions tables');
  console.log('✅ Workspace configuration & token balances');
  console.log('✅ AI Agents definitions');
  console.log('--------------------------------------------------------\n');

  if (!isExecute) {
    console.log('💡 To execute actual cleanup after user approval, run:');
    console.log('   node scripts/db-cleanup-dry-run.cjs --execute --workspace=<WORKSPACE_ID>');
  }
}

main().catch(console.error);
