// Requires the disposable local PostgreSQL started for this audit, never reads .env.
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
async function main() {
  const tenant = `test-${Date.now()}`;
  const query = (sql) => run('psql', ['-h', '127.0.0.1', '-p', '55439', '-d', 'postgres', '-X', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql], { env: { PATH: process.env.PATH, HOME: '/tmp', PGCONNECT_TIMEOUT: '3' } });
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => query(`SELECT reserve_calendar_interval('${tenant}-${i}', '${tenant}', 'primary', 'request-${i}', '2030-01-14T05:00:00Z', '2030-01-14T06:00:00Z', '${tenant}-event-${i}')`)));
  assert.equal(results.filter((r) => r.stdout.trim()).length, 1);
  console.log('PASS: 20 independent PostgreSQL connections admitted exactly one overlapping reservation');
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
