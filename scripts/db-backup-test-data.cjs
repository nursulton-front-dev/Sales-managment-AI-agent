/**
 * Database Backup Utility for Test Data
 * 
 * Security & Integrity Invariants:
 * - Directory permissions strictly 0o700 (drwx------).
 * - File permissions strictly 0o600 (-rw-------).
 * - Generates SHA-256 integrity checksum alongside the backup.
 * - Supports targeted workspace backup or full backup.
 * - Never outputs raw backup contents or secret tokens to stdout.
 * - Non-zero exit code (1) on any failure.
 */
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getDatabaseUrl() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env.local not found');
    process.exit(1);
  }
  const env = fs.readFileSync(envPath, 'utf8');
  const url = env.match(/DATABASE_URL=["']?([^"'\n]+)/)?.[1];
  if (!url) {
    console.error('❌ Error: DATABASE_URL not found in .env.local');
    process.exit(1);
  }
  return url;
}

function ensureSecureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
  try {
    fs.chmodSync(dirPath, 0o700);
  } catch (err) {
    console.warn('⚠️ Warning: unable to chmod directory:', err.message);
  }
}

function writeSecureFile(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o600, encoding: 'utf8' });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch (err) {
    console.warn('⚠️ Warning: unable to chmod file:', err.message);
  }
}

async function runBackup() {
  const targetWorkspaceId = process.argv.find((arg) => arg.startsWith('--workspace='))?.split('=')[1]?.trim();
  const manifestPath = process.argv.find((arg) => arg.startsWith('--manifest='))?.split('=')[1]?.trim();

  const url = getDatabaseUrl();
  const sql = neon(url);
  const backupDir = path.join(__dirname, '..', '.system_backup');
  ensureSecureDir(backupDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePrefix = targetWorkspaceId ? `backup_ws_${targetWorkspaceId.slice(0, 12)}_${timestamp}` : `backup_${timestamp}`;
  const backupFile = path.join(backupDir, `${filePrefix}.json`);
  const checksumFile = path.join(backupDir, `${filePrefix}.json.sha256`);

  console.log('🔄 Creating database backup...');
  if (targetWorkspaceId) {
    console.log(`🎯 Scope: Workspace ID = ${targetWorkspaceId}`);
  } else if (manifestPath) {
    console.log(`🎯 Scope: Manifest = ${manifestPath}`);
  } else {
    console.log('🌐 Scope: Full database');
  }

  // 1. Fetch Workspaces
  const workspaces = targetWorkspaceId
    ? await sql`
        SELECT id, company_name, niche, owner_name, owner_email, owner_phone,
               plan, token_balance, status, created_at,
               telegram_business_connected, telegram_business_user_id, telegram_business_username,
               google_calendar_connected, google_calendar_email, instagram_connected, instagram_username
        FROM workspaces WHERE id = ${targetWorkspaceId}
      `
    : await sql`
        SELECT id, company_name, niche, owner_name, owner_email, owner_phone,
               plan, token_balance, status, created_at,
               telegram_business_connected, telegram_business_user_id, telegram_business_username,
               google_calendar_connected, google_calendar_email, instagram_connected, instagram_username
        FROM workspaces
      `;

  if (targetWorkspaceId && workspaces.length === 0) {
    console.error(`❌ Error: Workspace ${targetWorkspaceId} does not exist in database.`);
    process.exit(1);
  }

  // 2. Fetch Dependent Entities
  let conversations = [];
  let messages = [];
  let channelEvents = [];
  let telegramBindings = [];
  let leads = [];
  let appointments = [];
  let orders = [];
  let agents = [];
  let websiteWidgets = [];

  if (targetWorkspaceId) {
    conversations = await sql`SELECT * FROM conversations WHERE workspace_id = ${targetWorkspaceId}`;
    messages = await sql`SELECT * FROM messages WHERE workspace_id = ${targetWorkspaceId}`;
    channelEvents = await sql`SELECT * FROM channel_events WHERE workspace_id = ${targetWorkspaceId}`;
    telegramBindings = await sql`SELECT * FROM telegram_business_bindings WHERE workspace_id = ${targetWorkspaceId}`;
    leads = await sql`SELECT * FROM leads WHERE workspace_id = ${targetWorkspaceId}`;
    appointments = await sql`SELECT * FROM appointments WHERE workspace_id = ${targetWorkspaceId}`;
    orders = await sql`SELECT * FROM orders WHERE workspace_id = ${targetWorkspaceId}`;
    agents = await sql`SELECT * FROM agents WHERE workspace_id = ${targetWorkspaceId}`;
    websiteWidgets = await sql`SELECT * FROM website_widgets WHERE workspace_id = ${targetWorkspaceId}`;
  } else {
    workspaces;
    agents = await sql`SELECT * FROM agents`;
    conversations = await sql`SELECT * FROM conversations`;
    messages = await sql`SELECT * FROM messages`;
    leads = await sql`SELECT * FROM leads`;
    appointments = await sql`SELECT * FROM appointments`;
    orders = await sql`SELECT * FROM orders`;
    channelEvents = await sql`SELECT * FROM channel_events`;
    telegramBindings = await sql`SELECT * FROM telegram_business_bindings`;
    websiteWidgets = await sql`SELECT * FROM website_widgets`;
  }

  const payload = {
    metadata: {
      createdAt: new Date().toISOString(),
      scope: targetWorkspaceId ? 'workspace' : 'full',
      targetWorkspaceId: targetWorkspaceId || null,
      counts: {
        workspaces: workspaces.length,
        agents: agents.length,
        conversations: conversations.length,
        messages: messages.length,
        channelEvents: channelEvents.length,
        telegramBindings: telegramBindings.length,
        leads: leads.length,
        appointments: appointments.length,
        orders: orders.length,
        websiteWidgets: websiteWidgets.length,
      },
    },
    workspaces,
    agents,
    conversations,
    messages,
    leads,
    appointments,
    orders,
    channelEvents,
    telegramBindings,
    websiteWidgets,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const sha256 = crypto.createHash('sha256').update(jsonString, 'utf8').digest('hex');
  payload.metadata.sha256 = sha256;

  const finalJsonString = JSON.stringify(payload, null, 2);
  const finalSha256 = crypto.createHash('sha256').update(finalJsonString, 'utf8').digest('hex');

  writeSecureFile(backupFile, finalJsonString);
  writeSecureFile(checksumFile, `${finalSha256}  ${path.basename(backupFile)}\n`);

  console.log(`✅ Backup saved to: .system_backup/${path.basename(backupFile)}`);
  console.log(`🔒 Checksum: ${finalSha256}`);
  console.log(`📊 Backup record summary:`);
  console.log(`   - Workspaces: ${workspaces.length}`);
  console.log(`   - Conversations: ${conversations.length}`);
  console.log(`   - Messages: ${messages.length}`);
  console.log(`   - Channel Events: ${channelEvents.length}`);
  console.log(`   - Telegram Bindings: ${telegramBindings.length}`);
  console.log(`   - Leads: ${leads.length}`);
  console.log(`   - Appointments: ${appointments.length}`);
  console.log(`   - Orders: ${orders.length}`);

  return { backupFile, sha256: finalSha256 };
}

if (require.main === module) {
  runBackup().catch((err) => {
    console.error('❌ Backup execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runBackup, ensureSecureDir, writeSecureFile };
