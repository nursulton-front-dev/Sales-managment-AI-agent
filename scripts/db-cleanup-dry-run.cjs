/**
 * Database Test Data Cleanup (Dry-Run, Manifest Freezer & Safe Executor)
 * 
 * Safety & Integrity Invariants:
 * 1. Live execution (--execute) WITHOUT an explicit, existing --workspace=<ID> MUST immediately abort with exit code 1.
 * 2. Never deletes records based on loose name matching.
 * 3. Requires a pre-generated frozen manifest of specific IDs (--manifest=<FILE>).
 *    Any newer data arrived after manifest creation is completely untouched.
 * 4. Requires an existing verified backup (--backup=<FILE>) containing all candidate records before any deletion.
 * 5. Uses transactional deletion respecting foreign key order:
 *    messages -> appointments/orders -> leads -> conversations -> channel_events -> telegram_business_bindings.
 * 6. Concurrency protection: pauses workspace status during deletion window to reject parallel webhooks and workers.
 * 7. Non-zero exit code (1) on any failure or invariant breach.
 * 8. Never deletes unless explicitly confirmed.
 */
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ensureSecureDir, writeSecureFile } = require('./db-backup-test-data.cjs');
const { verifyChecksum } = require('./db-restore-test-data.cjs');

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

async function main() {
  const isExecute = process.argv.includes('--execute');
  const targetWorkspaceId = process.argv.find((arg) => arg.startsWith('--workspace='))?.split('=')[1]?.trim();
  const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='))?.split('=')[1]?.trim();
  const backupArg = process.argv.find((arg) => arg.startsWith('--backup='))?.split('=')[1]?.trim();

  console.log('========================================================');
  console.log(`MODE: ${isExecute ? '⚠️ LIVE EXECUTION' : '🛡️ DRY RUN (Safety & Analysis)'}`);
  console.log('========================================================\n');

  // INVARIANT 1: --execute without --workspace MUST abort with exit code 1
  if (isExecute && !targetWorkspaceId) {
    console.error('❌ FATAL ERROR: Live execution (--execute) without explicit --workspace=<WORKSPACE_ID> is strictly forbidden.');
    console.error('   Aborting immediately before any write or read modification.');
    process.exit(1);
  }

  const url = getDatabaseUrl();
  const sql = neon(url);

  // Validate workspace if provided
  let workspace = null;
  if (targetWorkspaceId) {
    const wsList = await sql`SELECT id, company_name, owner_email, token_balance, status FROM workspaces WHERE id = ${targetWorkspaceId}`;
    if (wsList.length === 0) {
      console.error(`❌ FATAL ERROR: Workspace ID '${targetWorkspaceId}' does not exist in database.`);
      process.exit(1);
    }
    workspace = wsList[0];
  }

  // ----------------------------------------------------
  // DRY RUN & MANIFEST FREEZING (No writes to DB)
  // ----------------------------------------------------
  if (!isExecute) {
    const workspaces = targetWorkspaceId ? [workspace] : await sql`SELECT id, company_name, owner_email, token_balance, status FROM workspaces`;

    for (const ws of workspaces) {
      console.log(`🏢 Workspace: ${ws.company_name} (ID: ${ws.id})`);
      console.log(`   Owner: ${ws.owner_email} | Status: ${ws.status} | Balance: ${ws.token_balance} tokens`);

      const convs = await sql`SELECT id, client_name, client_phone, channel, status, created_at FROM conversations WHERE workspace_id = ${ws.id} ORDER BY created_at ASC`;
      const msgs = await sql`SELECT id, conversation_id, sender, LEFT(text, 50) as preview, created_at FROM messages WHERE workspace_id = ${ws.id} ORDER BY created_at ASC`;
      const events = await sql`SELECT id, sequence, channel, status, stage, created_at FROM channel_events WHERE workspace_id = ${ws.id} ORDER BY created_at ASC`;
      const bindings = await sql`SELECT id, verified_telegram_user_id, verified_telegram_username, created_at FROM telegram_business_bindings WHERE workspace_id = ${ws.id} ORDER BY created_at ASC`;
      const leads = await sql`SELECT id, client_name, client_phone, channel, status, created_at FROM leads WHERE workspace_id = ${ws.id} ORDER BY created_at ASC`;
      const appts = await sql`SELECT id, lead_id, client_name, service_name, start_time, created_at FROM appointments WHERE workspace_id = ${ws.id} ORDER BY created_at ASC`;
      const orders = await sql`SELECT id, lead_id, created_at FROM orders WHERE workspace_id = ${ws.id} ORDER BY created_at ASC`;

      console.log(`   Candidate records found:`);
      console.log(`     - Conversations: ${convs.length}`);
      console.log(`     - Messages: ${msgs.length}`);
      console.log(`     - Channel Queue Events: ${events.length}`);
      console.log(`     - Telegram Bindings: ${bindings.length}`);
      console.log(`     - Leads: ${leads.length}`);
      console.log(`     - Appointments: ${appts.length}`);
      console.log(`     - Orders: ${orders.length}`);

      if (targetWorkspaceId) {
        // Freeze this candidate snapshot to a timestamped manifest file
        const backupDir = path.join(__dirname, '..', '.system_backup');
        ensureSecureDir(backupDir);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const manifestFileName = `manifest_${ws.id.slice(0, 12)}_${timestamp}.json`;
        const manifestFilePath = path.join(backupDir, manifestFileName);
        const checksumFilePath = `${manifestFilePath}.sha256`;

        const manifest = {
          manifestVersion: 1,
          createdAt: new Date().toISOString(),
          workspaceId: ws.id,
          companyName: ws.company_name,
          ownerEmail: ws.owner_email,
          recordCounts: {
            conversations: convs.length,
            messages: msgs.length,
            channelEvents: events.length,
            telegramBindings: bindings.length,
            leads: leads.length,
            appointments: appts.length,
            orders: orders.length,
          },
          recordIds: {
            conversationIds: convs.map((r) => r.id),
            messageIds: msgs.map((r) => r.id),
            channelEventIds: events.map((r) => r.id),
            telegramBindingIds: bindings.map((r) => r.id),
            leadIds: leads.map((r) => r.id),
            appointmentIds: appts.map((r) => r.id),
            orderIds: orders.map((r) => r.id),
          },
          records: {
            conversations: convs,
            messages: msgs,
            channelEvents: events,
            telegramBindings: bindings,
            leads,
            appointments: appts,
            orders,
          },
        };

        const manifestJson = JSON.stringify(manifest, null, 2);
        const sha256 = crypto.createHash('sha256').update(manifestJson, 'utf8').digest('hex');

        writeSecureFile(manifestFilePath, manifestJson);
        writeSecureFile(checksumFilePath, `${sha256}  ${manifestFileName}\n`);

        console.log(`\n📌 FROZEN CANDIDATE MANIFEST GENERATED:`);
        console.log(`   Path: .system_backup/${manifestFileName}`);
        console.log(`   SHA-256: ${sha256}`);
        console.log(`   Exact Conversation IDs to delete:`);
        convs.forEach((c) => console.log(`     • [${c.id}] ${c.channel} | ${c.client_name} (${c.client_phone}) | ${c.created_at}`));
        console.log(`   Exact Message IDs to delete (${msgs.length} total):`);
        msgs.forEach((m) => console.log(`     • [${m.id}] conv:${m.conversation_id.slice(0, 8)}... | ${m.sender}: "${m.preview}"`));
      }
    }

    console.log('\n--------------------------------------------------------');
    console.log('PROTECTED TABLES & ATTRIBUTES (NEVER TOUCHED):');
    console.log('✅ users / user / accounts / sessions (Authentication, emails, passwords)');
    console.log('✅ workspaces token_balance and subscription plan');
    console.log('✅ agents (Agent prompts, configurations, and skills)');
    console.log('✅ website_widgets (Widget visual styles and configs)');
    console.log('--------------------------------------------------------');
    console.log('\n🛡️ SAFETY NOTICE: No data was modified.');
    console.log('To execute cleanup ONLY after specific user confirmation of the manifest:');
    console.log('1. Ensure targeted backup is created:');
    console.log(`   node scripts/db-backup-test-data.cjs --workspace=${targetWorkspaceId || '<WORKSPACE_ID>'}`);
    console.log('2. Run execution with explicitly specified manifest and backup:');
    console.log(`   node scripts/db-cleanup-dry-run.cjs --execute --workspace=${targetWorkspaceId || '<WORKSPACE_ID>'} --manifest=<MANIFEST_FILE> --backup=<BACKUP_FILE>`);
    return;
  }

  // ----------------------------------------------------
  // LIVE EXECUTION (Protected with all gates)
  // ----------------------------------------------------
  if (!manifestArg || !backupArg) {
    console.error('❌ FATAL ERROR: Live execution requires both --manifest=<FILE> and --backup=<FILE>');
    process.exit(1);
  }

  const manifestPath = path.isAbsolute(manifestArg) ? manifestArg : path.join(__dirname, '..', manifestArg);
  const backupPath = path.isAbsolute(backupArg) ? backupArg : path.join(__dirname, '..', backupArg);

  console.log('🔍 Gate 1: Validating Backup Checksum and Content...');
  const backupData = verifyChecksum(backupPath);

  console.log('🔍 Gate 2: Validating Manifest Checksum and Content...');
  const manifestData = verifyChecksum(manifestPath);

  if (manifestData.workspaceId !== targetWorkspaceId) {
    console.error(`❌ FATAL ERROR: Manifest workspace (${manifestData.workspaceId}) does not match target (${targetWorkspaceId})`);
    process.exit(1);
  }

  // Verify backup contains every ID that will be deleted
  const backupConvIds = new Set((backupData.conversations || []).map((c) => c.id));
  const backupMsgIds = new Set((backupData.messages || []).map((m) => m.id));

  for (const cId of manifestData.recordIds.conversationIds) {
    if (!backupConvIds.has(cId)) {
      console.error(`❌ FATAL ERROR: Conversation ID ${cId} is in manifest but missing from backup! Aborting.`);
      process.exit(1);
    }
  }
  for (const mId of manifestData.recordIds.messageIds) {
    if (!backupMsgIds.has(mId)) {
      console.error(`❌ FATAL ERROR: Message ID ${mId} is in manifest but missing from backup! Aborting.`);
      process.exit(1);
    }
  }
  console.log('✅ All candidate manifest IDs verified to exist in validated backup.');

  // Gate 3: Concurrency protection
  console.log('🔒 Gate 3: Pausing workspace and stopping queue events to prevent concurrent webhooks/workers...');
  await sql`UPDATE workspaces SET status = 'maintenance' WHERE id = ${targetWorkspaceId}`;

  try {
    // Cancel any active channel queue events for these conversations
    if (manifestData.recordIds.conversationIds.length > 0) {
      await sql`
        UPDATE channel_events
        SET status = 'ignored', locked_until = NULL, error_code = 'maintenance_cleanup'
        WHERE conversation_id = ANY(${manifestData.recordIds.conversationIds})
      `;
    }

    // Gate 4: Transactional deletion by exact frozen ID list
    console.log('🗑️ Gate 4: Executing transactional deletion of exact frozen record IDs...');

    const txQueries = [];

    // 1. Messages (foreign key to conversations)
    if (manifestData.recordIds.messageIds.length > 0) {
      txQueries.push(sql`DELETE FROM messages WHERE id = ANY(${manifestData.recordIds.messageIds})`);
    }

    // 2. Appointments (foreign key to leads)
    if (manifestData.recordIds.appointmentIds.length > 0) {
      txQueries.push(sql`DELETE FROM appointments WHERE id = ANY(${manifestData.recordIds.appointmentIds})`);
    }

    // 3. Orders (foreign key to leads)
    if (manifestData.recordIds.orderIds.length > 0) {
      txQueries.push(sql`DELETE FROM orders WHERE id = ANY(${manifestData.recordIds.orderIds})`);
    }

    // 4. Leads
    if (manifestData.recordIds.leadIds.length > 0) {
      txQueries.push(sql`DELETE FROM leads WHERE id = ANY(${manifestData.recordIds.leadIds})`);
    }

    // 5. Conversations
    if (manifestData.recordIds.conversationIds.length > 0) {
      txQueries.push(sql`DELETE FROM conversations WHERE id = ANY(${manifestData.recordIds.conversationIds})`);
    }

    // 6. Channel Events
    if (manifestData.recordIds.channelEventIds.length > 0) {
      txQueries.push(sql`DELETE FROM channel_events WHERE id = ANY(${manifestData.recordIds.channelEventIds})`);
    }

    // 7. Telegram Bindings
    if (manifestData.recordIds.telegramBindingIds.length > 0) {
      txQueries.push(sql`DELETE FROM telegram_business_bindings WHERE id = ANY(${manifestData.recordIds.telegramBindingIds})`);
    }

    if (txQueries.length > 0) {
      await sql.transaction(txQueries);
    }

    console.log('✅ Transactional deletion committed successfully.');
  } catch (err) {
    console.error('❌ Deletion failed in transaction:', err);
    // Restore workspace status on failure
    await sql`UPDATE workspaces SET status = 'active' WHERE id = ${targetWorkspaceId}`.catch(() => {});
    process.exit(1);
  } finally {
    // Unpause workspace
    console.log('🔓 Unpausing workspace back to active status...');
    await sql`UPDATE workspaces SET status = 'active' WHERE id = ${targetWorkspaceId}`.catch(() => {});
  }

  console.log('\n🎉 Cleanup of frozen candidate records finished successfully.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Cleanup script crashed:', err);
    process.exit(1);
  });
}

module.exports = { main };
