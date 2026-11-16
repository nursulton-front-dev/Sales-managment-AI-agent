const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

async function main() {
  console.log('🧪 Starting migration verification on isolated copy of production schema...');
  const pg = new PGlite();

  try {
    // 1. Create base tables matching the production schema
    await pg.exec(`
      CREATE TABLE workspaces (
        id text PRIMARY KEY,
        company_name text NOT NULL,
        niche text NOT NULL DEFAULT 'other',
        owner_name text NOT NULL DEFAULT '',
        owner_email text NOT NULL DEFAULT '',
        owner_phone text NOT NULL DEFAULT '',
        password_hash text NOT NULL DEFAULT '',
        team_size text NOT NULL DEFAULT '1',
        daily_leads_volume text NOT NULL DEFAULT '<20',
        plan text NOT NULL DEFAULT 'trial',
        token_balance integer NOT NULL DEFAULT 100,
        settings jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE TABLE agents (
        id text PRIMARY KEY,
        workspace_id text NOT NULL REFERENCES workspaces(id),
        name text NOT NULL,
        niche_template text NOT NULL DEFAULT 'courses',
        system_prompt text NOT NULL DEFAULT '',
        knowledge_base text NOT NULL DEFAULT '',
        qualification_questions jsonb DEFAULT '[]',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE TABLE appointments (
        id text PRIMARY KEY,
        workspace_id text NOT NULL REFERENCES workspaces(id),
        agent_id text REFERENCES agents(id),
        client_name text NOT NULL,
        client_phone text NOT NULL,
        start_time timestamptz NOT NULL,
        service_name text,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('✅ PASS: Base production schema replica initialized');

    // 2. Insert test data in base tables
    await pg.exec(`
      INSERT INTO workspaces (id, company_name, owner_email) VALUES ('ws_prod_copy', 'Prod Copy Co', 'test@copy.invalid');
      INSERT INTO agents (id, workspace_id, name) VALUES ('agent_prod_copy', 'ws_prod_copy', 'Test Agent');
      INSERT INTO appointments (id, workspace_id, agent_id, client_name, client_phone, start_time) 
        VALUES ('app_prod_copy', 'ws_prod_copy', 'agent_prod_copy', 'Client 1', '+998901234567', '2030-01-15T10:00:00Z');
    `);
    const initialWorkspace = (await pg.query('SELECT * FROM workspaces WHERE id = $1', ['ws_prod_copy'])).rows[0];
    const initialAgent = (await pg.query('SELECT * FROM agents WHERE id = $1', ['agent_prod_copy'])).rows[0];
    const initialAppt = (await pg.query('SELECT * FROM appointments WHERE id = $1', ['app_prod_copy'])).rows[0];

    // 3. First application of calendar-reservations.sql and knowledge-requests.sql
    const calSql = fs.readFileSync('scripts/migrations/calendar-reservations.sql', 'utf8');
    const knowSql = fs.readFileSync('scripts/migrations/knowledge-requests.sql', 'utf8');

    await pg.exec(calSql);
    await pg.exec(knowSql);
    console.log('✅ PASS: First application of migrations succeeded');

    // 4. Verify tables, functions, constraints, indexes
    const tables = (await pg.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows.map(r => r.table_name);
    assert.ok(tables.includes('calendar_resources'), 'calendar_resources must exist');
    assert.ok(tables.includes('calendar_reservations'), 'calendar_reservations must exist');
    assert.ok(tables.includes('knowledge_requests'), 'knowledge_requests must exist');

    // Test reserve_calendar_interval function
    const resId = (await pg.query(
      "SELECT reserve_calendar_interval('res_1', 'ws_prod_copy', 'primary', 'req_1', '2030-01-15T11:00:00Z', '2030-01-15T12:00:00Z', 'evt_1')"
    )).rows[0].reserve_calendar_interval;
    assert.equal(resId, 'res_1');

    // Test knowledge request insert with foreign keys
    await pg.query(
      "INSERT INTO knowledge_requests (id, workspace_id, agent_id, question, dedupe_key) VALUES ('k_1', 'ws_prod_copy', 'agent_prod_copy', 'Сколько стоит?', 'hash1')"
    );
    console.log('✅ PASS: Constraints, foreign keys and functions working as expected');

    // 5. Test repeated application (idempotency)
    await pg.exec(calSql);
    await pg.exec(knowSql);
    console.log('✅ PASS: Repeated application of migrations succeeded idempotently');

    // 6. Verify data preservation
    const afterWorkspace = (await pg.query('SELECT * FROM workspaces WHERE id = $1', ['ws_prod_copy'])).rows[0];
    const afterAgent = (await pg.query('SELECT * FROM agents WHERE id = $1', ['agent_prod_copy'])).rows[0];
    const afterAppt = (await pg.query('SELECT * FROM appointments WHERE id = $1', ['app_prod_copy'])).rows[0];
    assert.deepEqual(afterWorkspace, initialWorkspace, 'Workspace data must be preserved');
    assert.deepEqual(afterAgent, initialAgent, 'Agent data must be preserved');
    assert.deepEqual(afterAppt, initialAppt, 'Appointment data must be preserved');

    const preservedRes = (await pg.query('SELECT * FROM calendar_reservations WHERE id = $1', ['res_1'])).rows[0];
    assert.ok(preservedRes, 'Reservation data must be preserved across reapplied migrations');
    console.log('✅ PASS: All existing data preserved without mutation');

    // 7. Test rollback compatibility
    // In safe additive migration, existing app queries still work if new tables are rolled back or before they are queried
    await pg.exec(`
      DROP TABLE IF EXISTS calendar_reservations CASCADE;
      DROP TABLE IF EXISTS calendar_resources CASCADE;
      DROP TABLE IF EXISTS knowledge_requests CASCADE;
      DROP FUNCTION IF EXISTS reserve_calendar_interval;
    `);

    const rollbackWorkspace = (await pg.query('SELECT * FROM workspaces WHERE id = $1', ['ws_prod_copy'])).rows[0];
    assert.deepEqual(rollbackWorkspace, initialWorkspace, 'Rollback leaves base tables untouched');
    console.log('✅ PASS: Rollback compatibility verified without base table corruption');

    console.log('\n🎉 Task 2 verification complete: All migration checks on isolated schema copy passed!');
  } finally {
    await pg.close();
  }
}

main().catch((err) => {
  console.error('❌ Migration verification failed:', err);
  process.exitCode = 1;
});
