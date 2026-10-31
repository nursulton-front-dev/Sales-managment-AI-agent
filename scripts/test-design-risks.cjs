/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');

// Load the real TypeScript modules with explicit dependencies. No network or working DB.
function loader(env, mocks = {}, fetch = () => { throw new Error('Unexpected network call'); }) {
  const cache = new Map();
  return function load(relative) {
    const filename = path.resolve(relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = { exports: {} }; cache.set(filename, loadedModule);
    const nativeRequire = createRequire(filename);
    const requireModule = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@/') || id.startsWith('.')) {
        const target = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(filename), id);
        return load(fs.existsSync(target + '.ts') ? target + '.ts' : path.join(target, 'index.ts'));
      }
      return nativeRequire(id);
    };
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require: requireModule, process: { env, cwd: () => process.cwd() }, Buffer, Date, Error, crypto: globalThis.crypto, AbortSignal, console, fetch }, { filename });
    return loadedModule.exports;
  };
}

const results = [];
const check = (name, value) => { assert.ok(value, name); results.push(name); console.log('PASS', name); };

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chorla-ledger-test-'));
  try {
    const repository = loader({ DATABASE_URL: '', CHORLA_DATA_DIR: directory })('src/db/index.ts');
    const workspace = await repository.createWorkspace({ companyName: 'Isolated ledger fixture', niche: 'other', ownerName: 'Test', ownerEmail: 'ledger@example.test', ownerPhone: '', passwordHash: '', teamSize: '1', dailyLeadsVolume: '<20', plan: 'trial', tokenBalance: 5 });
    const debits = await Promise.all(Array.from({ length: 20 }, () => repository.recordTokenTransaction({ workspaceId: workspace.id, actionType: 'chat_reply', tokensDelta: -1 })));
    const persisted = JSON.parse(fs.readFileSync(path.join(directory, 'db_store.json'), 'utf8'));
    check('Parallel local debits cannot overdraw or lose updates', debits.filter((r) => r.success).length === 5 && persisted.workspaces[0].tokenBalance === 0);
    check('Every accepted debit has exactly one ledger entry', persisted.tokenLogs.filter((log) => log.actionType === 'chat_reply').length === 5 && persisted.tokenLogs.filter((log) => log.actionType === 'chat_reply').every((log) => log.tokensDelta === -1));
    await assert.rejects(repository.recordTokenTransaction({ workspaceId: workspace.id, actionType: 'chat_reply', tokensDelta: NaN }));
    check('Invalid debit leaves persisted balance unchanged', (await repository.getWorkspaceById(workspace.id)).tokenBalance === 0);

    const databaseRow = { ...workspace, companyName: 'Returned by database' };
    const database = {
      insert: () => ({ values: async () => undefined }),
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [databaseRow] }) }) }),
    };
    const databaseOnly = loader({ DATABASE_URL: 'postgresql://test.invalid/isolated' }, {
      '@neondatabase/serverless': { neon: () => ({}) },
      'drizzle-orm/neon-http': { drizzle: () => database },
      fs: new Proxy({}, { get: () => () => { throw new Error('Database mode must not access local storage'); } }),
    })('src/db/index.ts');
    check('Database inserts succeed without writable local disk', (await databaseOnly.createWorkspace(workspace)).id === workspace.id);
    check('Database edits return the persisted row without a local mirror', (await databaseOnly.updateWorkspace(workspace.id, { companyName: databaseRow.companyName })).companyName === databaseRow.companyName);

    async function sandbox(env, debitSuccess = true) {
      const effects = []; const requests = [];
      const agent = { id: 'agent-test', workspaceId: 'workspace-test', name: 'Test', systemPrompt: 'Use the knowledge base', knowledgeBase: 'Consultation', qualificationQuestions: [] };
      const forbidden = (name) => async () => { effects.push(name); throw new Error('Unexpected live side effect'); };
      const repositoryMock = {
        getAllAgents: async () => [agent], getWorkspaceById: async () => ({ id: agent.workspaceId, tokenBalance: 100 }),
        recordTokenTransaction: async (entry) => { effects.push(entry); return { success: debitSuccess, error: debitSuccess ? undefined : 'Insufficient balance' }; },
        createLead: forbidden('lead'), createAppointment: forbidden('appointment'), createMessage: forbidden('message'), createConversation: forbidden('conversation'), updateWorkspace: forbidden('workspace'),
      };
      const load = loader(env, { '@/src/db': repositoryMock, '@/lib/calendar/google': { createGoogleCalendarEvent: forbidden('calendar'), generateDirectGoogleCalendarLink: forbidden('calendar-link') } }, async (url, options) => {
        requests.push({ url, body: JSON.parse(options.body) });
        return { ok: true, json: async () => ({ choices: [{ message: { content: 'Test model response' } }], candidates: [{ content: { parts: [{ text: 'Test model response' }] } }] }) };
      });
      const gateway = load('lib/ai/gateway.ts');
      let response, error;
      try { response = await gateway.processAgentMessage({ agentId: agent.id, workspaceId: agent.workspaceId, message: 'Запиши завтра в 14:00', history: [{ role: 'user', content: 'Earlier question' }, { role: 'assistant', content: 'Earlier response' }], isSandbox: true }); }
      catch (failure) { error = failure; }
      return { effects, requests, response, error };
    }

    const openai = await sandbox({ OPENAI_API_KEY: 'unit-test-key' });
    check('Successful booking-intent sandbox never writes leads, conversations or calendar events', !openai.error && openai.effects.length === 1 && openai.effects[0].actionType === 'chat_reply' && openai.effects[0].tokensDelta === -1);
    check('Sandbox charges the response policy and preserves history', openai.response.tokensCost === 1 && openai.requests[0].body.messages.some((m) => m.content === 'Earlier response'));
    const gemini = await sandbox({ GEMINI_API_KEY: 'unit-test-key' });
    check('Fallback model receives the conversation history', !gemini.error && JSON.stringify(gemini.requests[0].body).includes('Earlier response'));
    const unavailable = await sandbox({});
    check('Unavailable model returns an error without charging or fabricated answers', unavailable.error && !unavailable.response && unavailable.effects.length === 0);
    const rejectedDebit = await sandbox({ OPENAI_API_KEY: 'unit-test-key' }, false);
    check('Rejected debit cannot be reported as a successful paid response', rejectedDebit.error && !rejectedDebit.response);

    // Real support storage and handlers; identity is injected to exercise each role without email delivery.
    let identity = { workspaceId: workspace.id, userEmail: 'ledger@example.test', userName: 'Customer', isSuperAdmin: false };
    const supportLoader = loader({ CHORLA_DATA_DIR: directory }, {
      '@/src/db': { db: null },
      '@/src/server/auth/session': { getServerSessionContext: async () => identity },
      'next/server': { NextResponse: require('next/server').NextResponse, connection: async () => {} },
    });
    const support = supportLoader('lib/server/support/index.ts');
    const ticket = await support.createSupportTicket({ workspaceId: workspace.id, authorEmail: identity.userEmail, authorName: 'Customer', type: 'question', subject: 'Unit support cycle', description: 'Question', attachments: [] });
    const admin = supportLoader('app/api/admin/support/[id]/route.ts');
    const customer = supportLoader('app/api/support/tickets/[id]/route.ts');
    const parameters = { params: Promise.resolve({ id: ticket.id }) };
    const request = (body) => new Request('http://localhost/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    check('Customer cannot call the administrator reply handler', (await admin.POST(request({ text: 'Forbidden' }), parameters)).status === 403);
    identity = { ...identity, isSuperAdmin: true, userEmail: 'support@example.test', userName: 'Support' };
    check('Authorized support answer is saved', (await admin.POST(request({ text: 'Support answer' }), parameters)).status === 200);
    await admin.POST(request({ text: 'Internal diagnostic note', isInternalNote: true }), parameters);
    identity = { ...identity, isSuperAdmin: false, userEmail: 'ledger@example.test' };
    const detail = await (await customer.GET(request({}), parameters)).json();
    check('Customer sees support answer without internal notes', detail.messages.some((m) => m.text === 'Support answer') && !detail.messages.some((m) => m.text === 'Internal diagnostic note'));
    await support.updateTicketStatus(ticket.id, 'closed');
    check('Customer can reopen a closed ticket', (await customer.POST(request({ reopen: true }), parameters)).status === 200 && (await support.getSupportTicketById(ticket.id)).status === 'in_progress');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  fs.writeFileSync('docs/design/implemented/business-risk-tests.json', JSON.stringify({ timestamp: new Date().toISOString(), scope: 'Real local ledger and support storage. Mocked model transport, database adapter and role identities in unit tests. No live PostgreSQL/provider verification.', checks: results }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
