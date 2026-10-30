/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser acceptance runner. */
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
const appOrigin = 'http://localhost:3110', siteOrigin = 'http://localhost:3112';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chorla-widget-browser-'));
const output = path.resolve('docs/integrations/evidence');
fs.mkdirSync(output, { recursive: true });
const results = { time: new Date().toISOString(), environment: 'Isolated local Next server + separate customer origin + local HTTP model fixture. No live external accounts or model payments.', checks: [], screenshots: [], errors: [] };
const check = (name, condition) => { assert.ok(condition, name); results.checks.push(name); console.log('PASS', name); };
let widgetId, modelCalls = 0, app, browser, model, site;
const listen = (server, port) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const api = (page, url, method = 'GET', body) => page.evaluate(async (url, method, body) => { const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: response.status, data: await response.json() }; }, url, method, body);
async function shadow(page, fn, ...args) { return page.evaluate((source, values) => { const root = document.querySelector('[data-chorla-widget]')?.shadowRoot; return new Function('root', 'values', 'return (' + source + ')(root,...values)')(root, values); }, fn.toString(), args); }
async function waitShadow(page, selector) { await page.waitForFunction((selector) => Boolean(document.querySelector('[data-chorla-widget]')?.shadowRoot?.querySelector(selector)), { timeout: 45000 }, selector); }
async function main() {
  model = http.createServer(async (request, response) => {
    for await (const chunk of request) void chunk;
    modelCalls++;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ choices: [{ message: { content: 'Здравствуйте! Консультация стоит 100 000 сум. Подробности уточнит сотрудник.' } }], usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 } }));
  });
  site = http.createServer((_request, response) => { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(`<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Тестовый сайт клиента</title><body style="font:18px system-ui;padding:24px;background:#f4f7fb"><h1>Тестовый сайт клиента</h1><p>Отдельный сайт с установленным чатом Chorla.</p><script src="${appOrigin}/widget.js" data-widget-id="${widgetId || ''}" defer></script></body></html>`); });
  await listen(model, 3111); await listen(site, 3112);
  const log = fs.openSync(path.join(directory, 'next.log'), 'w');
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', '3110', '--hostname', '127.0.0.1'], { env: { ...process.env, DATABASE_URL: '', CHORLA_DATA_DIR: directory, BETTER_AUTH_URL: appOrigin, APP_URL: appOrigin, BETTER_AUTH_SECRET: 'isolated-browser-secret-32-characters-only', CRON_SECRET: 'isolated-cron-secret', RESEND_API_KEY: '', OPENAI_API_KEY: '', GEMINI_API_KEY: '', DEEPSEEK_API_KEY: 'local-fixture-only', DEEPSEEK_BASE_URL: 'http://127.0.0.1:3111', AI_DEFAULT_PROVIDER: 'deepseek', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', INSTAGRAM_APP_ID: '', INSTAGRAM_APP_SECRET: '', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }, stdio: ['ignore', log, log] });
  for (let i = 0; i < 120; i++) { try { if ((await fetch(appOrigin + '/login')).ok) break; } catch {} if (app.exitCode !== null) throw new Error('Next test server exited'); await sleep(500); }
  browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'], headless: true });
  const ownerContext = await browser.createBrowserContext(); const owner = await ownerContext.newPage();
  owner.setDefaultNavigationTimeout(90000); owner.setDefaultTimeout(45000);
  owner.on('pageerror', (error) => results.errors.push(error.message));
  await owner.goto(appOrigin + '/login', { waitUntil: 'domcontentloaded' });
  const email = `widget-${Date.now()}@example.test`;
  check('Owner can create an isolated account', (await api(owner, '/api/auth/sign-up/email', 'POST', { email, password: 'WidgetTest!43815', name: 'Тестовый владелец' })).status === 200);
  const registration = await api(owner, '/api/auth/register', 'POST', { companyName: 'Компания тестового сайта', niche: 'other' });
  const workspaceId = registration.data.workspace.id;
  const agent = await api(owner, '/api/agents', 'POST', { name: 'Консультант сайта', nicheTemplate: 'other', systemPrompt: 'Отвечай по базе знаний.', knowledgeBase: 'Консультация стоит 100 000 сум.' });
  const agentId = agent.data.agent.id;
  // Only this runner's temporary fixture is credited. No real workspace/database is touched.
  const filename = path.join(directory, 'db_store.json'); const store = JSON.parse(fs.readFileSync(filename)); store.workspaces.find((workspace) => workspace.id === workspaceId).tokenBalance = 20; fs.writeFileSync(filename, JSON.stringify(store));
  await owner.goto(appOrigin + '/dashboard/integrations', { waitUntil: 'domcontentloaded' });
  await owner.waitForSelector('[aria-labelledby="website-widget-title"] select');
  await owner.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Сайты').click());
  const section = '[aria-labelledby="website-widget-title"]';
  await owner.select(section + ' select', agentId);
  await owner.type('#widget-origins', siteOrigin);
  await owner.click(section + ' input[type="checkbox"]');
  await owner.click(section + ' button[type="submit"]');
  await owner.waitForFunction(() => document.querySelector('textarea[aria-label="Код установки чата"]')?.value.includes('data-widget-id'));
  const snippet = await owner.$eval('textarea[aria-label="Код установки чата"]', (node) => node.value);
  widgetId = snippet.match(/data-widget-id="([^"]+)"/)[1];
  check('Integrations UI generates an installable snippet without secret keys', snippet.includes(appOrigin + '/widget.js') && !snippet.includes('local-fixture') && !snippet.includes('secret'));
  for (const width of [375, 1440]) {
    await owner.setViewport({ width, height: 1000 });
    await owner.evaluate(() => document.querySelector('main')?.scrollTo(0, 0));
    check(`Integrations has no page overflow at ${width}px`, await owner.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const name = `integrations-${width}.png`; await owner.screenshot({ path: path.join(output, name), fullPage: true }); results.screenshots.push(name);
  }
  const visitorContext = await browser.createBrowserContext(); const visitor = await visitorContext.newPage();
  visitor.setDefaultNavigationTimeout(90000); visitor.setDefaultTimeout(45000);
  visitor.on('pageerror', (error) => results.errors.push(error.message));
  await visitor.setViewport({ width: 375, height: 760 });
  await visitor.goto(siteOrigin, { waitUntil: 'networkidle0' });
  await waitShadow(visitor, '.launcher');
  check('Widget loads on a separate approved customer origin', await shadow(visitor, (root) => Boolean(root.querySelector('.launcher'))));
  await shadow(visitor, (root) => root.querySelector('.launcher').click());
  await waitShadow(visitor, '.panel:not([hidden])');
  check('Opening chat puts keyboard focus in message field', await shadow(visitor, (root) => root.activeElement === root.querySelector('textarea')));
  await shadow(visitor, (root) => { root.querySelector('textarea').value = 'Сколько стоит консультация?'; root.querySelector('form').requestSubmit(); });
  await visitor.waitForFunction(() => document.querySelector('[data-chorla-widget]')?.shadowRoot?.querySelector('.messages')?.textContent.includes('100 000 сум.'), { timeout: 45000 });
  check('Visitor message gets a real gateway reply through local model transport', modelCalls === 1);
  let conversations = (await api(owner, '/api/conversations')).data.conversations;
  const conversation = conversations.find((item) => item.channel === 'WebWidget');
  check('Website conversation appears in owner dashboard API', Boolean(conversation));
  const balance = (await api(owner, '/api/workspace/settings')).data.workspace.tokenBalance;
  check('Exactly one reply token is debited', balance === 19);
  await owner.goto(appOrigin + '/dashboard/conversations?conversation=' + conversation.id, { waitUntil: 'networkidle0' });
  await owner.waitForFunction(() => document.body.textContent.includes('Сколько стоит консультация?'));
  check('Dashboard deep link opens the actual website conversation', await owner.evaluate(() => document.body.textContent.includes('Канал: Сайт')));
  const posted = await api(owner, '/api/conversations/' + conversation.id, 'POST', { text: 'Здравствуйте, я сотрудник. Помогу лично.' });
  check('Owner can reply and take over the conversation', posted.status === 200);
  await visitor.waitForFunction(() => document.querySelector('[data-chorla-widget]')?.shadowRoot?.textContent.includes('Помогу лично.'), { timeout: 15000 });
  check('Operator reply arrives at visitor without reload', true);
  await owner.waitForFunction(() => document.body.textContent.includes('Помогу лично.'), { timeout: 15000 });
  check('Operator dashboard also refreshes persisted messages', true);
  await shadow(visitor, (root) => { root.querySelector('textarea').value = 'Спасибо сотруднику'; root.querySelector('form').requestSubmit(); });
  await visitor.waitForFunction(() => document.querySelector('[data-chorla-widget]')?.shadowRoot?.querySelector('.messages')?.textContent.includes('Спасибо сотруднику'), { timeout: 15000 });
  check('Handoff keeps visitor messages and suppresses another model call', modelCalls === 1 && (await api(owner, '/api/workspace/settings')).data.workspace.tokenBalance === 19);
  const mobile = 'widget-375.png'; await visitor.screenshot({ path: path.join(output, mobile), fullPage: true }); results.screenshots.push(mobile);
  check('Mobile widget fits in viewport', await shadow(visitor, (root) => { const rect = root.querySelector('.panel').getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight; }));
  await visitor.keyboard.press('Escape');
  check('Escape closes chat and restores launcher focus', await shadow(visitor, (root) => root.querySelector('.panel').hidden && root.activeElement === root.querySelector('.launcher')));
  await visitor.reload({ waitUntil: 'networkidle0' }); await waitShadow(visitor, '.launcher'); await shadow(visitor, (root) => root.querySelector('.launcher').click());
  await visitor.waitForFunction(() => document.querySelector('[data-chorla-widget]')?.shadowRoot?.textContent.includes('Помогу лично.'), { timeout: 15000 });
  check('Visitor history survives page reload in same tab', true);
  await visitor.setViewport({ width: 1440, height: 900 }); await sleep(500);
  const desktop = 'widget-1440.png'; await visitor.screenshot({ path: path.join(output, desktop) }); results.screenshots.push(desktop);
  // Hold an old poll response across session rotation; it must never repaint the new conversation.
  await visitor.setRequestInterception(true);
  let heldRequest, hold = true;
  const waiting = new Promise((resolve) => visitor.on('request', (request) => {
    if (hold && request.method() === 'GET' && request.url().endsWith('/messages')) { hold = false; heldRequest = request; resolve(); }
    else void request.continue();
  }));
  await waiting;
  visitor.once('dialog', (dialog) => dialog.accept());
  const sessionCreated = visitor.waitForResponse((response) => response.url().endsWith('/session') && response.status() === 200);
  await shadow(visitor, (root) => root.querySelector('.new-chat').click());
  await sessionCreated; await heldRequest.continue(); await sleep(800);
  check('Late poll from previous session cannot repaint a new conversation', !await shadow(visitor, (root) => root.querySelector('.messages').textContent.includes('Помогу лично.')));
  const strangerContext = await browser.createBrowserContext(); const stranger = await strangerContext.newPage();
  await stranger.goto(siteOrigin, { waitUntil: 'networkidle0' }); await waitShadow(stranger, '.launcher'); await shadow(stranger, (root) => root.querySelector('.launcher').click()); await sleep(1200);
  check('Separate visitor cannot see existing conversation history', !await shadow(stranger, (root) => root.textContent.includes('Помогу лично.')));
  await owner.goto(appOrigin + '/dashboard/integrations', { waitUntil: 'networkidle0' });
  await owner.waitForSelector('textarea[aria-label="Код установки чата"]');
  const configuration = (await api(owner, '/api/integrations/widget')).data;
  check('Installation detection records customer site origin', configuration.widget.lastSeenOrigin === siteOrigin && Boolean(configuration.widget.lastSeenAt));
  const help = await api(owner, '/api/integrations/widget', 'POST');
  check('Installation help is stored as a support ticket', help.status === 200 && Boolean(help.data.ticketId));
  const outside = await owner.evaluate(async (id) => { const response = await fetch('/api/widget/' + id + '/config'); return response.status; }, widgetId);
  check('Unapproved dashboard origin cannot use public widget API', outside === 403);
  const settingsBody = { agentId, enabled: false, title: configuration.widget.title, greeting: configuration.widget.greeting, color: configuration.widget.color, position: 'right', allowedOrigins: [siteOrigin] };
  await api(owner, '/api/integrations/widget', 'PUT', { ...settingsBody, enabled: true, color: '#ffffff' });
  await stranger.reload({ waitUntil: 'networkidle0' }); await waitShadow(stranger, '.launcher');
  check('Light custom colors retain readable button text', await shadow(stranger, (root) => getComputedStyle(root.querySelector('.launcher')).color === 'rgb(0, 0, 0)'));
  await api(owner, '/api/integrations/widget', 'PUT', settingsBody);
  await stranger.reload({ waitUntil: 'networkidle0' }); await sleep(1000);
  check('Disabled widget does not mount on customer site', await stranger.$('[data-chorla-widget]') === null);
  check('No browser runtime errors', results.errors.length === 0);
  fs.writeFileSync(path.resolve('docs/integrations/browser-verification.json'), JSON.stringify(results, null, 2));
  console.log(`Completed ${results.checks.length} browser checks.`);
}
main().catch((error) => { console.error(error); if (fs.existsSync(path.join(directory, 'next.log'))) fs.copyFileSync(path.join(directory, 'next.log'), '/tmp/chorla-widget-browser-failure.log'); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (app) { app.kill('SIGTERM'); await sleep(1200); }
  if (site) site.close(); if (model) model.close();
  fs.rmSync(directory, { recursive: true, force: true });
});
