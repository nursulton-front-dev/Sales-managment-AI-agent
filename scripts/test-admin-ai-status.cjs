/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { NextResponse } = require('next/server');
const loader = require('./helpers/load-typescript.cjs');
async function main() {
  let configured = true, reply = 'OK', calls = 0;
  class Provider {
    name = 'deepseek'; defaultModel = 'test-model';
    isConfigured() { return configured; }
    async checkHealth() { calls++; return { ok: true, message: 'OK' }; }
    async complete() { return { content: reply, durationMs: 10 }; }
  }
  const api = loader({}, {
    'next/server': { NextResponse, connection: async () => {} },
    '@/src/server/admin/access': { adminCan: async () => ({ role: 'super_admin' }) },
    '@/lib/server/ai/providers/deepseek': { DeepSeekProvider: Provider },
  })('app/api/admin/deepseek/route.ts');
  const initial = await (await api.GET()).json();
  assert.equal(initial.configured, true); assert.equal(initial.healthy, undefined); assert.equal(calls, 0);
  const post = () => api.POST(new Request('https://test.local/api/admin/deepseek', { method: 'POST', headers: { origin: 'https://test.local' } }));
  assert.equal((await (await post()).json()).healthy, true);
  reply = ''; assert.equal((await (await post()).json()).healthy, false);
  configured = false; assert.equal((await (await post()).json()).configured, false);
  console.log('4 AI status scenarios passed: untested, working, empty response, missing configuration');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
