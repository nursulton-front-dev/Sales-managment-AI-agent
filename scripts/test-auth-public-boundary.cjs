/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const loader = require('./helpers/load-typescript.cjs');
async function main() {
  const auth = loader({ BETTER_AUTH_SECRET: 'isolated-test-secret-at-least-32-characters', BETTER_AUTH_URL: 'http://localhost:3000' }, { '@/src/db': { db: null } })('lib/auth.ts').auth;
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser({ email: 'isolated@example.test', name: 'Test', emailVerified: true });
  for (const path of ['/login/complete-2fa', '/sign-in/email', '/sign-in/email-otp']) {
    const response = await auth.handler(new Request('http://localhost:3000/api/auth' + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify({ userId: user.id, email: user.email, password: 'Example-Pass-37!', otp: '123456' }) }));
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('set-cookie'), null, path);
    console.log('PASS Public session bypass blocked:', path);
  }
  const result = await auth.api.complete2FALogin({ headers: new Headers(), body: { userId: user.id, rememberMe: true }, asResponse: true });
  assert.equal(result.status, 200);
  assert.ok(result.headers.get('set-cookie')?.includes('session_token'));
  console.log('PASS Internal OTP completion still creates session');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
