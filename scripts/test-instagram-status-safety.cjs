const assert = require('node:assert/strict');
const load = require('./helpers/load-typescript.cjs')({}, {
  'next/server': { connection: async () => {}, NextResponse: { json: (data, init) => ({ data, status: init?.status ?? 200 }) } },
  '@/src/server/auth/session': { getServerSessionContext: async () => ({ workspaceId: 'workspace', role: 'owner' }) },
  '@/src/db': {
    getWorkspaceById: async () => ({ id: 'workspace', instagramConnected: true, instagramAgentId: 'agent', instagramAutoReply: true }),
    getAllAgents: async () => [{ id: 'agent', name: 'Agent', isActive: true }],
    updateWorkspace: async (_id, data) => { writes.push(data); },
  },
});
const writes = [];
const route = load('app/api/instagram/status/route.ts');
const request = (data) => ({ json: async () => data });
async function main() {
  assert.equal((await route.PATCH(request({ agentId: null }))).status, 400);
  assert.equal((await route.PATCH(request({ agentId: null, autoReply: true }))).status, 400);
  assert.equal((await route.PATCH(request({ autoReply: 'false' }))).status, 400);
  assert.equal(writes.length, 0);
  const ok = await route.PATCH(request({ agentId: null, autoReply: false }));
  assert.equal(ok.status, 200);
  assert.equal(ok.data.instagramAgentId, null);
  assert.equal(ok.data.instagramAutoReply, false);
  assert.equal(writes.length, 1);
  console.log('PASS: Instagram auto-reply requires an agent and settings return the saved state');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
