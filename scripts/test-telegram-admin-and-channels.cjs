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

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gapcha-tg-admin-test-'));
const env = {
  DATABASE_URL: '',
  CHORLA_DATA_DIR: directory,
  BETTER_AUTH_SECRET: 'isolated-32-characters-secret-for-tests-only',
  TELEGRAM_SERVICE_BOT_TOKEN: '777888:mock_service_bot_token',
  TELEGRAM_SERVICE_BOT_USERNAME: 'gapcha_service_bot',
  TELEGRAM_ADMIN_USER_ID: '6804139305',
  NEXT_PUBLIC_APP_URL: 'https://chorla-ai.vercel.app',
};

let identity = {
  workspaceId: 'ws_test_admin',
  role: 'owner',
  userEmail: 'owner@gapcha.ai',
  userName: 'PlatformOwner',
  isSuperAdmin: true,
};

const capturedCalls = [];

const load = loader(
  env,
  {
    'next/server': { NextResponse, connection: async () => {}, after: (fn) => fn() },
    '@/src/server/auth/session': { getServerSessionContext: async () => identity },
  },
  async (url, options) => {
    capturedCalls.push({ url: String(url), options });
    if (String(url).includes('api.telegram.org')) {
      return Response.json({ ok: true, result: { message_id: 999 } });
    }
    if (String(url).includes('/api/telegram/webhook')) {
      return Response.json({ status: 'online' });
    }
    throw new Error('Unexpected external call: ' + url);
  }
);

