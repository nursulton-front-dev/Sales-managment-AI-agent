const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/pglite');
const loader = require('../scripts/helpers/load-typescript.cjs');
async function main() {
  const pg = new PGlite();
  try {
    await pg.exec(fs.readFileSync('scripts/migrations/calendar-reservations.sql', 'utf8'));
    await pg.exec(`CREATE TABLE leads(id text PRIMARY KEY, workspace_id text, agent_id text, client_name text, client_phone text, channel text, status text, appointment_time timestamptz, google_event_id text, google_event_link text);`);
    let creates = 0;
    let timeout = false;
    const events = new Map();
    const mocks = {
      '@/src/db': { db: drizzle(pg) },
      './google': {
        getGoogleCalendarFreeBusy: async () => [],
        createGoogleCalendarEvent: async (_token, e) => {
          creates++;
          const value = { ...e, status: 'confirmed', htmlLink: 'https://calendar.test/event' };
          events.set(e.id, value);
          if (timeout) throw new Error('unknown result');
          return value;
        },
        getGoogleCalendarEvent: async (_token, id) => events.get(id) || null,
      },
    };
    const servers = Array.from({ length: 10 }, () => loader({}, mocks)('lib/calendar/reservations.ts'));
    const input = (key, workspaceId = 'a') => ({ workspaceId, requestKey: key,
      start: '2030-01-14T05:00:00Z', end: '2030-01-14T06:00:00Z', refreshToken: 'test',
      payload: { agentId: 'agent', clientName: 'Test', clientPhone: 'test-contact', channel: 'WebWidget', summary: 'Test', timeZone: 'Asia/Tashkent' } });
    const result = await Promise.all(servers.map((server, i) => server.bookReservedInterval(input(`request-${i}`))));
    assert.equal(creates, 1);
    assert.equal(result.filter((r) => r.status === 'confirmed').length, 1);
    const winner = result.findIndex((r) => r.status === 'confirmed');
    assert.equal((await servers[1].bookReservedInterval(input(`request-${winner}`))).status, 'confirmed');
    assert.equal(creates, 1);
    timeout = true;
    for (const changed of [
      { clientPhone: 'other-contact' }, { agentId: 'other-agent' },
      { summary: 'different service' }, { timeZone: 'UTC' },
    ]) {
      const replay = input(`request-${winner}`);
      replay.payload = { ...replay.payload, ...changed };
      await assert.rejects(servers[1].bookReservedInterval(replay));
    }
    assert.equal(creates, 1, 'changed operation must not create an event');
    assert.equal((await servers[0].bookReservedInterval(input('timeout', 'b'))).status, 'pending');
    assert.equal(creates, 2);
    timeout = false;
    assert.equal((await servers[1].bookReservedInterval(input('timeout', 'b'))).status, 'confirmed');
    assert.equal(creates, 2, 'recovery must not repeat create');
    const leads = await pg.query('SELECT count(*)::int AS count FROM leads');
    assert.equal(leads.rows[0].count, 2);
    await pg.exec("UPDATE calendar_reservations SET status='review', lead_id=NULL WHERE workspace_id='b'");
    events.clear();
    assert.equal((await servers[2].bookReservedInterval(input('timeout', 'b'))).status, 'pending');
    assert.equal(creates, 2, '404 after unknown outcome must not authorize POST');
    console.log('PASS: admission, one create, replay, timeout recovery, durable lead and missing-event safety');
  } finally { await pg.close(); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
