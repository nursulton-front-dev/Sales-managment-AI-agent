/* eslint-disable @typescript-eslint/no-require-imports -- Test-only PostgreSQL transport adapter. */
// Run against an empty LOCAL database with the exported Drizzle schema + widget-channels.sql applied.
// Drizzle and the repositories are real; only Neon HTTP transport is replaced with local psql.
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const loader = require('./helpers/load-typescript.cjs');
const pgHost = process.env.CHORLA_PG_HOST || '127.0.0.1';
const pgPort = process.env.CHORLA_PG_PORT || '55437';
const pgDatabase = process.env.CHORLA_PG_DATABASE || 'widget_acceptance';
if (!['127.0.0.1', 'localhost'].includes(pgHost) || !pgDatabase.startsWith('widget_')) throw new Error('This test accepts isolated local databases only');
const pgEnv = { ...process.env, PGHOST: pgHost, PGPORT: pgPort, PGDATABASE: pgDatabase, PGUSER: process.env.CHORLA_PG_USER || process.env.USER, PGPASSWORD: '', PGOPTIONS: '-c statement_timeout=15000' };
function parseCsv(input) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (char === ',' || char === '\n')) { row.push(cell); cell = ''; if (char === '\n') { rows.push(row); row = []; } }
    else if (char !== '\r' || quoted) cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function literal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('Non-finite SQL value'); return String(value); }
  return "'" + String(value instanceof Date ? value.toISOString() : value).replaceAll("'", "''") + "'";
}
const booleanFields = new Set(['enabled', 'is_active', 'instagram_connected', 'instagram_auto_reply', 'email_verified', 'google_calendar_connected']);
function query(sql, parameters = [], options = {}) {
  const rendered = sql.replace(/\$(\d+)/g, (_, index) => literal(parameters[Number(index) - 1]));
  return new Promise((resolve, reject) => execFile('psql', ['-X', '-q', '--csv', '-P', 'null=__NULL__', '-v', 'ON_ERROR_STOP=1', '-c', rendered], { env: pgEnv, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) { if (stderr.includes('duplicate key')) error.code = '23505'; reject(error); return; }
    const csv = parseCsv(stdout.trimEnd()); const fields = csv.shift() || [];
    const arrays = csv.map((row) => row.map((value, index) => value === '__NULL__' ? null : booleanFields.has(fields[index]) ? value === 't' : value));
    resolve({ fields: fields.map((name) => ({ name })), rows: options.arrayMode ? arrays : arrays.map((row) => Object.fromEntries(fields.map((name, index) => [name, row[index]]))), rowCount: arrays.length });
  }));
}
const env = { DATABASE_URL: 'postgresql://isolated.invalid/widget_acceptance', BETTER_AUTH_SECRET: 'local-postgres-test-secret-32-characters', OPENAI_API_KEY: 'test-fixture' };
let generated = 0, sent = 0;
const load = loader(env, { '@neondatabase/serverless': { neon: () => Object.assign(query, { query }) } }, async (url) => {
  if (String(url).includes('api.openai.com')) { generated++; return Response.json({ choices: [{ message: { content: 'PG test reply' } }] }); }
  if (String(url).includes('api.telegram.org')) { sent++; return Response.json({ ok: true, result: {} }); }
  throw new Error('External network disabled');
});
const checks = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); console.log('PASS', name); };
async function main() {
  const suffix = Date.now().toString();
  const db = load('src/db/index.ts'); const events = load('lib/server/channels/events.ts');
  const widgets = load('lib/server/widget/repository.ts'); const processor = load('lib/server/channels/processor.ts');
  const workspace = await db.createWorkspace({ id: 'pg-' + suffix, companyName: 'PG fixture', niche: 'other', ownerName: 'Owner', ownerEmail: suffix + '@example.test', ownerPhone: '', passwordHash: '', teamSize: '1', dailyLeadsVolume: '<20', tokenBalance: 10 });
  const agent = await db.createAgent({ id: 'agent-' + suffix, workspaceId: workspace.id, name: 'Agent', nicheTemplate: 'other', systemPrompt: 'Test', isActive: true, tgBotToken: '1234:pg_fixture_token' });
  const widget = await widgets.saveWidget(workspace.id, { agentId: agent.id, enabled: true, title: 'PG chat', greeting: 'Hello', color: '#2456a6', position: 'right', allowedOrigins: ['https://example.test'] });
  check('Widget settings persist through real PostgreSQL', (await widgets.widgetForWorkspace(workspace.id)).allowedOrigins[0] === 'https://example.test');
  const token = await widgets.createWidgetSession(widget, 'https://example.test');
  check('PostgreSQL visitor session validates its hashed token and origin', Boolean(await widgets.findWidgetSession(widget.id, 'https://example.test', token)) && !await widgets.findWidgetSession(widget.id, 'https://evil.test', token));
  const limited = await Promise.all(Array.from({ length: 15 }, () => widgets.takeRateLimit('pg-counter-' + suffix, 5)));
  check('Concurrent PostgreSQL rate cap admits exactly five requests', limited.filter(Boolean).length === 5);
  const conversationId = 'pg-conversation-' + suffix;
  const enqueue = (name) => events.enqueueEvent({ id: suffix + name, workspaceId: workspace.id, channel: 'Telegram', conversationId, payload: { agentId: agent.id, contact: 'id:42', clientName: 'PG visitor', text: name } });
  await enqueue('a'); await enqueue('b'); await enqueue('c');
  const rowA = await events.getChannelEvent(suffix + 'a'), rowC = await events.getChannelEvent(suffix + 'c');
  check('PostgreSQL sequence preserves accepted event order', rowA.sequence < rowC.sequence);
  check('FIFO gate rejects out-of-order claim in PostgreSQL', !await events.claimEvent(suffix + 'c'));
  const claims = await Promise.all(Array.from({ length: 8 }, () => events.claimEvent(suffix + 'a')));
  check('Concurrent PostgreSQL workers claim one event exactly once', claims.filter(Boolean).length === 1);
  await events.patchEvent(suffix + 'a', { status: 'pending', lockedUntil: null });
  await processor.processChannelEvent(suffix + 'a'); await processor.processChannelEvent(suffix + 'b'); await processor.processChannelEvent(suffix + 'c');
  check('PostgreSQL processor sends and records all three replies once', generated === 3 && sent === 3 && (await db.getMessagesByConversationId(conversationId)).length === 6);
  check('PostgreSQL processor debits exactly one token per response', (await db.getWorkspaceById(workspace.id)).tokenBalance === 7);
  await Promise.all([processor.processChannelEvent(suffix + 'a'), processor.processChannelEvent(suffix + 'b')]);
  check('Replaying completed PostgreSQL jobs never resends or recharges', sent === 3 && (await db.getWorkspaceById(workspace.id)).tokenBalance === 7);
  const incoming = { id: 'fixed-' + suffix, workspaceId: workspace.id, conversationId, sender: 'client', text: 'Idempotent insert' };
  await Promise.all(Array.from({ length: 5 }, () => db.createMessage(incoming)));
  check('Concurrent idempotent message inserts remain unique in PostgreSQL', (await db.getMessagesByConversationId(conversationId)).filter((message) => message.id === incoming.id).length === 1);
  await enqueue('crash'); await events.patchEvent(suffix + 'crash', { status: 'processing', stage: 'generating', lockedUntil: new Date(0) });
  await processor.processChannelEvent(suffix + 'crash');
  check('Expired PostgreSQL generation requires review and operator takeover', (await events.getChannelEvent(suffix + 'crash')).status === 'review' && (await db.getConversationById(conversationId)).status === 'human_takeover');
  fs.writeFileSync('docs/integrations/postgres-verification.json', JSON.stringify({ time: new Date().toISOString(), scope: 'Real local PostgreSQL 16, real Drizzle SQL and repositories. Neon HTTP transport replaced with a local psql adapter; external model/channel transports mocked.', checks }, null, 2));
  console.log(`Completed ${checks.length} PostgreSQL checks.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
