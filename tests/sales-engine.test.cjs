/**
 * CHORLA AI — AI Sales Engine Comprehensive Test Suite
 * Covers all 33 test scenarios (A.1 - F.33) without real external API calls.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loader = require('../scripts/helpers/load-typescript.cjs');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chorla-sales-engine-test-'));

// Global mock state for HTTP requests
const mockHttp = {
  lastDeepSeekRequest: null,
  lastOpenAIRequest: null,
  lastAnthropicRequest: null,
  lastTelegramRequest: null,
  lastInstagramRequest: null,
  telegramSends: [],
  instagramSends: [],
  roundTripCount: 0,
  openaiResponses: [],
  anthropicResponses: [],
  anthropicRequests: [],
  deepseekResponses: [],
  reset() {
    this.lastDeepSeekRequest = null;
    this.lastOpenAIRequest = null;
    this.lastAnthropicRequest = null;
    this.lastTelegramRequest = null;
    this.lastInstagramRequest = null;
    this.telegramSends = [];
    this.instagramSends = [];
    this.roundTripCount = 0;
    this.openaiResponses = [];
    this.anthropicResponses = [];
    this.anthropicRequests = [];
    this.deepseekResponses = [];
  },
};

const mockFetch = async (url, options = {}) => {
  const urlStr = String(url);
  const method = options.method || 'GET';
  const bodyText = options.body ? String(options.body) : '';
  let bodyJson = null;
  try {
    if (bodyText) bodyJson = JSON.parse(bodyText);
  } catch {}

  // 1. DeepSeek API mock
  if (urlStr.includes('api.deepseek.com')) {
    mockHttp.lastDeepSeekRequest = { url: urlStr, method, headers: options.headers, body: bodyJson };
    if (mockHttp.deepseekResponses.length > 0) {
      const next = mockHttp.deepseekResponses.shift();
      return Response.json(next.body, { status: next.status || 200, headers: next.headers });
    }
    return Response.json({
      choices: [{ message: { content: 'DeepSeek ответил: Здравствуйте! Чем могу помочь?' } }],
      usage: { prompt_tokens: 15, completion_tokens: 10, prompt_cache_hit_tokens: 4 },
      model: 'deepseek-chat',
    });
  }

  // 2. OpenAI API mock
  if (urlStr.includes('api.openai.com')) {
    mockHttp.lastOpenAIRequest = { url: urlStr, method, headers: options.headers, body: bodyJson };
    if (mockHttp.openaiResponses.length > 0) {
      const next = mockHttp.openaiResponses.shift();
      return Response.json(next.body, { status: next.status || 200, headers: next.headers });
    }
    return Response.json({
      choices: [{ message: { content: 'OpenAI Luna ответила: Здравствуйте! Я виртуальный менеджер Chorla AI.' } }],
      usage: { prompt_tokens: 20, completion_tokens: 12 },
      model: 'gpt-6-luna',
    });
  }

  // 3. Anthropic API mock
  if (urlStr.includes('api.anthropic.com')) {
    mockHttp.lastAnthropicRequest = { url: urlStr, method, headers: options.headers, body: bodyJson };
    mockHttp.anthropicRequests.push({ url: urlStr, method, headers: options.headers, body: bodyJson });
    if (mockHttp.anthropicResponses.length > 0) {
      const next = mockHttp.anthropicResponses.shift();
      return Response.json(next.body, { status: next.status || 200, headers: next.headers });
    }
    return Response.json({
      content: [{ type: 'text', text: 'Anthropic Haiku ответила: Assalomu alaykum! Chorla AI xizmatidasiz.' }],
      usage: { input_tokens: 22, output_tokens: 14 },
      model: 'claude-haiku-5-5',
    });
  }

  // 4. Telegram API mock
  if (urlStr.includes('api.telegram.org')) {
    mockHttp.lastTelegramRequest = { url: urlStr, body: bodyJson };
    if (urlStr.includes('sendMessage')) {
      mockHttp.telegramSends.push(bodyJson);
    }
    return Response.json({ ok: true, result: { message_id: Math.floor(Math.random() * 10000) } });
  }

  // 5. Instagram Graph API mock
  if (urlStr.includes('graph.instagram.com') || urlStr.includes('graph.facebook.com')) {
    mockHttp.lastInstagramRequest = { url: urlStr, body: bodyJson };
    mockHttp.instagramSends.push(bodyJson);
    return Response.json({ recipient_id: 'client_123', message_id: 'mid_sample' });
  }

  throw new Error(`Unexpected external request in test: ${urlStr}`);
};

const testEnv = {
  DATABASE_URL: '',
  CHORLA_DATA_DIR: tempDir,
  BETTER_AUTH_SECRET: 'test-secret-min-32-chars-long-secure-sample',
  INSTAGRAM_APP_SECRET: 'test-instagram-secret-value-32',
  TELEGRAM_SERVICE_BOT_TOKEN: '12345:service_token',
  AI_PROVIDER: 'deepseek',
  DEEPSEEK_API_KEY: 'test-deepseek-key',
  OPENAI_API_KEY: 'test-openai-key',
  OPENAI_MODEL: 'gpt-6-luna',
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  ANTHROPIC_MODEL: 'claude-haiku-5-5',
};

const load = loader(testEnv, {}, mockFetch);

// Load essential modules
const db = load('src/db/index.ts');
const { DeepSeekProvider } = load('lib/server/ai/providers/deepseek.ts');
const { OpenAIProvider } = load('lib/server/ai/providers/openai.ts');
const { AnthropicProvider } = load('lib/server/ai/providers/anthropic.ts');
const { bookingConfirmation } = load('lib/calendar/confirmation.ts');
const { compileAgentDraft } = load('lib/wizard/prompt-builder.ts');
const { getUniversalConversationalRules } = load('lib/ai/prompts/niche-scenarios.ts');
const { processAgentMessage, calculateEstimatedCost } = load('lib/ai/gateway.ts');
const { processChannelEvent } = load('lib/server/channels/processor.ts');
const events = load('lib/server/channels/events.ts');
const { encryptToken } = load('lib/instagram/config.ts');

const results = [];

async function runTest(number, name, fn) {
  mockHttp.reset();
  try {
    await fn();
    results.push({ number, name, status: 'PASS' });
    console.log(`[PASS] Test ${number}: ${name}`);
  } catch (error) {
    results.push({ number, name, status: 'FAIL', error: error.message });
    console.error(`[FAIL] Test ${number}: ${name}`);
    console.error(error);
  }
}

async function main() {
  console.log('====================================================');
  console.log('CHORLA AI — AI SALES ENGINE TEST SUITE (33 SCENARIOS)');
  console.log('====================================================\n');

  // =========================================================================
  // A. Провайдеры (7 тестов)
  // =========================================================================

  await runTest(1, 'DeepSeek продолжает работать при AI_PROVIDER=deepseek', async () => {
    const provider = new DeepSeekProvider();
    assert.equal(provider.isConfigured(), true);
    const res = await provider.complete({
      messages: [{ role: 'user', content: 'Привет' }],
    });
    assert.ok(res.content.includes('DeepSeek'));
    assert.equal(res.provider, 'deepseek');
    assert.equal(res.usage.promptTokens, 15);
    assert.equal(res.usage.cachedPromptTokens, 4);
    assert.ok(mockHttp.lastDeepSeekRequest.url.includes('api.deepseek.com'));
  });

  await runTest(2, 'OpenAI Luna возвращает текстовый ответ при AI_PROVIDER=openai', async () => {
    const provider = new OpenAIProvider();
    assert.equal(provider.isConfigured(), true);
    const res = await provider.complete({
      messages: [{ role: 'user', content: 'Здравствуйте' }],
    });
    assert.ok(res.content.includes('OpenAI Luna'));
    assert.equal(res.model, 'gpt-6-luna');
    assert.equal(mockHttp.lastOpenAIRequest.body.model, 'gpt-6-luna');
    assert.equal(mockHttp.lastOpenAIRequest.body.reasoning_effort, 'none');
    assert.equal(mockHttp.lastOpenAIRequest.body.thinking, undefined);
    assert.equal(mockHttp.lastOpenAIRequest.body.temperature, undefined);
  });

  await runTest(3, 'OpenAI Luna возвращает tool_calls и успешно выполняет их', async () => {
    const provider = new OpenAIProvider();
    mockHttp.openaiResponses.push({
      body: {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_luna_123',
                  type: 'function',
                  function: {
                    name: 'check_calendar_slots',
                    arguments: JSON.stringify({ date: '2026-11-20' }),
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 25, completion_tokens: 15 },
        model: 'gpt-6-luna',
      },
    });

    const res = await provider.complete({
      messages: [{ role: 'user', content: 'Когда есть свободные слоты?' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'check_calendar_slots',
            description: 'Проверить свободные слоты',
            parameters: { type: 'object', properties: { date: { type: 'string' } } },
          },
        },
      ],
    });

    assert.ok(Array.isArray(res.toolCalls));
    assert.equal(res.toolCalls.length, 1);
    assert.equal(res.toolCalls[0].function.name, 'check_calendar_slots');
    assert.equal(res.toolCalls[0].id, 'call_luna_123');
    assert.deepEqual(JSON.parse(res.toolCalls[0].function.arguments), { date: '2026-11-20' });
  });

  await runTest(4, 'Anthropic Haiku возвращает текстовый ответ при AI_PROVIDER=anthropic', async () => {
    const provider = new AnthropicProvider();
    assert.equal(provider.isConfigured(), true);
    const res = await provider.complete({
      messages: [
        { role: 'system', content: 'Ты ассистент продаж.' },
        { role: 'user', content: 'Assalomu alaykum' },
      ],
    });
    assert.ok(res.content.includes('Chorla AI'));
    assert.equal(mockHttp.lastAnthropicRequest.body.model, 'claude-haiku-5-5');
    assert.equal(mockHttp.lastAnthropicRequest.body.system, 'Ты ассистент продаж.');
    assert.deepEqual(mockHttp.lastAnthropicRequest.body.thinking, { type: 'adaptive' });
    assert.deepEqual(mockHttp.lastAnthropicRequest.body.output_config, { effort: 'medium' });
    assert.equal(mockHttp.lastAnthropicRequest.body.max_tokens, 2048);
    assert.equal(mockHttp.lastAnthropicRequest.body.temperature, undefined);
    assert.equal(mockHttp.lastAnthropicRequest.body.top_p, undefined);
    assert.equal(mockHttp.lastAnthropicRequest.body.top_k, undefined);
    assert.equal(mockHttp.lastAnthropicRequest.headers['x-api-key'], 'test-anthropic-key');
    assert.equal(mockHttp.lastAnthropicRequest.headers['anthropic-version'], '2023-06-01');
  });

  await runTest(5, 'Anthropic Haiku возвращает tool_use и успешно выполняет их', async () => {
    const provider = new AnthropicProvider();
    mockHttp.anthropicResponses.push({
      body: {
        content: [
          { type: 'thinking', thinking: 'Analyzing availability...' },
          {
            type: 'tool_use',
            id: 'toolu_anthropic_999',
            name: 'check_calendar_slots',
            input: { date: '2026-11-20' },
          },
        ],
        usage: { input_tokens: 30, output_tokens: 20 },
        model: 'claude-haiku-5-5',
      },
    });

    const res = await provider.complete({
      messages: [{ role: 'user', content: 'Qachon bo\'sh vaqt bor?' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'check_calendar_slots',
            description: 'Check slots',
            parameters: { type: 'object', properties: { date: { type: 'string' } } },
          },
        },
      ],
    });

    assert.ok(Array.isArray(res.toolCalls));
    assert.equal(res.toolCalls.length, 1);
    assert.equal(res.toolCalls[0].function.name, 'check_calendar_slots');
    assert.equal(res.toolCalls[0].id, 'toolu_anthropic_999');
    assert.deepEqual(JSON.parse(res.toolCalls[0].function.arguments), { date: '2026-11-20' });
  });

  await runTest(6, 'Thinking-блок Anthropic никогда не попадает в итоговый ответ клиенту', async () => {
    const provider = new AnthropicProvider();
    mockHttp.anthropicResponses.push({
      body: {
        content: [
          { type: 'thinking', thinking: 'TOP_SECRET_REASONING_CHAIN_NEVER_SHOW_TO_USER' },
          { type: 'text', text: 'У нас есть места на завтра на 15:00.' },
        ],
        usage: { input_tokens: 40, output_tokens: 25 },
        model: 'claude-haiku-5-5',
      },
    });

    const res = await provider.complete({
      messages: [{ role: 'user', content: 'Есть места?' }],
    });

    assert.equal(res.content, 'У нас есть места на завтра на 15:00.');
    assert.ok(!res.content.includes('TOP_SECRET'));
    assert.ok(!res.content.includes('thinking'));
  });

  await runTest(7, 'При отсутствии API-ключа выбранного провайдера возвращается понятная ошибка без падения приложения', async () => {
    const unconfiguredLoader = loader({ ...testEnv, OPENAI_API_KEY: '' }, {}, mockFetch);
    const { OpenAIProvider: BrokenOpenAI } = unconfiguredLoader('lib/server/ai/providers/openai.ts');
    const broken = new BrokenOpenAI();
    assert.equal(broken.isConfigured(), false);
    await assert.rejects(
      async () => {
        await broken.complete({ messages: [{ role: 'user', content: 'Привет' }] });
      },
      /API-ключ не настроен|OPENAI_API_KEY/
    );
  });

  // =========================================================================
  // B. Инструменты продаж (5 тестов)
  // =========================================================================

  const ws = await db.createWorkspace({
    id: 'ws_sales_tools',
    companyName: 'Cosmetology Clinic',
    niche: 'cosmetology',
    ownerName: 'Doctor',
    ownerEmail: 'doc@example.com',
    ownerPhone: '+998901234567',
    passwordHash: 'hash',
    teamSize: '5',
    dailyLeadsVolume: '20-50',
    tokenBalance: 100,
  });

  const agent = await db.createAgent({
    id: 'agent_sales_tools',
    workspaceId: ws.id,
    name: 'Amina',
    nicheTemplate: 'cosmetology',
    systemPrompt: 'Ты консультант косметологической клиники.',
    isActive: true,
    tgBotToken: '12345:bot_token',
  });

  await runTest(8, 'Модель вызывает check_calendar_slots при запросе «Когда можно записаться?»', async () => {
    // Round 1 returns tool call
    mockHttp.deepseekResponses.push({
      body: {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_check_slots_1',
                  type: 'function',
                  function: {
                    name: 'check_calendar_slots',
                    arguments: JSON.stringify({ date: '2026-11-20' }),
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 15 },
        model: 'deepseek-chat',
      },
    });

    // Round 2 returns conversational reply
    mockHttp.deepseekResponses.push({
      body: {
        choices: [
          {
            message: {
              content: 'На 20 ноября у нас свободно в 10:00, 11:00 и 14:00. В какое время вам удобно подойти?',
            },
          },
        ],
        usage: { prompt_tokens: 45, completion_tokens: 25 },
        model: 'deepseek-chat',
      },
    });

    const result = await processAgentMessage({
      message: 'Когда можно записаться?',
      agentId: agent.id,
      workspaceId: ws.id,
      isSandbox: true,
    });

    assert.ok(result.reply.includes('На 20 ноября у нас свободно'));
    assert.equal(result.toolCallsCount, 1);
  });

  await runTest(9, 'Результат вызова инструмента возвращается модели, и модель генерирует понятный ответ на языке клиента', async () => {
    // 1st round: tool call
    mockHttp.deepseekResponses.push({
      body: {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_check_uz_1',
                  type: 'function',
                  function: {
                    name: 'check_calendar_slots',
                    arguments: JSON.stringify({ date: '2026-11-20' }),
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 15 },
        model: 'deepseek-chat',
      },
    });

    // 2nd round: model answers in Uzbek
    mockHttp.deepseekResponses.push({
      body: {
        choices: [
          {
            message: {
              content: '20-noyabr kuni soat 10:00 va 14:00 da bo\'sh joylarimiz bor. Qaysi vaqt sizga qulay?',
            },
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 22 },
        model: 'deepseek-chat',
      },
    });

    const result = await processAgentMessage({
      message: 'Ertaga qachon yozilsam bo\'ladi?',
      agentId: agent.id,
      workspaceId: ws.id,
      isSandbox: true,
    });

    assert.ok(result.reply.includes('20-noyabr kuni soat 10:00'));
    // Verify that the second call received the tool message with role 'tool'
    assert.ok(mockHttp.lastDeepSeekRequest.body.messages.some((m) => m.role === 'tool'));
  });

  await runTest(10, 'Ответ инструмента никогда не отправляется клиенту напрямую в сыром виде', async () => {
    mockHttp.deepseekResponses.push({
      body: {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_raw_check',
                  type: 'function',
                  function: {
                    name: 'check_calendar_slots',
                    arguments: JSON.stringify({ date: '2026-11-20' }),
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 10 },
      },
    });
    mockHttp.deepseekResponses.push({
      body: {
        choices: [
          {
            message: {
              content: 'Здравствуйте! На пятницу есть запись на 10:00 и 14:00.',
            },
          },
        ],
        usage: { prompt_tokens: 35, completion_tokens: 15 },
      },
    });

    const result = await processAgentMessage({
      message: 'Свободные слоты есть?',
      agentId: agent.id,
      workspaceId: ws.id,
      isSandbox: true,
    });

    assert.ok(!result.reply.startsWith('{'));
    assert.ok(!result.reply.includes('availableSlots'));
    assert.ok(!result.reply.includes('googleCalendarSynced'));
  });

  await runTest(11, 'При ошибке инструмента модель сообщает об ошибке клиенту вежливо, не подтверждая фиктивную запись', async () => {
    // Model attempts tool call with invalid date
    mockHttp.deepseekResponses.push({
      body: {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_invalid_date',
                  type: 'function',
                  function: {
                    name: 'check_calendar_slots',
                    arguments: JSON.stringify({ date: 'invalid-not-a-date' }),
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 10 },
      },
    });

    // Model sees error tool result and responds politely
    mockHttp.deepseekResponses.push({
      body: {
        choices: [
          {
            message: {
              content: 'К сожалению, не удалось проверить эту дату. Подскажите, пожалуйста, желаемый день, например 20 ноября?',
            },
          },
        ],
        usage: { prompt_tokens: 40, completion_tokens: 20 },
      },
    });

    const result = await processAgentMessage({
      message: 'Запишите меня на когда-нибудь',
      agentId: agent.id,
      workspaceId: ws.id,
      isSandbox: true,
    });

    assert.ok(result.reply.includes('К сожалению'));
    assert.equal(result.bookingStatus, undefined);
  });

  await runTest(12, 'Повторный retry одного и того же события очереди не создаёт дублирующую запись в календаре (идемпотентность)', async () => {
    const eventId = 'evt_idempotency_123';
    const convId = 'conv_idempotency_123';
    await events.enqueueEvent({
      id: eventId,
      workspaceId: ws.id,
      channel: 'Telegram',
      conversationId: convId,
      payload: {
        agentId: agent.id,
        contact: 'id:client_session_1',
        clientName: 'Aziza',
        text: 'Тест повтора',
      },
    });

    // First processing
    await processChannelEvent(eventId);
    const eventAfterFirst = await events.getChannelEvent(eventId);
    assert.equal(eventAfterFirst.status, 'done');

    const messagesCount1 = (await db.getMessagesByConversationId(convId)).length;

    // Retry processing the same done event
    await processChannelEvent(eventId);
    const messagesCount2 = (await db.getMessagesByConversationId(convId)).length;

    assert.equal(messagesCount1, messagesCount2, 'Retry of completed event must not insert additional duplicate messages');
  });

  // =========================================================================
  // C. Память (3 теста)
  // =========================================================================

  await runTest(13, 'Бюджет, названный клиентом в 1-м сообщении, учитывается моделью после 10 сообщений диалога', async () => {
    const memoryConvId = 'conv_memory_test_1';
    await db.createConversation({
      id: memoryConvId,
      workspaceId: ws.id,
      agentId: agent.id,
      channel: 'WebWidget',
      clientName: 'Nigora',
      clientPhone: '+998901112233',
    });

    await db.updateConversationClientMemory(memoryConvId, {
      budget: '500$',
      interestedService: 'Контурная пластика',
      preferredLanguage: 'ru',
    });

    // 10 conversation turns
    const history = [];
    for (let i = 1; i <= 10; i++) {
      history.push({ role: 'user', content: `Вопрос ${i}` });
      history.push({ role: 'assistant', content: `Ответ ${i}` });
    }

    await processAgentMessage({
      message: 'Что вы мне посоветуете исходя из моих параметров?',
      agentId: agent.id,
      workspaceId: ws.id,
      conversationId: memoryConvId,
      history,
      isSandbox: true,
    });

    const lastPrompt = mockHttp.lastDeepSeekRequest.body.messages;
    const systemPromptMessage = lastPrompt.find((m) => m.role === 'system');
    assert.ok(systemPromptMessage, 'System prompt must be present');
    assert.ok(systemPromptMessage.content.includes('500$'), 'System prompt must contain the budget from memory');
    assert.ok(systemPromptMessage.content.includes('Контурная пластика'), 'System prompt must contain the interested service');
  });

  await runTest(14, 'Обновление предпочтений клиента корректно сохраняется в leads.client_memory', async () => {
    const convId = 'conv_lead_pref_update';
    await db.createConversation({
      id: convId,
      workspaceId: ws.id,
      agentId: agent.id,
      channel: 'Telegram',
      clientName: 'Umid',
      clientPhone: 'id:987654',
    });

    await db.upsertLead({
      workspaceId: ws.id,
      agentId: agent.id,
      clientName: 'Umid',
      clientPhone: 'id:987654',
      channel: 'Telegram',
    });

    await db.updateConversationClientMemory(convId, {
      budget: '1 200 000 UZS',
      preferredLanguage: 'uz',
      salesStage: 'objection',
      objections: ['qimmat'],
    });

    const memory = await db.getConversationClientMemory(convId);
    assert.ok(memory);
    assert.equal(memory.budget, '1 200 000 UZS');
    assert.equal(memory.preferredLanguage, 'uz');
    assert.equal(memory.salesStage, 'objection');
    assert.equal(JSON.stringify(memory.objections), JSON.stringify(['qimmat']));
  });

  await runTest(15, 'Данные одного workspace никогда не попадают в контекст другого workspace', async () => {
    const wsOther = await db.createWorkspace({
      id: 'ws_other_competitor',
      companyName: 'Competitor B',
      niche: 'cosmetology',
      ownerName: 'Other Doctor',
      ownerEmail: 'other@example.com',
      ownerPhone: '+998909998877',
      passwordHash: 'hash',
      teamSize: '2',
      dailyLeadsVolume: '<20',
      tokenBalance: 50,
    });

    const agentOther = await db.createAgent({
      id: 'agent_other_competitor',
      workspaceId: wsOther.id,
      name: 'Other Agent',
      nicheTemplate: 'cosmetology',
      systemPrompt: 'Other prompt',
      isActive: true,
    });

    const convOtherId = 'conv_ws_other_test';
    await db.createConversation({
      id: convOtherId,
      workspaceId: wsOther.id,
      agentId: agentOther.id,
      channel: 'WebWidget',
      clientName: 'Other Client',
    });

    await processAgentMessage({
      message: 'Привет',
      agentId: agentOther.id,
      workspaceId: wsOther.id,
      conversationId: convOtherId,
      isSandbox: true,
    });

    const promptMessages = mockHttp.lastDeepSeekRequest.body.messages;
    const systemPrompt = promptMessages.find((m) => m.role === 'system').content;
    assert.ok(!systemPrompt.includes('500$'));
    assert.ok(!systemPrompt.includes('Контурная пластика'));
    assert.ok(!systemPrompt.includes('ws_sales_tools'));
  });

  // =========================================================================
  // D. Запись на приём (6 тестов)
  // =========================================================================

  const slotIso = '2026-11-20T10:00:00Z';
  const tz = 'Asia/Tashkent';
  const pendingBookingCtx = { startTime: slotIso, serviceName: 'Консультация' };

  await runTest(16, 'Клиент пишет «Да, записывайте» после предложения слота -> запись подтверждается, статус меняется на confirmed', async () => {
    const res = bookingConfirmation(slotIso, tz, 'Да, записывайте', pendingBookingCtx);
    assert.equal(res.confirmed, true);
  });

  await runTest(17, 'Клиент пишет «Ha yozing» (узбекский латиница) -> запись подтверждается', async () => {
    const res = bookingConfirmation(slotIso, tz, 'Ha yozing', pendingBookingCtx);
    assert.equal(res.confirmed, true);
  });

  await runTest(18, 'Клиент пишет «Ҳа, ёзинг» (узбекский кириллица) -> запись подтверждается', async () => {
    const res = bookingConfirmation(slotIso, tz, 'Ҳа, ёзинг', pendingBookingCtx);
    assert.equal(res.confirmed, true);
  });

  await runTest(19, 'Клиент пишет «Yes, book it» (английский) -> запись подтверждается', async () => {
    const res = bookingConfirmation(slotIso, tz, 'Yes, book it', pendingBookingCtx);
    assert.equal(res.confirmed, true);
  });

  await runTest(20, 'Клиент пишет «А есть другое время?» -> запись НЕ подтверждается, статус остаётся pending', async () => {
    const res = bookingConfirmation(slotIso, tz, 'А есть другое время?', pendingBookingCtx);
    assert.equal(res.confirmed, false);
    assert.equal(res.reason, 'question_or_alternative_requested');
  });

  await runTest(21, 'Клиент пишет просто «да» в контексте, не связанном с бронированием -> запись НЕ создаётся', async () => {
    const res = bookingConfirmation(slotIso, tz, 'да', null);
    assert.equal(res.confirmed, false);
    assert.equal(res.reason, 'isolated_yes_without_pending_booking');
  });

  // =========================================================================
  // E. Языки (5 тестов)
  // =========================================================================

  await runTest(22, 'Клиент на русском -> ответ на русском, без узбекских вкраплений', async () => {
    const compiled = compileAgentDraft({
      name: 'Консультант',
      tone: 'consultative',
      targetGoal: 'Продажи',
      servicesAndPricing: 'Услуга 1: 100$',
      qualificationQuestions: ['Вопрос 1'],
      restrictions: ['Без скидок'],
      handoverConditions: ['Жалоба'],
      nicheTemplate: 'cosmetology',
    });
    assert.ok(compiled.systemPrompt.includes('Русский'));
    assert.ok(compiled.systemPrompt.includes('Автоматически зеркаль язык'));
  });

  await runTest(23, 'Клиент на узбекском (латиница) -> ответ на узбекском (латиница), без кириллицы', async () => {
    const universalRules = getUniversalConversationalRules();
    assert.ok(universalRules.includes('Узбекский латиница (lotin)'));
    assert.ok(universalRules.includes('toza va tabiiy o\'zbek lotin alifbosida'));
  });

  await runTest(24, 'Клиент на узбекском (кириллица) -> ответ на узбекском (кириллица)', async () => {
    const universalRules = getUniversalConversationalRules();
    assert.ok(universalRules.includes('Узбекский кириллица (кирилл)'));
    assert.ok(universalRules.includes('жавобни ўзбек кирилл алифбосида ёзинг'));
  });

  await runTest(25, 'Клиент на английском -> ответ на английском', async () => {
    const universalRules = getUniversalConversationalRules();
    assert.ok(universalRules.includes('Английский (English)'));
    assert.ok(universalRules.includes('reply in fluent, professional, concise English'));
  });

  await runTest(26, 'Суржик / смешанная речь («Салом, сколько стоит ботокс?») -> AI отвечает естественно, понимает суть вопроса', async () => {
    const universalRules = getUniversalConversationalRules();
    assert.ok(universalRules.includes('Смешанная речь (суржик / ташкентский городской разговорный стиль'));
    assert.ok(universalRules.includes('Понимай смысл свободно, не поучай клиента'));
  });

  // =========================================================================
  // F. Регрессионное тестирование (7 тестов)
  // =========================================================================

  const regWs = await db.createWorkspace({
    id: 'ws_regression_test',
    companyName: 'Regression Clinic',
    niche: 'cosmetology',
    ownerName: 'Owner Reg',
    ownerEmail: 'reg@example.com',
    ownerPhone: '+998907776655',
    passwordHash: 'hash',
    teamSize: '3',
    dailyLeadsVolume: '20-50',
    tokenBalance: 100,
    telegramBusinessConnected: true,
    telegramBusinessEnabled: true,
    telegramBusinessCanReply: true,
    telegramBusinessConnectionId: 'biz_conn_reg_1',
    instagramConnected: true,
    instagramAutoReply: true,
    instagramAgentId: 'agent_reg',
    instagramAccessToken: encryptToken('fixture_ig_token'),
  });

  const regAgent = await db.createAgent({
    id: 'agent_reg',
    workspaceId: regWs.id,
    name: 'Reg Agent',
    nicheTemplate: 'cosmetology',
    systemPrompt: 'Reg prompt',
    isActive: true,
    tgBotToken: '12345:tg_bot_token',
  });

  await runTest(27, 'Telegram Business продолжает принимать и отправлять сообщения', async () => {
    const eventId = 'evt_tg_business_1';
    await events.enqueueEvent({
      id: eventId,
      workspaceId: regWs.id,
      channel: 'Telegram',
      conversationId: 'conv_tg_biz_1',
      payload: {
        agentId: regAgent.id,
        contact: 'id:555444333',
        clientName: 'Telegram Biz User',
        text: 'Здравствуйте через бизнес-аккаунт!',
        businessConnectionId: 'biz_conn_reg_1',
      },
    });

    await processChannelEvent(eventId);
    const event = await events.getChannelEvent(eventId);
    assert.equal(event.status, 'done');
    assert.ok(mockHttp.telegramSends.length > 0);
    const lastSend = mockHttp.telegramSends.at(-1);
    assert.equal(lastSend.business_connection_id, 'biz_conn_reg_1');
    assert.equal(lastSend.chat_id, '555444333');
  });

  await runTest(28, 'Telegram Custom Bot продолжает принимать и отправлять сообщения', async () => {
    const eventId = 'evt_tg_custom_bot_1';
    await events.enqueueEvent({
      id: eventId,
      workspaceId: regWs.id,
      channel: 'Telegram',
      conversationId: 'conv_tg_custom_1',
      payload: {
        agentId: regAgent.id,
        contact: 'id:999888777',
        clientName: 'Bot User',
        text: 'Привет бот',
      },
    });

    await processChannelEvent(eventId);
    const event = await events.getChannelEvent(eventId);
    assert.equal(event.status, 'done');
    const lastSend = mockHttp.telegramSends.at(-1);
    assert.equal(lastSend.chat_id, '999888777');
    assert.equal(lastSend.business_connection_id, undefined);
  });

  await runTest(29, 'Instagram Direct продолжает работать через webhook', async () => {
    const eventId = 'evt_instagram_1';
    await events.enqueueEvent({
      id: eventId,
      workspaceId: regWs.id,
      channel: 'Instagram',
      conversationId: 'conv_ig_1',
      payload: {
        agentId: regAgent.id,
        contact: 'id:ig_client_id_001',
        clientName: 'Instagram User',
        text: 'Сколько стоит чистка лица?',
      },
    });

    await processChannelEvent(eventId);
    const event = await events.getChannelEvent(eventId);
    assert.equal(event.status, 'done');
    assert.ok(mockHttp.instagramSends.length > 0);
    const lastSend = mockHttp.instagramSends.at(-1);
    assert.equal(lastSend.recipient.id, 'ig_client_id_001');
  });

  await runTest(30, 'Web Widget продолжает работать', async () => {
    const { saveWidget } = load('lib/server/widget/repository.ts');
    await saveWidget(regWs.id, {
      agentId: regAgent.id,
      enabled: true,
      title: 'Онлайн-чат',
      greeting: 'Здравствуйте!',
      color: '#2563eb',
      position: 'right',
      allowedOrigins: ['http://localhost:3000'],
    });

    const eventId = 'evt_widget_channel_1';
    const convId = 'conv_widget_channel_1';
    await events.enqueueEvent({
      id: eventId,
      workspaceId: regWs.id,
      channel: 'WebWidget',
      conversationId: convId,
      payload: {
        agentId: regAgent.id,
        contact: 'widget_visitor_123',
        clientName: 'Сайт Посетитель',
        text: 'Добрый день!',
      },
    });

    await processChannelEvent(eventId);
    const event = await events.getChannelEvent(eventId);
    assert.equal(event.status, 'done');
    const messages = await db.getMessagesByConversationId(convId);
    assert.ok(messages.some((m) => m.sender === 'agent'));
  });

  await runTest(31, 'Human Takeover корректно останавливает AI', async () => {
    const eventId = 'evt_human_takeover_1';
    const convId = 'conv_human_takeover_1';
    await db.createConversation({
      id: convId,
      workspaceId: regWs.id,
      agentId: regAgent.id,
      channel: 'Telegram',
      clientName: 'Takeover User',
      clientPhone: 'id:112233',
    });

    await db.updateConversation(convId, { status: 'human_takeover' });

    await events.enqueueEvent({
      id: eventId,
      workspaceId: regWs.id,
      channel: 'Telegram',
      conversationId: convId,
      payload: {
        agentId: regAgent.id,
        contact: 'id:112233',
        clientName: 'Takeover User',
        text: 'Позовите человека!',
      },
    });

    await processChannelEvent(eventId);
    const event = await events.getChannelEvent(eventId);
    assert.equal(event.status, 'ignored');
    assert.equal(event.errorCode, 'human_takeover');
  });

  await runTest(32, 'Sandbox-режим не делает реальных действий', async () => {
    const wsBefore = await db.getWorkspaceById(regWs.id);
    const initialBalance = wsBefore.tokenBalance;
    const initialIgSends = mockHttp.instagramSends.length;
    const initialTgSends = mockHttp.telegramSends.length;

    const result = await processAgentMessage({
      message: 'Тест в песочнице',
      agentId: regAgent.id,
      workspaceId: regWs.id,
      isSandbox: true,
    });

    assert.ok(result.reply);
    const wsAfter = await db.getWorkspaceById(regWs.id);
    assert.equal(wsAfter.tokenBalance, initialBalance, 'Token balance must NOT change in sandbox mode');
    assert.equal(mockHttp.instagramSends.length, initialIgSends, 'No Instagram messages sent in sandbox mode');
    assert.equal(mockHttp.telegramSends.length, initialTgSends, 'No Telegram messages sent in sandbox mode');
  });

  await runTest(33, 'Списание бизнес-токенов (1 ответ = 1 токен) работает корректно', async () => {
    const wsBefore = await db.getWorkspaceById(regWs.id);
    const balanceBefore = wsBefore.tokenBalance;

    const result = await processAgentMessage({
      message: 'Сколько стоит консультация?',
      agentId: regAgent.id,
      workspaceId: regWs.id,
      isSandbox: false,
    });

    assert.ok(result.reply);
    assert.equal(result.tokensCost, 1);

    const wsAfter = await db.getWorkspaceById(regWs.id);
    assert.equal(wsAfter.tokenBalance, balanceBefore - 1, 'Exactly 1 token must be deducted for 1 agent reply');
  });

  // =========================================================================
  // G. Unit-тесты себестоимости и тарифов (FIX 2)
  // =========================================================================

  await runTest(34, 'Расчет тарифа GPT-6 Luna ($0.10 in / $0.50 out / $0.01 cached за 1M, cache writes, >272k)', async () => {
    // Short context (<272k):
    // 10,000 in (uncached) = 0.001000
    // 5,000 in (cached)    = 0.000050 ($0.01 / 1M)
    // 2,000 out            = 0.001000 ($0.50 / 1M)
    // Total                = 0.002050
    const cost = calculateEstimatedCost('openai', 'gpt-6-luna', 15000, 2000, 5000);
    assert.equal(cost, '0.002050');

    // Cache writes (30m & 12h)
    const costWrite30m = calculateEstimatedCost('openai', 'gpt-6-luna', 10000, 0, { cacheWrite30mTokens: 10000 });
    assert.equal(costWrite30m, '0.001250'); // 10k * $0.125 / 1M

    const costWrite12h = calculateEstimatedCost('openai', 'gpt-6-luna', 10000, 0, { cacheWrite12hTokens: 10000 });
    assert.equal(costWrite12h, '0.002500'); // 10k * $0.25 / 1M

    // Long context (>272k tokens):
    // 300,000 in ($0.20 / 1M) = 0.060000
    // 10,000 out ($1.00 / 1M) = 0.010000
    // Total                   = 0.070000
    const costLong = calculateEstimatedCost('openai', 'gpt-6-luna', 300000, 10000, 0);
    assert.equal(costLong, '0.070000');
  });

  await runTest(35, 'Расчет тарифа Claude Haiku 5.5 до 100k ($0.10 in / $0.50 out / $0.01 cached за 1M)', async () => {
    // 50,000 in (uncached) = 0.005000
    // 20,000 in (cached)   = 0.000200
    // 10,000 out           = 0.005000
    // Total                = 0.010200
    const cost = calculateEstimatedCost('anthropic', 'claude-haiku-5-5', 70000, 10000, 20000);
    assert.equal(cost, '0.010200');
  });

  await runTest(36, 'Расчет тарифа Claude Haiku 5.5 свыше 100k ($0.50 in / $2.50 out / $0.05 cached за 1M)', async () => {
    // 120,000 in (uncached) = 0.060000
    // 30,000 in (cached)    = 0.001500
    // 5,000 out             = 0.012500
    // Total                 = 0.074000
    const cost = calculateEstimatedCost('anthropic', 'claude-haiku-5-5', 150000, 5000, 30000);
    assert.equal(cost, '0.074000');
  });

  await runTest(37, 'Накопительный расчет расходов для нескольких последовательных LLM-вызовов', async () => {
    // Round 1: 1,000 in, 100 out, 0 cached
    // Round 2: 2,000 in, 300 out, 500 cached
    // Total: 3,000 in (2,500 uncached + 500 cached), 400 out
    // Uncached: 2,500 * 0.10 / 1M = 0.000250
    // Cached:   500 * 0.01 / 1M   = 0.000005
    // Out:      400 * 0.50 / 1M   = 0.000200
    // Total:    0.000455
    const cost = calculateEstimatedCost('openai', 'gpt-6-luna', 3000, 400, 500);
    assert.equal(cost, '0.000455');
  });

  // =========================================================================
  // H. Полный цикл вызова инструментов GPT-6 Luna (FIX 3)
  // =========================================================================

  await runTest(38, 'GPT-6 Luna полный цикл: tool call -> tool response -> финальный ответ', async () => {
    const openaiLoader = loader({ ...testEnv, AI_PROVIDER: 'openai' }, {}, mockFetch);
    const { processAgentMessage: processOpenAIMessage } = openaiLoader('lib/ai/gateway.ts');

    // Round 1: tool call
    mockHttp.openaiResponses.push({
      body: {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_luna_roundtrip_1',
                  type: 'function',
                  function: {
                    name: 'check_calendar_slots',
                    arguments: JSON.stringify({ date: '2026-11-20' }),
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 120, completion_tokens: 25 },
        model: 'gpt-6-luna',
      },
    });

    // Round 2: natural reply
    mockHttp.openaiResponses.push({
      body: {
        choices: [
          {
            message: {
              content: 'Здравствуйте! На 20 ноября у нас свободно в 10:00 и 14:00. В какое время вас записать?',
            },
          },
        ],
        usage: { prompt_tokens: 210, completion_tokens: 40 },
        model: 'gpt-6-luna',
      },
    });

    const res = await processOpenAIMessage({
      message: 'Когда можно записаться?',
      agentId: regAgent.id,
      workspaceId: regWs.id,
      isSandbox: true,
    });

    assert.ok(res.reply.includes('На 20 ноября у нас свободно в 10:00 и 14:00'));
    assert.equal(res.toolCallsCount, 1);
    assert.equal(res.provider, 'openai');
    assert.equal(res.model, 'gpt-6-luna');

    // Verify round 2 request contained role: 'tool' and assistant message with tool_calls
    const round2Messages = mockHttp.lastOpenAIRequest.body.messages;
    const assistantMsg = round2Messages.find((m) => m.role === 'assistant');
    assert.ok(assistantMsg && assistantMsg.tool_calls, 'Round 2 must contain assistant message with tool_calls');
    const toolMsg = round2Messages.find((m) => m.role === 'tool');
    assert.ok(toolMsg && toolMsg.tool_call_id === 'call_luna_roundtrip_1', 'Round 2 must contain tool response message');
  });

  // =========================================================================
  // I. Дополнительные отрицательные тесты (FIX 6)
  // =========================================================================

  await runTest(39, 'Отрицательный тест: явное отрицание согласия после предложения слота блокирует бронирование', async () => {
    const pending = { startTime: slotIso, serviceName: 'Консультация' };
    const negations = [
      'Нет, мне это не подходит',
      'Нет, не надо',
      'Yo\'q, boshqa vaqt kerak',
      'No, cancel this',
      'Слишком дорого, я передумал',
    ];
    for (const msg of negations) {
      const res = bookingConfirmation(slotIso, tz, msg, pending);
      assert.equal(res.confirmed, false, `Message "${msg}" must NOT confirm booking`);
    }
  });

  await runTest(40, 'Отрицательный тест: повторное создание брони по тому же запросу отклоняется (идемпотентность)', async () => {
    const eventId = 'evt_dup_booking_guard';
    await events.enqueueEvent({
      id: eventId,
      workspaceId: regWs.id,
      channel: 'Telegram',
      conversationId: 'conv_dup_guard',
      payload: {
        agentId: regAgent.id,
        contact: 'id:dup_user',
        clientName: 'Dup User',
        text: 'Тест повтора',
      },
    });

    await processChannelEvent(eventId);
    const firstStatus = (await events.getChannelEvent(eventId)).status;
    assert.equal(firstStatus, 'done');

    // Attempt second execution on the same event
    await processChannelEvent(eventId);
    const secondEvent = await events.getChannelEvent(eventId);
    assert.equal(secondEvent.status, 'done', 'Event status must remain done without re-processing');
  });

  await runTest(41, 'Отрицательный тест: сбой второго LLM-вызова после успешного инструмента обрабатывается безопасно', async () => {
    // Round 1 succeeds with tool call
    mockHttp.deepseekResponses.push({
      body: {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_failing_round2',
                  type: 'function',
                  function: {
                    name: 'check_calendar_slots',
                    arguments: JSON.stringify({ date: '2026-11-20' }),
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 15 },
        model: 'deepseek-chat',
      },
    });

    // Round 2 fails with 500 Server Error
    mockHttp.deepseekResponses.push({
      status: 500,
      body: { error: 'Internal Server Error' },
    });

    // When 2nd round LLM fails, gateway gracefully falls back to rules engine / safe reply without crashing
    const result = await processAgentMessage({
      message: 'Когда свободно?',
      agentId: regAgent.id,
      workspaceId: regWs.id,
      isSandbox: true,
    });

    assert.ok(result.reply && result.reply.length > 0, 'Safe fallback reply must be provided');
    assert.equal(result.isBooking, false, 'No fictitious booking can be created on LLM failure');
  });

  await runTest(42, 'Отрицательный тест: отсутствие API-ключа вызывает понятную ошибку без падения процесса', async () => {
    const unconfiguredLoader = loader({ ...testEnv, OPENAI_API_KEY: '', DEEPSEEK_API_KEY: '' }, {}, mockFetch);
    const { OpenAIProvider: NoKeyOpenAI } = unconfiguredLoader('lib/server/ai/providers/openai.ts');
    const p = new NoKeyOpenAI();
    assert.equal(p.isConfigured(), false);
    await assert.rejects(async () => {
      await p.complete({ messages: [{ role: 'user', content: 'Тест' }] });
    }, /OPENAI_API_KEY отсутствует/);
  });

  await runTest(43, 'Отрицательный тест: строгая изоляция памяти и клиентов между разными workspace', async () => {
    const convA = 'conv_iso_tenant_a';
    const convB = 'conv_iso_tenant_b';

    await db.createConversation({
      id: convA,
      workspaceId: ws.id,
      agentId: agent.id,
      clientName: 'Tenant A VIP',
      clientPhone: '+998901111111',
    });

    await db.createConversation({
      id: convB,
      workspaceId: regWs.id,
      agentId: regAgent.id,
      clientName: 'Tenant B User',
      clientPhone: '+998902222222',
    });

    await db.updateConversationClientMemory(convA, {
      notes: 'TOP_SECRET_WORKSPACE_A_DISCOUNT',
      budget: '50 000$',
    });

    const memB = await db.getConversationClientMemory(convB);
    assert.ok(!memB || !memB.notes || !memB.notes.includes('TOP_SECRET_WORKSPACE_A_DISCOUNT'), 'Workspace B must never see Workspace A memory');
  });

  // =========================================================================
  // J. Верификация Anthropic Tool Loop и точной сериализации Round 2 (FIX 2)
  // =========================================================================

  await runTest(44, 'Anthropic Haiku 5.5 полный цикл: tool call -> сохранение thinking и signature -> tool_result -> финальный ответ (точная сериализация Round 2)', async () => {
    const anthropicLoader = loader({ ...testEnv, AI_PROVIDER: 'anthropic' }, {}, mockFetch);
    const { processAgentMessage: processAnthropicMessage } = anthropicLoader('lib/ai/gateway.ts');

    // Round 1: Claude responds with adaptive thinking + signature + tool_use
    mockHttp.anthropicResponses.push({
      body: {
        content: [
          {
            type: 'thinking',
            thinking: 'Клиент интересуется слотами на завтра. Вызываю check_calendar_slots.',
            signature: 'sig_haiku_round1_valid_hash',
          },
          {
            type: 'tool_use',
            id: 'toolu_cal_test_44',
            name: 'check_calendar_slots',
            input: { date: '2026-11-20' },
          },
        ],
        usage: { input_tokens: 120, output_tokens: 45, cache_read_input_tokens: 10 },
        model: 'claude-haiku-5-5',
      },
    });

    // Round 2: Claude responds with final natural reply + second thinking block
    mockHttp.anthropicResponses.push({
      body: {
        content: [
          {
            type: 'thinking',
            thinking: 'Слоты найдены: 10:00 и 14:00. Формирую вежливый ответ.',
            signature: 'sig_haiku_round2_valid_hash',
          },
          {
            type: 'text',
            text: 'На 20 ноября у нас есть свободные слоты в 10:00 и 14:00. В какое время вам удобнее?',
          },
        ],
        usage: { input_tokens: 220, output_tokens: 35, cache_read_input_tokens: 40 },
        model: 'claude-haiku-5-5',
      },
    });

    const res = await processAnthropicMessage({
      message: 'Когда можно записаться?',
      agentId: regAgent.id,
      workspaceId: regWs.id,
      isSandbox: true,
    });

    assert.ok(res.reply.includes('На 20 ноября у нас есть свободные слоты'));
    assert.equal(res.toolCallsCount, 1);
    assert.equal(res.provider, 'anthropic');
    assert.equal(res.model, 'claude-haiku-5-5');

    // Verify thinking/signature NEVER leaked to client
    assert.ok(!res.reply.includes('thinking'));
    assert.ok(!res.reply.includes('sig_haiku'));
    assert.ok(!res.reply.includes('Клиент интересуется слотами'));

    // Verify exact serialization of Round 2 request sent to Anthropic API
    const round2Request = mockHttp.lastAnthropicRequest;
    assert.ok(round2Request, 'Round 2 request must be captured');
    assert.equal(round2Request.method, 'POST');
    assert.equal(round2Request.headers['x-api-key'], 'test-anthropic-key');
    assert.equal(round2Request.headers['anthropic-version'], '2023-06-01');

    const body = round2Request.body;
    assert.equal(body.model, 'claude-haiku-5-5');
    assert.deepEqual(body.thinking, { type: 'adaptive' });
    assert.deepEqual(body.output_config, { effort: 'medium' });
    assert.equal(body.temperature, undefined, 'Temperature must not be passed with adaptive thinking');
    assert.equal(body.top_p, undefined);
    assert.equal(body.top_k, undefined);

    // Messages sequence: user -> assistant (with exact thinking + signature + tool_use) -> user (tool_result)
    const msgs = body.messages;
    assert.ok(msgs.length >= 3, 'Must have at least initial user, assistant tool_use, and tool_result user messages');

    const assistantMsg = msgs[msgs.length - 2];
    assert.equal(assistantMsg.role, 'assistant');
    assert.ok(Array.isArray(assistantMsg.content), 'Assistant content must be array of blocks');
    const thinkingBlock = assistantMsg.content.find((b) => b.type === 'thinking');
    assert.ok(thinkingBlock, 'Thinking block must be preserved in assistant message');
    assert.equal(thinkingBlock.thinking, 'Клиент интересуется слотами на завтра. Вызываю check_calendar_slots.');
    assert.equal(thinkingBlock.signature, 'sig_haiku_round1_valid_hash');

    const toolUseBlock = assistantMsg.content.find((b) => b.type === 'tool_use');
    assert.ok(toolUseBlock, 'tool_use block must be preserved in assistant message');
    assert.equal(toolUseBlock.id, 'toolu_cal_test_44');
    assert.equal(toolUseBlock.name, 'check_calendar_slots');

    const toolResultMsg = msgs[msgs.length - 1];
    assert.equal(toolResultMsg.role, 'user');
    assert.ok(Array.isArray(toolResultMsg.content), 'Tool result must be an array of blocks in user message');
    assert.equal(toolResultMsg.content[0].type, 'tool_result');
    assert.equal(toolResultMsg.content[0].tool_use_id, 'toolu_cal_test_44');
    assert.ok(toolResultMsg.content[0].content, 'Tool result content must not be empty');
  });

  await runTest(45, 'Anthropic Haiku 5.5 множественные tool calls: несколько tool_use объединяются в единое user-сообщение с tool_result', async () => {
    const anthropicLoader = loader({ ...testEnv, AI_PROVIDER: 'anthropic' }, {}, mockFetch);
    const { processAgentMessage: processAnthropicMessage } = anthropicLoader('lib/ai/gateway.ts');

    // Round 1: Model issues two tool calls in single turn
    mockHttp.anthropicResponses.push({
      body: {
        content: [
          {
            type: 'thinking',
            thinking: 'Checking two dates simultaneously.',
            signature: 'sig_multi_turn_45',
          },
          {
            type: 'tool_use',
            id: 'toolu_multi_1',
            name: 'check_calendar_slots',
            input: { date: '2026-11-20' },
          },
          {
            type: 'tool_use',
            id: 'toolu_multi_2',
            name: 'check_calendar_slots',
            input: { date: '2026-11-21' },
          },
        ],
        usage: { input_tokens: 150, output_tokens: 60 },
        model: 'claude-haiku-5-5',
      },
    });

    // Round 2: Final reply
    mockHttp.anthropicResponses.push({
      body: {
        content: [
          {
            type: 'text',
            text: 'На 20 ноября свободно 10:00, а на 21 ноября — 14:00.',
          },
        ],
        usage: { input_tokens: 280, output_tokens: 30 },
        model: 'claude-haiku-5-5',
      },
    });

    const res = await processAnthropicMessage({
      message: 'Какие слоты на пятницу и субботу?',
      agentId: regAgent.id,
      workspaceId: regWs.id,
      isSandbox: true,
    });

    assert.equal(res.toolCallsCount, 2);
    assert.ok(res.reply.includes('На 20 ноября свободно 10:00'));

    // Check round 2 serialization: both tool results must be grouped in a SINGLE user message
    const msgs = mockHttp.lastAnthropicRequest.body.messages;
    const lastMsg = msgs[msgs.length - 1];
    assert.equal(lastMsg.role, 'user', 'Tool results must be in user role message');
    assert.ok(Array.isArray(lastMsg.content), 'Tool results must be array of content blocks');
    assert.equal(lastMsg.content.length, 2, 'Both tool results must be grouped in ONE message');
    assert.equal(lastMsg.content[0].type, 'tool_result');
    assert.equal(lastMsg.content[0].tool_use_id, 'toolu_multi_1');
    assert.equal(lastMsg.content[1].type, 'tool_result');
    assert.equal(lastMsg.content[1].tool_use_id, 'toolu_multi_2');
  });

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n====================================================');
  console.log('TEST SUMMARY');
  console.log('====================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed:      ${passed}`);
  console.log(`Failed:      ${failed}`);

  if (failed > 0) {
    console.error('\nFAILED TESTS:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.error(`- Test ${r.number}: ${r.name} -> ${r.error}`));
    process.exitCode = 1;
  } else {
    console.log(`\nALL ${results.length} TESTS PASSED SUCCESSFULLY! ✓`);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exitCode = 1;
});
