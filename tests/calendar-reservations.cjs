const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

async function main() {
  const pg = new PGlite();
  try {
    await pg.exec(fs.readFileSync('scripts/migrations/calendar-reservations.sql', 'utf8'));
    const reserve = async (id, workspace = 'a', start = '2030-01-14T05:00:00Z', end = '2030-01-14T06:00:00Z') =>
      (await pg.query('SELECT reserve_calendar_interval($1,$2,$3,$4,$5,$6,$7) AS id',
        [id, workspace, 'primary', id, start, end, `event-${id}`])).rows[0].id;
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => reserve(`r${i}`)));
    assert.equal(results.filter(Boolean).length, 1);
    const winner = results.find(Boolean);
    const before = (await pg.query('SELECT * FROM calendar_reservations ORDER BY id')).rows;
    await pg.exec(fs.readFileSync('scripts/migrations/calendar-reservations.sql', 'utf8'));
    assert.deepEqual((await pg.query('SELECT * FROM calendar_reservations ORDER BY id')).rows, before);
    assert.equal(await reserve(winner), winner);
    assert.equal(await reserve('overlap', 'a', '2030-01-14T05:30:00Z', '2030-01-14T06:30:00Z'), null);
    assert.equal(await reserve('adjacent', 'a', '2030-01-14T06:00:00Z', '2030-01-14T07:00:00Z'), 'adjacent');
    assert.equal(await reserve('other-tenant', 'b'), 'other-tenant');
    await assert.rejects(reserve(winner, 'a', '2030-01-14T04:00:00Z'));
    await pg.query("UPDATE calendar_reservations SET status = 'review' WHERE id = $1", [winner]);
    assert.equal(await reserve('unknown-outcome'), null);
    console.log('PASS: SQL reservation admission, overlap, adjacency, tenant scope, replay and unknown outcome');
  } finally { await pg.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
