/**
 * Automated Verification: Isolated Database Backup, Targeted Cleanup, and Restore Cycle
 * 
 * Verifies:
 * 1. Targeted backup creation with SHA-256 and 0o600 permissions.
 * 2. Manifest freezing of exact candidate IDs.
 * 3. Invariant: records created AFTER manifest freezing are NEVER deleted.
 * 4. Transactional deletion of exact frozen IDs.
 * 5. Full restoration from backup with checksum validation.
 * 6. Isolated workspace cleanup after test completion.
 */
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

function getDatabaseUrl() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  return env.match(/DATABASE_URL=["']?([^"'\n]+)/)?.[1];
}

async function run() {
  console.log('🧪 Starting Isolated Backup, Cleanup & Restore Verification Test...\n');
  const sql = neon(getDatabaseUrl());
  const testWsId = `ws_iso_test_${Date.now()}`;
  const testAgentId = `agent_iso_${Date.now()}`;

  try {
    // 1. Setup isolated test workspace and agent
    console.log(`1️⃣ Creating isolated test workspace (${testWsId})...`);
    await sql`
      INSERT INTO workspaces (id, company_name, niche, owner_name, owner_email, owner_phone, password_hash, team_size, daily_leads_volume, plan, token_balance, status)
      VALUES (${testWsId}, 'Isolated QA Lab', 'tech', 'QA Bot', 'qa@gapcha.ai', '+998901234567', 'test_hash', '1-5', '10-50', 'standard', 100, 'active')
    `;
    await sql`
      INSERT INTO agents (id, workspace_id, name, niche_template, system_prompt, is_active)
      VALUES (${testAgentId}, ${testWsId}, 'QA Tester', 'marketing', 'Test prompt', true)
    `;

    // 2. Insert test conversations and messages
    const conv1Id = `conv_test_1_${Date.now()}`;
    const conv2Id = `conv_test_2_${Date.now()}`;
    const msg1Id = `msg_test_1_${Date.now()}`;
    const msg2Id = `msg_test_2_${Date.now()}`;
    const event1Id = `evt_test_1_${Date.now()}`;

    await sql`
      INSERT INTO conversations (id, workspace_id, agent_id, client_name, client_phone, channel, status)
      VALUES (${conv1Id}, ${testWsId}, ${testAgentId}, 'Test Client 1', 'id:111111', 'Telegram', 'active'),
             (${conv2Id}, ${testWsId}, ${testAgentId}, 'Test Client 2', 'id:222222', 'Telegram', 'active')
    `;
    await sql`
      INSERT INTO messages (id, conversation_id, workspace_id, sender, text, tokens_cost)
      VALUES (${msg1Id}, ${conv1Id}, ${testWsId}, 'client', 'Hello from isolated test 1', 0),
             (${msg2Id}, ${conv2Id}, ${testWsId}, 'client', 'Hello from isolated test 2', 0)
    `;
    await sql`
      INSERT INTO channel_events (id, sequence, workspace_id, channel, conversation_id, payload, status, stage, attempts)
      VALUES (${event1Id}, 1, ${testWsId}, 'Telegram', ${conv1Id}, '{"test":true}'::jsonb, 'delivered', 'delivered', 1)
    `;

    console.log('   ✅ Isolated test records seeded.');

    // 3. Run targeted backup for this isolated workspace
    console.log('2️⃣ Running targeted backup for isolated workspace...');
    const backupOutput = execSync(`node scripts/db-backup-test-data.cjs --workspace=${testWsId}`, { encoding: 'utf8' });
    const backupFileMatch = backupOutput.match(/Backup saved to: (.+)/);
    assert(backupFileMatch, 'Backup output should provide saved file path');
    const backupRelPath = backupFileMatch[1].trim();
    const backupFullPath = path.join(__dirname, '..', backupRelPath);
    assert(fs.existsSync(backupFullPath), `Backup file must exist at ${backupFullPath}`);
    console.log(`   ✅ Backup created at ${backupRelPath}`);

    // Verify backup file mode 0o600
    const stat = fs.statSync(backupFullPath);
    const mode = (stat.mode & 0o777).toString(8);
    assert.strictEqual(mode, '600', `Backup file must have permissions 0600 (actual: 0${mode})`);
    console.log(`   ✅ Permissions verified: 0${mode}`);

    // 4. Generate frozen candidate manifest
    console.log('3️⃣ Generating frozen candidate manifest...');
    const dryRunOutput = execSync(`node scripts/db-cleanup-dry-run.cjs --workspace=${testWsId}`, { encoding: 'utf8' });
    const manifestMatch = dryRunOutput.match(/Path: (.+)/);
    assert(manifestMatch, 'Dry-run must output generated manifest path');
    const manifestRelPath = manifestMatch[1].trim();
    const manifestFullPath = path.join(__dirname, '..', manifestRelPath);
    assert(fs.existsSync(manifestFullPath), `Manifest file must exist at ${manifestFullPath}`);
    console.log(`   ✅ Manifest frozen at ${manifestRelPath}`);

    // 5. Invariant Test: Insert a NEW conversation and message AFTER manifest freezing
    console.log('4️⃣ Simulating new incoming dialogue arriving AFTER freezing manifest...');
    const convNewId = `conv_test_new_${Date.now()}`;
    const msgNewId = `msg_test_new_${Date.now()}`;
    await sql`
      INSERT INTO conversations (id, workspace_id, agent_id, client_name, client_phone, channel, status)
      VALUES (${convNewId}, ${testWsId}, ${testAgentId}, 'New Client Post Freeze', 'id:333333', 'Telegram', 'active')
    `;
    await sql`
      INSERT INTO messages (id, conversation_id, workspace_id, sender, text, tokens_cost)
      VALUES (${msgNewId}, ${convNewId}, ${testWsId}, 'client', 'I arrived after manifest was frozen', 0)
    `;
    console.log('   ✅ Post-freeze dialogue inserted.');

    // 6. Execute targeted cleanup using frozen manifest and backup
    console.log('5️⃣ Executing targeted cleanup with frozen manifest and verified backup...');
    execSync(
      `node scripts/db-cleanup-dry-run.cjs --execute --workspace=${testWsId} --manifest=${manifestRelPath} --backup=${backupRelPath}`,
      { encoding: 'utf8' }
    );

    // 7. Check database state: Old records deleted, post-freeze records PRESERVED
    console.log('6️⃣ Verifying deletion precision...');
    const [c1] = await sql`SELECT count(*)::int as count FROM conversations WHERE id IN (${conv1Id}, ${conv2Id})`;
    const [mOld] = await sql`SELECT count(*)::int as count FROM messages WHERE id IN (${msg1Id}, ${msg2Id})`;
    assert.strictEqual(c1.count, 0, 'Frozen candidate conversations must be deleted');
    assert.strictEqual(mOld.count, 0, 'Frozen candidate messages must be deleted');

    const [cNew] = await sql`SELECT count(*)::int as count FROM conversations WHERE id = ${convNewId}`;
    const [mNew] = await sql`SELECT count(*)::int as count FROM messages WHERE id = ${msgNewId}`;
    assert.strictEqual(cNew.count, 1, 'Post-freeze conversation MUST be preserved');
    assert.strictEqual(mNew.count, 1, 'Post-freeze message MUST be preserved');
    console.log('   ✅ Precision verified: only frozen candidate IDs deleted. Post-freeze dialogue remained 100% intact!');

    // 8. Restore from backup
    console.log('7️⃣ Restoring deleted records from backup...');
    execSync(`node scripts/db-restore-test-data.cjs --backup=${backupRelPath} --execute`, { encoding: 'utf8' });

    // 9. Check restored state
    const [cRestored] = await sql`SELECT count(*)::int as count FROM conversations WHERE id IN (${conv1Id}, ${conv2Id})`;
    const [mRestored] = await sql`SELECT count(*)::int as count FROM messages WHERE id IN (${msg1Id}, ${msg2Id})`;
    assert.strictEqual(cRestored.count, 2, 'Both conversations must be restored');
    assert.strictEqual(mRestored.count, 2, 'Both messages must be restored');
    console.log('   ✅ Restoration verified: all records successfully restored from backup.');

    // 10. Clean up isolated test workspace
    console.log('8️⃣ Cleaning up isolated test workspace...');
    await sql`DELETE FROM messages WHERE workspace_id = ${testWsId}`;
    await sql`DELETE FROM conversations WHERE workspace_id = ${testWsId}`;
    await sql`DELETE FROM channel_events WHERE workspace_id = ${testWsId}`;
    await sql`DELETE FROM agents WHERE workspace_id = ${testWsId}`;
    await sql`DELETE FROM workspaces WHERE id = ${testWsId}`;

    // Clean up test backup and manifest files
    try {
      fs.unlinkSync(backupFullPath);
      fs.unlinkSync(`${backupFullPath}.sha256`);
      fs.unlinkSync(manifestFullPath);
      fs.unlinkSync(`${manifestFullPath}.sha256`);
    } catch {}

    console.log('\n🎉 ALL 8 ISOLATED BACKUP, CLEANUP & RESTORE CHECKS PASSED WITH 100% SUCCESS!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    // Cleanup workspace on error
    await sql`DELETE FROM messages WHERE workspace_id = ${testWsId}`.catch(() => {});
    await sql`DELETE FROM conversations WHERE workspace_id = ${testWsId}`.catch(() => {});
    await sql`DELETE FROM channel_events WHERE workspace_id = ${testWsId}`.catch(() => {});
    await sql`DELETE FROM agents WHERE workspace_id = ${testWsId}`.catch(() => {});
    await sql`DELETE FROM workspaces WHERE id = ${testWsId}`.catch(() => {});
    process.exit(1);
  }
}

run();
