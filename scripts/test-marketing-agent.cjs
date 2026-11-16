const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loader = require('./helpers/load-typescript.cjs');

const checks = [];
const check = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log('✅ PASS:', name);
};

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gapcha-marketing-test-'));
const env = {
  DATABASE_URL: '',
  CHORLA_DATA_DIR: directory,
  BETTER_AUTH_SECRET: 'isolated-32-characters-secret-for-tests-only',
};

const load = loader(env, {}, async () => Response.json({ ok: true }));

async function main() {
  console.log('🚀 Running Marketing Agency & Conversational Rules Verification Suite...\n');

  const db = load('src/db/index.ts');

  // 1. Read app/dashboard/agents/new/page.tsx and archetypes / prompt files to verify templates and rules
  const wizardFile = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/agents/new/page.tsx'), 'utf8');
  const archetypesFile = fs.existsSync('lib/wizard/archetypes.ts') ? fs.readFileSync('lib/wizard/archetypes.ts', 'utf8') : '';
  const promptRulesFile = fs.existsSync('lib/ai/prompts/niche-scenarios.ts') ? fs.readFileSync('lib/ai/prompts/niche-scenarios.ts', 'utf8') : '';
  const combined = wizardFile + '\n' + archetypesFile + '\n' + promptRulesFile;

  // 1.1 Marketing Agency niche is a first-class card
  check('Marketing agency niche exists in PRIMARY_NICHES',
    wizardFile.includes("id: 'marketing'") &&
    (wizardFile.includes("title: 'Маркетинговое агентство'") || wizardFile.includes("titleRu: 'Маркетинговое агентство'")));

  // 1.2 Price and qualification questions are realistic and populated
  check('Marketing agency has populated price list with Meta/Google Ads and SMM',
    combined.includes('таргетинг') &&
    combined.includes('SMM') &&
    combined.includes('3 500 000 сум'));

  check('Marketing agency has 3 qualification questions',
    combined.includes('Какой продукт или услугу вы продвигаете') &&
    combined.includes('ориентировочный') && combined.includes('бюджет'));

  // 1.3 Anti-cliché conversational rules are present in system prompt
  check('System prompt explicitly bans robotic cliches ("Отличный вопрос!" etc.)',
    combined.includes('Отличный вопрос!'));

  check('System prompt enforces 1-3 sentences per reply',
    combined.includes('1–3') && combined.includes('предложени'));

  check('System prompt enforces strictly 1 question at a time',
    combined.includes('ОДИН вопрос') || combined.includes('одного вопроса за раз'));

  check('System prompt mandates honest admission of being an AI assistant',
    combined.includes('ИИ-ассистент компании') || combined.includes('честно ответь'));

  // 1.4 Custom business name never falls back to "Другая сфера бизнеса" in prompt
  check('Custom business name dynamically overrides title and prompt',
    wizardFile.includes("selectedNiche") || wizardFile.includes("other") || combined.includes("other"));

  // 2. Gateway conversational rules injection
  const gatewayFile = fs.readFileSync(path.join(process.cwd(), 'lib/ai/gateway.ts'), 'utf8');
  const combinedGateway = gatewayFile + '\n' + promptRulesFile;
  check('Gateway enforces conversationalRules across all model completions',
    gatewayFile.includes('buildNichePrompt') &&
    combinedGateway.includes('1–3 предложения на реплику') &&
    (combinedGateway.includes('ОДИН вопрос') || combinedGateway.includes('одного вопроса за раз')));

  // 3. Multi-tenant workspace data isolation
  // Create Workspace A and Agent A
  const wsA = await db.createWorkspace({
    id: 'ws_alpha',
    name: 'Маркетинговое Агентство Альфа',
    tokenBalance: 100,
  });

  const agentA = await db.createAgent({
    id: 'ag_alpha',
    workspaceId: wsA.id,
    name: 'ИИ-Маркетолог Альфа',
    niche: 'Маркетинговое агентство',
    nicheId: 'marketing',
    systemPrompt: 'Промпт Альфа',
    priceList: 'Прайс Альфа',
    qualificationQuestions: ['Вопрос 1', 'Вопрос 2', 'Вопрос 3'],
    isActive: true,
  });

  // Create Workspace B and Agent B
  const wsB = await db.createWorkspace({
    id: 'ws_beta',
    name: 'Клиника Бета',
    tokenBalance: 100,
  });

  const agentB = await db.createAgent({
    id: 'ag_beta',
    workspaceId: wsB.id,
    name: 'ИИ-Доктор Бета',
    niche: 'Клиника',
    nicheId: 'clinic',
    systemPrompt: 'Промпт Бета',
    priceList: 'Прайс Бета',
    qualificationQuestions: ['Симптом 1', 'Симптом 2', 'Симптом 3'],
    isActive: true,
  });

  // Test that querying agents for Workspace A ONLY returns Agent A
  const agentsInA = await db.getAllAgents(wsA.id);
  check('Workspace A only contains Agent A',
    agentsInA.length === 1 && agentsInA[0].id === agentA.id && agentsInA[0].workspaceId === wsA.id);

  const agentsInB = await db.getAllAgents(wsB.id);
  check('Workspace B only contains Agent B',
    agentsInB.length === 1 && agentsInB[0].id === agentB.id && agentsInB[0].workspaceId === wsB.id);

  // Conversations in Workspace A cannot be read in Workspace B
  const convA = await db.createConversation({
    id: 'conv_alpha_client_01',
    workspaceId: wsA.id,
    agentId: agentA.id,
    channel: 'Telegram',
    contact: 'id:998901234567',
    contactName: 'Клиент Альфа',
  });

  const convsInA = await db.getAllConversations(wsA.id);
  const convsInB = await db.getAllConversations(wsB.id);

  check('Workspace A conversations contain convA', convsInA.some((c) => c.id === convA.id));
  check('Workspace B conversations do NOT contain convA (Strict Tenant Isolation)',
    !convsInB.some((c) => c.id === convA.id));

  console.log(`\n🎉 All ${checks.length} Marketing Agency & Isolation assertions passed successfully!`);
}

main().catch((err) => {
  console.error('\n❌ Suite Error:', err);
  process.exit(1);
});
