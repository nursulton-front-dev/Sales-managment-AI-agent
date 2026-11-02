/* eslint-disable @typescript-eslint/no-require-imports -- Isolated verification runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { NextRequest, NextResponse } = require('next/server');
const loader = require('./helpers/load-typescript.cjs');

const checks = [];
const check = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log('✅ PASS:', name);
};

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gapcha-tg-biz-unit-'));
const env = {
  DATABASE_URL: '',
  CHORLA_DATA_DIR: directory,
  BETTER_AUTH_SECRET: 'isolated-32-characters-secret-for-tests-only',
  TELEGRAM_SERVICE_BOT_TOKEN: '777888:mock_service_bot_token',
  TELEGRAM_SERVICE_BOT_USERNAME: 'gapcha_service_bot',
  INSTAGRAM_APP_SECRET: 'mock_meta_secret',
};

let identity = { workspaceId: 'ws_test_biz', role: 'owner', userEmail: 'biz@gapcha.ai', userName: 'BizOwner' };
const capturedCalls = [];

const load = loader(env, {
  'next/server': { NextResponse, connection: async () => {}, after: (fn) => fn() },
  '@/src/server/auth/session': { getServerSessionContext: async () => identity },
}, async (url, options) => {
  capturedCalls.push({ url: String(url), options });
  if (String(url).includes('api.telegram.org')) {
    return Response.json({ ok: true, result: { message_id: 123 } });
  }
  if (String(url).includes('graph.instagram.com')) {
    return Response.json({ success: true });
  }
  throw new Error('Unexpected external call: ' + url);
});

function request(url, body, headers = {}) {
  return new NextRequest('http://localhost:3000' + url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function main() {
  console.log('🚀 Running Telegram Business (Secretary Mode) & Instagram Verification Suite...\n');

  const db = load('src/db/index.ts');
  const tgServer = load('lib/server/telegram.ts');
  const igClient = load('lib/instagram/client.ts');
  const bindApi = load('app/api/integrations/telegram-business/bind/route.ts');
  const statusApi = load('app/api/integrations/telegram-business/status/route.ts');
  const toggleApi = load('app/api/integrations/telegram-business/toggle/route.ts');
  const disconnectApi = load('app/api/integrations/telegram-business/disconnect/route.ts');
  const tgWebhook = load('app/api/telegram/webhook/route.ts');
  const events = load('lib/server/channels/events.ts');

  // Setup workspace & agent
  const ws = await db.createWorkspace({
    id: 'ws_test_biz',
    companyName: 'gapcha AI Test',
    niche: 'consulting',
    ownerName: 'Biz Owner',
    ownerEmail: 'biz@gapcha.ai',
    ownerPhone: '+998900000000',
    passwordHash: 'hashed',
    teamSize: '1',
    dailyLeadsVolume: '<20',
    tokenBalance: 50,
  });
  const agent = await db.createAgent({
    id: 'agent_biz_01',
    workspaceId: ws.id,
    name: 'Consultant Alex',
    nicheTemplate: 'consulting',
    systemPrompt: 'You are an AI consultant.',
    isActive: true,
  });

  // 1. Initial status is disconnected
  const initStatus = await (await statusApi.GET()).json();
  check('Initial Telegram Business status is not connected', initStatus.connected === false);
  check('Status reports platform service bot username', initStatus.botUsername === 'gapcha_service_bot');

  // 2. Generate secure one-time binding link
  const bindRes = await bindApi.POST(request('/bind', { agentId: agent.id }));
  const bindData = await bindRes.json();
  check('Binding endpoint returns nonce and deep link', bindData.success && Boolean(bindData.nonce));
  check('Deep link points to platform service bot with start parameter',
    bindData.bindUrl === `https://t.me/gapcha_service_bot?start=bind_${bindData.nonce}`);

  // 3. User clicks link in Telegram and sends /start bind_<nonce>
  const serviceSecret = tgServer.serviceBotWebhookSecret();
  const startUpdate = {
    update_id: 1001,
    message: {
      message_id: 501,
      from: { id: 987654321, username: 'business_director', first_name: 'Director' },
      chat: { id: 987654321, type: 'private' },
      text: `/start bind_${bindData.nonce}`,
    },
  };
  const startReq = request('/api/telegram/webhook?serviceBot=1', startUpdate, {
    'x-telegram-bot-api-secret-token': serviceSecret,
  });
  const startRes = await tgWebhook.POST(startReq);
  check('Service bot accepts valid start bind token', startRes.status === 200);

  // 4. Verify binding is verified with user
  const binding = await db.getTelegramBusinessBinding(bindData.nonce);
  check('Binding record stores verified telegram user id', binding.verifiedTelegramUserId === '987654321');
  check('Binding has not been redeemed yet', binding.redeemedAt === null || binding.redeemedAt === undefined);

  // 5. Telegram sends business_connection update
  const connectionUpdate = {
    update_id: 1002,
    business_connection: {
      id: 'biz_conn_alpha_777',
      user: { id: 987654321, username: 'business_director', first_name: 'Director' },
      user_chat_id: 987654321,
      date: Math.floor(Date.now() / 1000),
      can_reply: true,
      is_enabled: true,
    },
  };
  const connReq = request('/api/telegram/webhook?serviceBot=1', connectionUpdate, {
    'x-telegram-bot-api-secret-token': serviceSecret,
  });
  const connRes = await tgWebhook.POST(connReq);
  check('Business connection webhook accepted', connRes.status === 200);

  // Verify workspace updated with connection
  const activeWs = await db.getWorkspaceById(ws.id);
  check('Workspace has telegramBusinessConnected = true', activeWs.telegramBusinessConnected === true);
  check('Workspace stores businessConnectionId', activeWs.telegramBusinessConnectionId === 'biz_conn_alpha_777');
  check('Workspace stores telegramBusinessUserId', activeWs.telegramBusinessUserId === '987654321');
  check('Workspace stores telegramBusinessCanReply = true', activeWs.telegramBusinessCanReply === true);

  // 6. Incoming client business_message
  const clientMsgUpdate = {
    update_id: 1003,
    business_message: {
      message_id: 888,
      business_connection_id: 'biz_conn_alpha_777',
      from: { id: 111222333, first_name: 'Customer Bob' },
      chat: { id: 111222333, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text: 'Здравствуйте, какие у вас цены?',
    },
  };
  const clientReq = request('/api/telegram/webhook?serviceBot=1', clientMsgUpdate, {
    'x-telegram-bot-api-secret-token': serviceSecret,
  });
  const clientRes = await tgWebhook.POST(clientReq);
  check('Client business_message enqueued as channel event', clientRes.status === 200);

  // Check enqueued event payload
  const wsEvents = await events.workspaceEvents(ws.id);
  const clientEvent = wsEvents.find((e) => e.channel === 'Telegram');
  check('Enqueued event has Telegram channel and businessConnectionId',
    Boolean(clientEvent) && clientEvent.payload.businessConnectionId === 'biz_conn_alpha_777');

  // 7. Human Takeover: Owner replies directly in Telegram from their phone
  const ownerMsgUpdate = {
    update_id: 1004,
    business_message: {
      message_id: 889,
      business_connection_id: 'biz_conn_alpha_777',
      from: { id: 987654321, username: 'business_director', first_name: 'Director' }, // Match owner id!
      chat: { id: 111222333, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text: 'Здравствуйте! Я лично отвечу через 5 минут.',
    },
  };
  const ownerReq = request('/api/telegram/webhook?serviceBot=1', ownerMsgUpdate, {
    'x-telegram-bot-api-secret-token': serviceSecret,
  });
  const ownerRes = await tgWebhook.POST(ownerReq);
  check('Owner direct message accepted', ownerRes.status === 200);

  const conv = await db.getConversationById(clientEvent.conversationId);
  check('Owner message triggers human_takeover on conversation', conv.status === 'human_takeover');
  const msgs = await db.getMessagesByConversationId(conv.id);
  const humanMsg = msgs.find((m) => m.sender === 'human');
  check('Owner message recorded with sender human and zero token cost',
    Boolean(humanMsg) && humanMsg.tokensCost === 0 && humanMsg.text.includes('лично отвечу'));

  // 8. Toggle Pause & Disconnect
  const toggleRes = await toggleApi.POST();
  check('Toggle pauses auto replies', toggleRes.status === 200);
  const pausedWs = await db.getWorkspaceById(ws.id);
  check('Workspace business enabled is false', pausedWs.telegramBusinessEnabled === false);

  const disconnRes = await disconnectApi.POST();
  check('Disconnect resets connection', disconnRes.status === 200);
  const disconnWs = await db.getWorkspaceById(ws.id);
  check('Workspace disconnected cleanly', disconnWs.telegramBusinessConnected === false && disconnWs.telegramBusinessConnectionId === null);

  // 9. Instagram API with Instagram Login: Webhook subscription endpoint check
  capturedCalls.length = 0;
  await igClient.subscribeInstagramWebhook('ig_user_456', 'user_token_123');
  check('Instagram webhook subscription calls graph.instagram.com, not graph.facebook.com',
    capturedCalls.some((c) => c.url.startsWith('https://graph.instagram.com/v21.0/ig_user_456/subscribed_apps')));

  console.log(`\n🎉 All ${checks.length} Telegram Business & Instagram assertions passed successfully!`);
}

main().catch((err) => {
  console.error('\n❌ Suite Error:', err);
  process.exit(1);
});
