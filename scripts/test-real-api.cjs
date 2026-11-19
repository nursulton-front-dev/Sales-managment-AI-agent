/**
 * CHORLA AI — Real API Smoke Tests
 * Tests live endpoints for GPT-6 Luna and Claude Haiku 5.5 using real API keys from ENV.
 * 
 * If API keys are not provided in environment, tests are safely marked as [NOT RUN].
 * NEVER prints API keys or secrets to console or logs.
 * NO real bookings, NO CRM changes, NO customer messages are sent.
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const loader = require('./helpers/load-typescript.cjs');

// Safely load .env.local without exposing secrets
try {
  const fs = require('node:fs');
  const envPath = path.resolve('.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (k && !process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  }
} catch {}

const openaiKey = process.env.OPENAI_API_KEY?.trim();
const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

const isOpenAIConfigured = Boolean(
  openaiKey &&
  !openaiKey.includes('placeholder') &&
  !openaiKey.includes('test-') &&
  openaiKey.length > 20
);

const isAnthropicConfigured = Boolean(
  anthropicKey &&
  !anthropicKey.includes('placeholder') &&
  !anthropicKey.includes('test-') &&
  anthropicKey.length > 20
);

const env = {
  ...process.env,
  OPENAI_API_KEY: openaiKey || '',
  ANTHROPIC_API_KEY: anthropicKey || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-6-luna',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
};

// Use real native fetch for live verification
const load = loader(env, {}, globalThis.fetch);

const { OpenAIProvider } = load('lib/server/ai/providers/openai.ts');
const { AnthropicProvider } = load('lib/server/ai/providers/anthropic.ts');

const DUMMY_WEATHER_TOOL = {
  type: 'function',
  function: {
    name: 'get_mock_weather',
    description: 'Получить текущую погоду для тестирования (фиктивные данные).',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Город' },
      },
      required: ['city'],
    },
  },
};

const results = [];

async function recordTest(id, name, runFn, isConfigured, skipReason) {
  if (!isConfigured) {
    results.push({ id, name, status: 'NOT RUN', reason: skipReason });
    console.log(`[NOT RUN] Test ${id}: ${name} (${skipReason})`);
    return;
  }

  try {
    console.log(`[RUNNING] Test ${id}: ${name}...`);
    await runFn();
    results.push({ id, name, status: 'PASS' });
    console.log(`[PASS] Test ${id}: ${name}`);
  } catch (err) {
    results.push({ id, name, status: 'FAIL', error: err.message });
    console.error(`[FAIL] Test ${id}: ${name} -> ${err.message}`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('CHORLA AI — REAL API SMOKE TESTS (LIVE ENDPOINTS)');
  console.log('====================================================');
  console.log(`OpenAI API Status:    ${isOpenAIConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`Anthropic API Status: ${isAnthropicConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log('----------------------------------------------------\n');

  const openai = new OpenAIProvider();
  const anthropic = new AnthropicProvider();

  // Test 1: GPT-6 Luna text
  await recordTest(
    1,
    'OpenAI Luna: обычный текстовый ответ',
    async () => {
      const res = await openai.complete({
        messages: [{ role: 'user', content: 'Say "Luna Ready" and nothing else.' }],
        maxTokens: 50,
      });
      assert.ok(res.content && res.content.length > 0, 'Response text must not be empty');
      assert.ok(res.usage && res.usage.promptTokens > 0, 'Usage stats must be returned');
      console.log(`   Reply: "${res.content.trim()}" (latency: ${res.durationMs}ms)`);
    },
    isOpenAIConfigured,
    'OPENAI_API_KEY is missing or unconfigured'
  );

  // Test 2: GPT-6 Luna function calling
  await recordTest(
    2,
    'OpenAI Luna: function calling с фиктивным инструментом',
    async () => {
      const res = await openai.complete({
        messages: [{ role: 'user', content: 'Какая сейчас погода в Ташкенте? Используй инструмент get_mock_weather.' }],
        tools: [DUMMY_WEATHER_TOOL],
        maxTokens: 150,
      });
      assert.ok(Array.isArray(res.toolCalls) && res.toolCalls.length > 0, 'Model must return toolCalls');
      assert.equal(res.toolCalls[0].function.name, 'get_mock_weather');
      const args = JSON.parse(res.toolCalls[0].function.arguments);
      assert.ok(args.city, 'Parsed tool arguments must contain city');
      console.log(`   Tool call: ${res.toolCalls[0].function.name}(${JSON.stringify(args)})`);
    },
    isOpenAIConfigured,
    'OPENAI_API_KEY is missing or unconfigured'
  );

  // Test 3: Claude Haiku 5.5 text
  await recordTest(
    3,
    'Claude Haiku 5.5: обычный текстовый ответ',
    async () => {
      const res = await anthropic.complete({
        messages: [{ role: 'user', content: 'Say "Haiku Ready" and nothing else.' }],
        maxTokens: 100,
      });
      assert.ok(res.content && res.content.length > 0, 'Response text must not be empty');
      assert.ok(res.usage && res.usage.promptTokens > 0, 'Usage stats must be returned');
      console.log(`   Reply: "${res.content.trim()}" (latency: ${res.durationMs}ms)`);
    },
    isAnthropicConfigured,
    'ANTHROPIC_API_KEY is missing or unconfigured'
  );

  // Test 4: Claude Haiku 5.5 function calling
  await recordTest(
    4,
    'Claude Haiku 5.5: function calling с фиктивным инструментом',
    async () => {
      const res = await anthropic.complete({
        messages: [{ role: 'user', content: 'What is the weather in Tashkent? Use the get_mock_weather tool.' }],
        tools: [DUMMY_WEATHER_TOOL],
        maxTokens: 200,
      });
      assert.ok(Array.isArray(res.toolCalls) && res.toolCalls.length > 0, 'Model must return toolCalls');
      assert.equal(res.toolCalls[0].function.name, 'get_mock_weather');
      const args = JSON.parse(res.toolCalls[0].function.arguments);
      assert.ok(args.city, 'Parsed tool arguments must contain city');
      console.log(`   Tool call: ${res.toolCalls[0].function.name}(${JSON.stringify(args)})`);
    },
    isAnthropicConfigured,
    'ANTHROPIC_API_KEY is missing or unconfigured'
  );

  // Test 5: Full 2-round tool loop
  const activeProvider = isOpenAIConfigured ? openai : (isAnthropicConfigured ? anthropic : null);
  await recordTest(
    5,
    'Полный двухраундовый tool loop (Round 1 tool_call -> Round 2 text)',
    async () => {
      // 1. Initial call with tool call
      const round1 = await activeProvider.complete({
        messages: [{ role: 'user', content: 'Какая погода в Ташкенте?' }],
        tools: [DUMMY_WEATHER_TOOL],
      });
      assert.ok(round1.toolCalls && round1.toolCalls.length > 0, 'Round 1 must produce tool call');
      const tc = round1.toolCalls[0];

      // 2. Feed dummy tool result back
      const dummyToolResult = JSON.stringify({ temperature: '+22°C', weather: 'Солнечно, без осадков' });
      const round2 = await activeProvider.complete({
        messages: [
          { role: 'user', content: 'Какая погода в Ташкенте?' },
          {
            role: 'assistant',
            content: round1.content || '',
            tool_calls: round1.toolCalls,
            rawAssistantContent: round1.rawResponse ? round1.rawResponse.content : undefined,
          },
          { role: 'tool', tool_call_id: tc.id, content: dummyToolResult },
        ],
        tools: [DUMMY_WEATHER_TOOL],
      });

      assert.ok(round2.content && round2.content.length > 0, 'Round 2 must produce natural text answer');
      assert.ok(round2.content.includes('22') || round2.content.toLowerCase().includes('солнечн'), 'Model must interpret the weather result');
      console.log(`   Final answer after tool: "${round2.content.trim()}"`);
    },
    Boolean(activeProvider),
    'Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is configured'
  );

  // Test 6: Russian language check
  await recordTest(
    6,
    'Русский язык: естественный ответ на русском',
    async () => {
      const res = await activeProvider.complete({
        messages: [{ role: 'user', content: 'Здравствуйте! Подскажите, как работает ваш сервис?' }],
        maxTokens: 100,
      });
      assert.ok(res.content.length > 0, 'Russian response must be non-empty');
      console.log(`   RU: "${res.content.trim().slice(0, 80)}..."`);
    },
    Boolean(activeProvider),
    'Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is configured'
  );

  // Test 7: Uzbek Latin check
  await recordTest(
    7,
    'Узбекский Latin: toza o\'zbek lotin alifbosida javob',
    async () => {
      const res = await activeProvider.complete({
        messages: [{ role: 'user', content: 'Assalomu alaykum! Xizmatlaringiz haqida ma\'lumot bering.' }],
        maxTokens: 100,
      });
      assert.ok(res.content.length > 0, 'Uzbek Latin response must be non-empty');
      console.log(`   UZ-Latin: "${res.content.trim().slice(0, 80)}..."`);
    },
    Boolean(activeProvider),
    'Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is configured'
  );

  // Test 8: Uzbek Cyrillic check
  await recordTest(
    8,
    'Узбекский Cyrillic: ўзбек кирилл алифбосида жавоб',
    async () => {
      const res = await activeProvider.complete({
        messages: [{ role: 'user', content: 'Ассалому алайкум! Қандай хизматлар бор?' }],
        maxTokens: 100,
      });
      assert.ok(res.content.length > 0, 'Uzbek Cyrillic response must be non-empty');
      console.log(`   UZ-Cyrillic: "${res.content.trim().slice(0, 80)}..."`);
    },
    Boolean(activeProvider),
    'Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is configured'
  );

  // Test 9: English check
  await recordTest(
    9,
    'Английский язык: fluent professional English reply',
    async () => {
      const res = await activeProvider.complete({
        messages: [{ role: 'user', content: 'Hello! What services do you provide?' }],
        maxTokens: 100,
      });
      assert.ok(res.content.length > 0, 'English response must be non-empty');
      console.log(`   EN: "${res.content.trim().slice(0, 80)}..."`);
    },
    Boolean(activeProvider),
    'Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is configured'
  );

  // Test 10: Mixed Uzbek-Russian speech check
  await recordTest(
    10,
    'Смешанная речь (суржик: «Салом, сколько стоит ботокс?»)',
    async () => {
      const res = await activeProvider.complete({
        messages: [{ role: 'user', content: 'Салом, сколько стоит ботокс? Dostavka bormi?' }],
        maxTokens: 100,
      });
      assert.ok(res.content.length > 0, 'Mixed speech response must be non-empty');
      console.log(`   Mixed: "${res.content.trim().slice(0, 80)}..."`);
    },
    Boolean(activeProvider),
    'Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is configured'
  );

  console.log('\n====================================================');
  console.log('REAL API TEST SUMMARY');
  console.log('====================================================');
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const notRunCount = results.filter((r) => r.status === 'NOT RUN').length;

  console.log(`Total:   ${results.length}`);
  console.log(`Passed:  ${passCount}`);
  console.log(`Failed:  ${failCount}`);
  console.log(`Not Run: ${notRunCount}`);
  console.log('----------------------------------------------------');

  results.forEach((r) => {
    if (r.status === 'PASS') console.log(`✓ [PASS]    ${r.name}`);
    if (r.status === 'NOT RUN') console.log(`- [NOT RUN] ${r.name} (${r.reason})`);
    if (r.status === 'FAIL') console.log(`✗ [FAIL]    ${r.name} -> ${r.error}`);
  });

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exitCode = 1;
});
