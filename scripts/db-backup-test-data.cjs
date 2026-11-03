/**
 * Database Backup Utility for Test Data
 * Creates a structured JSON snapshot in .system_backup/ before any cleanup.
 */
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function runBackup() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }

  const env = fs.readFileSync(envPath, 'utf8');
  const url = env.match(/DATABASE_URL=["']?([^"'\n]+)/)?.[1];
  if (!url) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const sql = neon(url);
  const backupDir = path.join(__dirname, '..', '.system_backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup_${timestamp}.json`);

  console.log('🔄 Creating database backup...');

  const workspaces = await sql`
    SELECT id, company_name, niche, owner_name, owner_email, owner_phone,
           plan, token_balance, status, created_at,
           telegram_business_connected, telegram_business_user_id, telegram_business_username,
           google_calendar_connected, google_calendar_email, instagram_connected, instagram_username
    FROM workspaces
  `;

  const agents = await sql`SELECT * FROM agents`;
  const conversations = await sql`SELECT * FROM conversations`;
  const messages = await sql`SELECT * FROM messages`;
  const leads = await sql`SELECT * FROM leads`;
  const appointments = await sql`SELECT * FROM appointments`;
  const orders = await sql`SELECT * FROM orders`;
  const channelEvents = await sql`SELECT * FROM channel_events`;
  const telegramBindings = await sql`SELECT * FROM telegram_business_bindings`;
  const websiteWidgets = await sql`SELECT * FROM website_widgets`;

  const backupData = {
    metadata: {
      createdAt: new Date().toISOString(),
      workspacesCount: workspaces.length,
      agentsCount: agents.length,
      conversationsCount: conversations.length,
      messagesCount: messages.length,
      channelEventsCount: channelEvents.length,
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

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`✅ Backup successfully saved to: .system_backup/${path.basename(backupFile)}`);
  console.log('📊 Backup summary:');
  console.log(`   - Workspaces: ${workspaces.length}`);
  console.log(`   - Agents: ${agents.length}`);
  console.log(`   - Conversations: ${conversations.length}`);
  console.log(`   - Messages: ${messages.length}`);
  console.log(`   - Channel Events: ${channelEvents.length}`);
  console.log(`   - Telegram Bindings: ${telegramBindings.length}`);
  console.log(`   - Website Widgets: ${websiteWidgets.length}`);
}

runBackup().catch((err) => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
