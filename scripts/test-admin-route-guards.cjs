/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { NextRequest, NextResponse } = require('next/server');
const loader = require('./helpers/load-typescript.cjs');
async function main() {
  const load = loader({}, {
    'next/server': { NextResponse, connection: async () => {} },
    'next/headers': { cookies: async () => ({}) },
    '@/src/server/admin/access': { adminCan: async () => null },
    '@/src/server/auth/session': { getServerSessionContext: async () => ({ isSuperAdmin: false }) },
    '@/src/db': {},
    '@/lib/server/admin/channels-stats': {},
    '@/lib/server/ai/providers/deepseek': {},
  });
  const routes = {
    workspaces: ['GET', 'PATCH'], audit: ['GET'], 'token-logs': ['GET'],
    deepseek: ['GET', 'POST'], support: ['GET'], 'support/[id]': ['GET', 'POST'],
    'channels/stats': ['GET'], 'channels/retry-event': ['POST'], reset: ['POST'],
    'support-session': ['POST', 'DELETE'],
  };
  let count = 0;
  for (const [path, methods] of Object.entries(routes)) {
    const route = load(`app/api/admin/${path}/route.ts`);
    for (const method of methods) {
      const response = await route[method](new NextRequest(`https://test.local/api/admin/${path}`, { method, headers: { 'x-admin-role': 'super_admin', 'x-admin-email': 'maxramovnursulton1@gmail.com' } }), { params: Promise.resolve({ id: 'test' }) });
      assert.equal(response.status, 403, `${method} ${path}`); count++;
    }
  }
  console.log(`${count} actual admin handlers reject forged admin headers`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
