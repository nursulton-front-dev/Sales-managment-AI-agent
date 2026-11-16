const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/pglite');
const loader = require('../scripts/helpers/load-typescript.cjs');
async function main() {
  const pg = new PGlite();
  try {
    await pg.exec("CREATE TABLE workspaces(id text PRIMARY KEY); CREATE TABLE agents(id text PRIMARY KEY, workspace_id text, knowledge_base text DEFAULT ''); INSERT INTO workspaces VALUES ('a'),('b'); INSERT INTO agents(id,workspace_id) VALUES ('agent-a','a'),('agent-b','b');");
    await pg.exec(fs.readFileSync('scripts/migrations/knowledge-requests.sql', 'utf8'));
    const api = loader({}, { '@/src/db': { db: drizzle(pg) } })('lib/knowledge/requests.ts');
    await Promise.all([1,2,3].map(() => api.requestOwnerInput('a', 'agent-a', 'Question containing customer context')));
    const rows = (await pg.query('SELECT * FROM knowledge_requests')).rows;
    assert.equal(rows.length, 1);
    await pg.exec(fs.readFileSync('scripts/migrations/knowledge-requests.sql', 'utf8'));
    assert.deepEqual((await pg.query('SELECT * FROM knowledge_requests')).rows, rows);
    await assert.rejects(api.requestOwnerInput('b', 'agent-a', 'foreign'));
    assert.equal(await api.resolveKnowledgeRequest('b', rows[0].id, 'approve', 'foreign edit'), false);
    assert.equal((await pg.query("SELECT knowledge_base FROM agents WHERE id='agent-a'")).rows[0].knowledge_base, '');
    const approvals = await Promise.all([1,2].map(() => api.resolveKnowledgeRequest('a', rows[0].id, 'approve', 'Owner reviewed factual answer')));
    assert.equal(approvals.filter(Boolean).length, 1);
    const knowledge = (await pg.query("SELECT knowledge_base FROM agents WHERE id='agent-a'")).rows[0].knowledge_base;
    assert.equal(knowledge.split('Owner reviewed factual answer').length, 2);
    assert.ok(!knowledge.includes('customer context'));
    console.log('PASS: deduplication, tenant isolation, explicit approval, concurrent publication once, no automatic question/PII copy');
  } finally { await pg.close(); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