async function main() {
  console.log('🚀 Running Telegram Admin, Channels & Queue Replay Verification Suite...\n');

  const tg = load('lib/server/telegram.ts');
  const statsLib = load('lib/server/admin/channels-stats.ts');
  const webhookApi = load('app/api/telegram/webhook/route.ts');
  const statsApi = load('app/api/admin/channels/stats/route.ts');
  const retryApi = load('app/api/admin/channels/retry-event/route.ts');
  const eventsLib = load('lib/server/channels/events.ts');

  // 1. Telegram Admin Authorization checks
  check('Telegram Owner ID matches 6804139305', tg.TELEGRAM_OWNER_ID === '6804139305');
  check('isTelegramAdmin identifies 6804139305 as admin', tg.isTelegramAdmin(6804139305) === true);
  check('isTelegramAdmin identifies string ID "6804139305" as admin', tg.isTelegramAdmin('6804139305') === true);
  check('isTelegramAdmin rejects other user ID 123456789', tg.isTelegramAdmin(123456789) === false);
  check('isTelegramAdmin rejects undefined or null', tg.isTelegramAdmin(null) === false);

  // 2. Secret Token / Webhook Header Security
  const secretHeader = tg.serviceBotWebhookSecret();

  // 2.1 Unauthorized user sends /admin command
  capturedCalls.length = 0;
  const unauthReq = new NextRequest('http://localhost:3000/api/telegram/webhook?serviceBot=1', {
    method: 'POST',
    headers: {
      'x-telegram-bot-api-secret-token': secretHeader,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      update_id: 1001,
      message: {
        message_id: 55,
        from: { id: 999999999, first_name: 'Attacker' },
        chat: { id: 999999999 },
        text: '/admin',
      },
    }),
  });
  const unauthRes = await webhookApi.POST(unauthReq);
  check('Webhook accepts update and processes command safely', unauthRes.status === 200);
  const rejectCall = capturedCalls.find((c) => c.url.includes('sendMessage'));
  check('Unauthorized user receives access denied reply',
    rejectCall && JSON.parse(rejectCall.options.body).text.includes('нет прав доступа'));

  // 2.2 Authorized Owner (6804139305) sends /admin
  capturedCalls.length = 0;
  const authReq = new NextRequest('http://localhost:3000/api/telegram/webhook?serviceBot=1', {
    method: 'POST',
    headers: {
      'x-telegram-bot-api-secret-token': secretHeader,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      update_id: 1002,
      message: {
        message_id: 56,
        from: { id: 6804139305, first_name: 'Admin' },
        chat: { id: 6804139305 },
        text: '/admin',
      },
    }),
  });
  const authRes = await webhookApi.POST(authReq);
  check('Webhook accepts owner command with HTTP 200', authRes.status === 200);
  const adminMsgCall = capturedCalls.find((c) => c.url.includes('sendMessage'));
  check('Owner receives Telegram admin panel with stats and reply_markup keyboard',
    adminMsgCall &&
    JSON.parse(adminMsgCall.options.body).text.includes('Админ-панель gapcha AI') &&
    Boolean(JSON.parse(adminMsgCall.options.body).reply_markup));

  // 2.3 Callback query security: Unauthorized callback query
  capturedCalls.length = 0;
  const unauthCbReq = new NextRequest('http://localhost:3000/api/telegram/webhook?serviceBot=1', {
    method: 'POST',
    headers: {
      'x-telegram-bot-api-secret-token': secretHeader,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      update_id: 1003,
      callback_query: {
        id: 'cb_test_1',
        from: { id: 999999999 },
        message: { message_id: 56, chat: { id: 999999999 } },
        data: 'admin_stats_today',
      },
    }),
  });
  const unauthCbRes = await webhookApi.POST(unauthCbReq);
  check('Unauthorized callback processed with HTTP 200', unauthCbRes.status === 200);
  const cbAnswer = capturedCalls.find((c) => c.url.includes('answerCallbackQuery'));
  check('Unauthorized callback receives rejection pop-up alert',
    cbAnswer && JSON.parse(cbAnswer.options.body).text.includes('Доступ запрещен'));

  // 2.4 Authorized Callback query: admin_diag
  capturedCalls.length = 0;
  const authCbReq = new NextRequest('http://localhost:3000/api/telegram/webhook?serviceBot=1', {
    method: 'POST',
    headers: {
      'x-telegram-bot-api-secret-token': secretHeader,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      update_id: 1004,
      callback_query: {
        id: 'cb_test_2',
        from: { id: 6804139305 },
        message: { message_id: 56, chat: { id: 6804139305 } },
        data: 'admin_diag',
      },
    }),
  });
  const authCbRes = await webhookApi.POST(authCbReq);
  check('Authorized callback query processed with HTTP 200', authCbRes.status === 200);
  const editMsgCall = capturedCalls.find((c) => c.url.includes('editMessageText'));
  check('Owner receives updated diagnostics view in message',
    editMsgCall && JSON.parse(editMsgCall.options.body).text.includes('Диагностика системы gapcha AI'));

  // 2.5 Public user /start: sends greeting with inline buttons
  capturedCalls.length = 0;
  const userStartReq = new NextRequest('http://localhost:3000/api/telegram/webhook?serviceBot=1', {
    method: 'POST',
    headers: {
      'x-telegram-bot-api-secret-token': secretHeader,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      update_id: 1005,
      message: {
        message_id: 70,
        from: { id: 11223344, first_name: 'Client' },
        chat: { id: 11223344 },
        text: '/start',
      },
    }),
  });
  const userStartRes = await webhookApi.POST(userStartReq);
  check('Plain /start accepts public user with HTTP 200', userStartRes.status === 200);
  const userStartMsg = capturedCalls.find((c) => c.url.includes('sendMessage'));
  check('Public user receives greeting with inline buttons (connect, help, cabinet)',
    userStartMsg &&
    JSON.parse(userStartMsg.options.body).text.includes('официальный ИИ-ассистент платформы') &&
    Boolean(JSON.parse(userStartMsg.options.body).reply_markup?.inline_keyboard?.length));

  // 2.6 Public user clicks "user_connect" callback button
  capturedCalls.length = 0;
  const userConnectReq = new NextRequest('http://localhost:3000/api/telegram/webhook?serviceBot=1', {
    method: 'POST',
    headers: {
      'x-telegram-bot-api-secret-token': secretHeader,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      update_id: 1006,
      callback_query: {
        id: 'cb_user_connect_1',
        from: { id: 11223344 },
        message: { message_id: 70, chat: { id: 11223344 } },
        data: 'user_connect',
      },
    }),
  });
  const userConnectRes = await webhookApi.POST(userConnectReq);
  check('Public user callback user_connect processed with HTTP 200', userConnectRes.status === 200);
  const userConnectEdit = capturedCalls.find((c) => c.url.includes('editMessageText'));
  check('Public user receives connection steps without requiring admin rights',
    userConnectEdit && JSON.parse(userConnectEdit.options.body).text.includes('Подключение Telegram-аккаунта'));

  // 2.7 Public user clicks "user_help" callback button
  capturedCalls.length = 0;
  const userHelpReq = new NextRequest('http://localhost:3000/api/telegram/webhook?serviceBot=1', {
    method: 'POST',
    headers: {
      'x-telegram-bot-api-secret-token': secretHeader,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      update_id: 1007,
      callback_query: {
        id: 'cb_user_help_1',
        from: { id: 11223344 },
        message: { message_id: 70, chat: { id: 11223344 } },
        data: 'user_help',
      },
    }),
  });
  const userHelpRes = await webhookApi.POST(userHelpReq);
  check('Public user callback user_help processed with HTTP 200', userHelpRes.status === 200);
  const userHelpEdit = capturedCalls.find((c) => c.url.includes('editMessageText'));
  check('Public user receives FAQ guidance',
    userHelpEdit && JSON.parse(userHelpEdit.options.body).text.includes('Справка и частые вопросы'));

  // 3. Queue Replay & Idempotency
  // Create a stuck test event
  const stuckEventId = 'test_evt_stuck_01';
  await eventsLib.enqueueEvent({
    id: stuckEventId,
    workspaceId: 'ws_test_admin',
    channel: 'Telegram',
    conversationId: 'conv_test_replay',
    payload: {
      agentId: 'ag_test',
      contact: 'id:6804139305',
      text: 'Тест повтора',
    },
  });
  await eventsLib.patchEvent(stuckEventId, { status: 'retry', stage: 'failed', attempts: 2, errorCode: 'network_timeout' });

  // Replay the stuck event
  const replayResult = await statsLib.retryStuckEvent(stuckEventId);
  check('Single event replay succeeds on stuck event', replayResult.success === true);

  // Verify that an already delivered event CANNOT be replayed (no double send / double charge)
  await eventsLib.patchEvent(stuckEventId, { status: 'done', stage: 'delivered' });
  const doubleReplayResult = await statsLib.retryStuckEvent(stuckEventId);
  check('Already delivered event safely rejected to prevent double send',
    doubleReplayResult.success === false && doubleReplayResult.message.includes('уже успешно доставлено'));

  // 4. Web Admin Channels API: Authorization & Aggregation
  // 4.1 Unauthenticated request (not super_admin)
  identity = { workspaceId: 'ws_regular', role: 'member', userEmail: 'user@example.com', isSuperAdmin: false };
  const deniedStatsReq = new NextRequest('http://localhost:3000/api/admin/channels/stats?period=today');
  const deniedStatsRes = await statsApi.GET(deniedStatsReq);
  check('Web Admin Stats rejects non-super_admin with HTTP 403', deniedStatsRes.status === 403);

  // 4.2 Super Admin request for periods 'today', '7d', '30d'
  identity = { workspaceId: 'ws_test_admin', role: 'owner', userEmail: 'admin@gapcha.ai', isSuperAdmin: true };
  const allowedStatsReq = new NextRequest('http://localhost:3000/api/admin/channels/stats?period=today');
  const allowedStatsRes = await statsApi.GET(allowedStatsReq);
  check('Web Admin Stats allows super_admin with HTTP 200', allowedStatsRes.status === 200);
  const statsPayload = await allowedStatsRes.json();
  check('Web Admin Stats returns workspaces and message traffic metrics',
    statsPayload.success === true &&
    typeof statsPayload.stats.workspaces.total === 'number' &&
    typeof statsPayload.stats.messages.incoming === 'number');

  // 4.3 Web Admin Retry Event endpoint
  const deniedRetryReq = new NextRequest('http://localhost:3000/api/admin/channels/retry-event', {
    method: 'POST',
    body: JSON.stringify({ eventId: stuckEventId }),
  });
  identity = { ...identity, isSuperAdmin: false };
  const deniedRetryRes = await retryApi.POST(deniedRetryReq);
  check('Web Admin Retry rejects non-super_admin with HTTP 403', deniedRetryRes.status === 403);

  identity = { ...identity, isSuperAdmin: true };
  const allowedRetryReq = new NextRequest('http://localhost:3000/api/admin/channels/retry-event', {
    method: 'POST',
    body: JSON.stringify({ eventId: 'non_existent_evt' }),
  });
  const allowedRetryRes = await retryApi.POST(allowedRetryReq);
  const retryBody = await allowedRetryRes.json();
  check('Web Admin Retry gracefully handles non-existent event',
    retryBody.success === false && retryBody.message.includes('не найдено'));

  console.log(`\n🎉 All ${checks.length} Telegram Admin & Queue Replay assertions passed successfully!`);
}

main().catch((err) => {
  console.error('\n❌ Suite Error:', err);
  process.exit(1);
});
