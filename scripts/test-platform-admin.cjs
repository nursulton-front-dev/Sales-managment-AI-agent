/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/pglite');
const loader = require('./helpers/load-typescript.cjs');
async function main() {
  const pg = new PGlite();
  await pg.exec(fs.readFileSync('scripts/migrations/platform-admin-access.sql', 'utf8'));
  let session = null;
  const load = loader({}, {
    'next/headers': { headers: async () => new Headers({ 'x-admin-role': 'super_admin' }) },
    '@/lib/auth': { auth: { api: { getSession: async () => session } } },
    '@/src/db': { db: drizzle(pg) },
  });
  const access = load('src/server/admin/access.ts');
  const api = load('app/api/admin/access/route.ts');
  const owner = 'maxramovnursulton1@gmail.com';
  const login = (email, verified = true, id = email) => { session = { user: { id, email, emailVerified: verified, name: email } }; };
  const post = (body, origin = 'https://test.local') => api.POST(new Request('https://test.local/api/admin/access', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  let count = 0;
  const check = (name, value) => { assert.ok(value, name); count++; console.log('PASS', name); };
  check('Forged admin header is denied without session', await access.getAdminIdentity() === null);
  login(owner, false); check('Unverified owner denied', await access.getAdminIdentity() === null);
  login(owner); check('Verified owner has team rights', Boolean(await access.adminCan('team')));
  check('Cross-origin invite denied', (await post({ action: 'invite', email: 'staff@example.test', role: 'support' }, 'https://evil.test')).status === 403);
  check('Owner cannot be revoked', (await post({ action: 'revoke', email: owner })).status === 400);
  check('Cannot create second super admin', (await post({ action: 'invite', email: 'staff@example.test', role: 'super_admin' })).status === 400);
  const invitation = await (await post({ action: 'invite', email: 'staff@example.test', role: 'support' })).json();
  const token = invitation.invitationPath.split('#')[1];
  check('Invite stores only hash', (await pg.query('select token_hash from platform_admin_access')).rows[0].token_hash !== token);
  login('wrong@example.test'); check('Wrong recipient denied', (await post({ action: 'accept', token })).status === 400);
  login('staff@example.test', false); check('Unverified recipient denied', (await post({ action: 'accept', token })).status === 403);
  login('staff@example.test');
  const results = await Promise.all([post({ action: 'accept', token }), post({ action: 'accept', token })]);
  check('Concurrent acceptance has exactly one winner', results.filter(r => r.status === 200).length === 1);
  check('Support allowed tickets', Boolean(await access.adminCan('support')));
  check('Support denied financial data', await access.adminCan('billing') === null);
  check('Staff cannot invite', (await post({ action: 'invite', email: 'other@example.test', role: 'support' })).status === 403);
  login(owner); await post({ action: 'change_role', email: 'staff@example.test', role: 'finance' });
  login('staff@example.test'); check('Role change takes immediate effect', Boolean(await access.adminCan('billing')) && await access.adminCan('support') === null);
  login(owner); await post({ action: 'revoke', email: 'staff@example.test' });
  login('staff@example.test'); check('Revocation takes immediate effect', await access.getAdminIdentity() === null);
  login(owner); const expired = await (await post({ action: 'invite', email: 'staff@example.test', role: 'operator' })).json();
  await pg.exec("UPDATE platform_admin_access SET expires_at = NOW() - INTERVAL '1 second'");
  login('staff@example.test'); check('Expired invite denied', (await post({ action: 'accept', token: expired.invitationPath.split('#')[1] })).status === 400);
  check('Audit records invite accept role change revoke', (await pg.query('select count(*)::int as n from platform_admin_access_events')).rows[0].n === 5);
  await pg.close();
  console.log(`${count} admin access checks passed`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
