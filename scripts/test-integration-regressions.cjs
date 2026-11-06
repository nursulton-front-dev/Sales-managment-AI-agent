/* eslint-disable @typescript-eslint/no-require-imports -- Isolated integration regression runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/pglite');
const { NextRequest, NextResponse } = require('next/server');
const loader = require('./helpers/load-typescript.cjs');

// No dotenv loading, production database, model requests or real Telegram/Meta calls.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gapcha-integration-regressions-'));
const env = {
  DATABASE_URL: '', CHORLA_DATA_DIR: directory,
  BETTER_AUTH_SECRET: 'isolated-integration-test-secret-at-least-32-characters',
  INSTAGRAM_APP_ID: 'test-app', INSTAGRAM_APP_SECRET: 'test-secret',
  INSTAGRAM_CONFIG_ID: 'test-config', NEXT_PUBLIC_APP_URL: 'https://example.test/',
};
let checks = 0;
function check(name, condition) {
  assert.ok(condition, name);
  checks++;
  console.log('PASS:', name);
}

async function main() {
  const pg = new PGlite();
  try {
    const loadDb = loader(env);
    const repository = loadDb('src/db/index.ts');
    repository.setTestDb(drizzle(pg));
    await pg.exec(`CREATE TABLE telegram_business_bindings (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, agent_id TEXT NOT NULL,
      verified_telegram_user_id TEXT, verified_telegram_username TEXT,
      expires_at TIMESTAMPTZ NOT NULL, redeemed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await repository.createTelegramBusinessBinding({ id: 'nonce-valid', workspaceId: 'ws-one', agentId: 'agent-one', expiresAt: new Date(Date.now() + 60000) });
    check('PostgreSQL binding is verified by its id column', await repository.verifyTelegramBusinessBindingUser('nonce-valid', '111', 'owner'));
    check('A second Telegram user cannot overwrite the verified owner', !await repository.verifyTelegramBusinessBindingUser('nonce-valid', '222', 'other'));
    const results = await Promise.all([
      repository.redeemTelegramBusinessBindingForUser('111'),
      repository.redeemTelegramBusinessBindingForUser('111'),
    ]);
    check('Concurrent redemption succeeds exactly once in PostgreSQL', results.filter(Boolean).length === 1);
    const redeemed = results.find(Boolean);
    check('Real SQL result exposes workspaceId and agentId for webhook', redeemed.workspaceId === 'ws-one' && redeemed.agentId === 'agent-one' && redeemed.verifiedTelegramUserId === '111');
    check('Redeemed binding cannot be verified again', !await repository.verifyTelegramBusinessBindingUser('nonce-valid', '111', 'owner'));
    await repository.createTelegramBusinessBinding({ id: 'nonce-expired', workspaceId: 'ws-one', agentId: 'agent-one', expiresAt: new Date(0) });
    check('Expired link is rejected in PostgreSQL', !await repository.verifyTelegramBusinessBindingUser('nonce-expired', '111'));

    let savedSettings;
    const loadSettings = loader(env, {
      'next/server': { NextResponse, connection: async () => {} },
      '@/src/server/auth/session': { getServerSessionContext: async () => ({ workspace: { id: 'ws-one' } }) },
      '@/src/db': { updateWorkspace: async (_id, changes) => { savedSettings = changes; return { id: 'ws-one', ...changes }; } },
    });
    const settings = loadSettings('app/api/workspace/settings/route.ts');
    const hours = loadSettings('lib/calendar/working-hours.ts');
    const request = (value) => new NextRequest('https://example.test/api/workspace/settings', { method: 'PATCH', body: JSON.stringify({ googleCalendarWorkingHours: value, googleCalendarSlotDuration: 45 }), headers: { 'Content-Type': 'application/json' } });
    const normalized = await settings.PATCH(request(' 9:00 – 18:00 '));
    check('Real settings handler accepts pasted hours and stores canonical format', normalized.status === 200 && savedSettings.googleCalendarWorkingHours === '09:00-18:00');
    for (const value of ['', '24:00-25:00', '18:00-10:00', '10:00-10:00', '10:99-18:00', null, 123]) {
      check(`Invalid range ${JSON.stringify(value)} is rejected`, (await settings.PATCH(request(value))).status === 400);
    }
    check('Ordinary HH:mm-HH:mm stays unchanged', hours.normalizeWorkingHours('10:00-18:00') === '10:00-18:00');

    const identity = { workspaceId: 'ws-one', userEmail: 'owner@example.test', role: 'owner' };
    let stageFailure = '';
    let savedConnection;
    const loadOAuth = loader(env, {
      'next/server': { NextResponse, connection: async () => {} },
      '@/src/server/auth/session': { getServerSessionContext: async () => identity },
      '@/src/db': {
        getWorkspaceById: async () => ({ id: 'ws-one' }),
        updateWorkspace: async (_id, updates) => { savedConnection = updates; return stageFailure === 'save_failed' ? null : { id: 'ws-one' }; },
      },
      '@/lib/instagram/client': {
        exchangeCodeForInstagramToken: async () => { if (stageFailure === 'token_exchange_failed') throw new Error('secret-provider-detail'); return { access_token: 'isolated-token', token_source: 'meta_unified', expires_in: 100000 }; },
        getInstagramUserProfile: async () => { if (stageFailure === 'profile_unavailable') throw new Error('secret-provider-detail'); return { id: 'ig-one', username: 'test-account' }; },
        subscribeInstagramWebhook: async () => stageFailure !== 'subscription_failed',
      },
    });
    const oauth = loadOAuth('app/api/instagram/callback/route.ts');
    const config = loadOAuth('lib/instagram/config.ts');
    const auth = loadOAuth('app/api/instagram/auth/route.ts');
    const start = await auth.GET(new NextRequest('https://example.test/api/instagram/auth', { headers: { accept: 'application/json' } }));
    const authUrl = new URL((await start.json()).authUrl);
    check('Unified login explicitly returns a code and canonical callback', authUrl.searchParams.get('override_default_response_type') === 'true' && authUrl.searchParams.get('response_type') === 'code' && authUrl.searchParams.get('redirect_uri') === 'https://example.test/api/instagram/callback');
    for (const failure of ['token_exchange_failed', 'profile_unavailable', 'subscription_failed', 'save_failed']) {
      stageFailure = failure;
      const callback = await oauth.GET(new NextRequest(`https://example.test/api/instagram/callback?code=fixture&state=${config.createOAuthState('ws-one')}`));
      const location = new URL(callback.headers.get('location'));
      check(`Callback reports ${failure} without leaking provider data`, location.searchParams.get('instagram_error') === failure && !location.href.includes('secret-provider-detail'));
    }
    stageFailure = '';
    const connected = await oauth.GET(new NextRequest(`https://example.test/api/instagram/callback?code=fixture&state=${config.createOAuthState('ws-one')}`));
    check('Success redirect requires saved connection and encrypted token', new URL(connected.headers.get('location')).searchParams.get('instagram_connected') === 'true' && savedConnection.instagramConnected && savedConnection.instagramAccessToken !== 'isolated-token');

    const calls = [];
    const loadClient = loader(env, {}, async (url) => { calls.push(new URL(url).hostname); return Response.json({ error: { message: 'refused' } }, { status: 400 }); });
    await assert.rejects(() => loadClient('lib/instagram/client.ts').exchangeCodeForInstagramToken('fixture', 'https://example.test/callback'));
    check('Refused Unified code is not sent to standalone Instagram OAuth', calls.length === 1 && calls[0] === 'graph.facebook.com');
    console.log(`Completed ${checks} isolated regression checks.`);
  } finally {
    await pg.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
