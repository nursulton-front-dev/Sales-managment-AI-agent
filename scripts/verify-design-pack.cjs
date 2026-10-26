/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test runner. */
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const origin = process.env.CHORLA_TEST_ORIGIN || 'http://localhost:3100';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error('Acceptance tests require a local server');
const output = path.join(process.cwd(), 'docs/design/implemented');
fs.mkdirSync(output, { recursive: true });
const evidence = { timestamp: new Date().toISOString(), environment: 'Isolated local server; real API responses; no live channels or payments', checks: [], screenshots: [], browserErrors: [], overflow: [] };
const check = (name, condition) => { assert.ok(condition, name); evidence.checks.push(name); console.log('PASS', name); };
const api = async (page, url, method = 'GET', body) => page.evaluate(async (url, method, body) => {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null) };
}, url, method, body);

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHORLA_CHROME || '/opt/google/chrome/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'], headless: true });
  try {
    const context = await browser.createBrowserContext(); const page = await context.newPage();
    page.on('pageerror', (error) => evidence.browserErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && /hydration|hydrated|didn.t match/i.test(message.text())) evidence.browserErrors.push(message.text()); });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(origin + '/login', { waitUntil: 'networkidle0' });
    check('Unauthenticated agent mutations are rejected', (await api(page, '/api/agents', 'PATCH', { id: 'unknown', isActive: false })).status === 401);
    check('Unauthenticated sandbox is rejected', (await api(page, '/api/ai/chat', 'POST', { message: 'test' })).status === 401);
    const email = `design-${Date.now()}@example.test`;
    const account = await api(page, '/api/auth/sign-up/email', 'POST', { email, password: 'ChorlaTest!43815', name: 'Тестовый владелец' });
    check('Test auth account is created', account.status === 200);
    const registration = await api(page, '/api/auth/register', 'POST', { companyName: 'Тестовая компания', niche: 'Маркетинговое агентство', ownerPhone: '', plan: 'pro' });
    check('Workspace uses verified identity and does not grant an unpaid plan', registration.data?.workspace?.plan === 'trial' && registration.data.workspace.tokenBalance === 0);
    const ws = registration.data.workspace;
    const anonymous = await browser.createBrowserContext(); const visitor = await anonymous.newPage();
    await visitor.goto(origin + '/login', { waitUntil: 'networkidle0' });
    await anonymous.setCookie({ name: 'ai_os_workspace_id', value: ws.id, domain: 'localhost', path: '/' });
    check('Workspace cookie alone cannot authenticate', (await api(visitor, '/api/workspace/settings')).status === 401);
    check('Wrong password is rejected', (await api(visitor, '/api/auth/login', 'POST', { email, password: 'Wrong!123456' })).status === 401);
    check('Correct password creates an authenticated session', (await api(visitor, '/api/auth/login', 'POST', { email, password: 'ChorlaTest!43815' })).data?.success === true);
    await anonymous.close();
    check('Workspace response excludes credentials', !('passwordHash' in ws) && !('verificationCode' in ws) && !('googleRefreshToken' in ws));
    const create = await api(page, '/api/agents', 'POST', { name: 'ИИ-менеджер', nicheTemplate: 'Маркетинговое агентство', systemPrompt: 'Отвечай только на основе базы знаний.', knowledgeBase: 'Консультации по продвижению.', qualificationQuestions: ['Какая услуга нужна?'] });
    check('Agent creation returns a persisted server id without secrets', create.status === 200 && create.data.agent?.id && !('tgBotToken' in create.data.agent));
    const agentId = create.data.agent.id;
    const reload = await api(page, '/api/agents');
    check('Agent persists on reload', reload.data.agents.some((agent) => agent.id === agentId));
    check('Agent without channel is not connected', reload.data.agents[0].telegramConnected === false);
    const beforeBalance = (await api(page, '/api/workspace/settings')).data.workspace.tokenBalance;
    check('Unverified subscription cannot mint tokens', (await api(page, '/api/billing/subscribe', 'POST', { planId: 'pro' })).status === 503);
    check('Unverified topup cannot mint tokens', (await api(page, '/api/billing/topup', 'POST', { packageId: 'pack-max' })).status === 503);
    check('Billing attempts leave balance unchanged', (await api(page, '/api/workspace/settings')).data.workspace.tokenBalance === beforeBalance);
    const leadsBefore = (await api(page, '/api/leads')).data.leads.length;
    await api(page, '/api/ai/chat', 'POST', { message: 'Запиши клиента завтра в 14:00', agentId, isSandbox: false, workspaceId: 'forged' });
    check('Browser cannot cause live booking by disabling sandbox', (await api(page, '/api/leads')).data.leads.length === leadsBefore);
    check('Master email code is rejected', (await api(page, '/api/auth/verify-email', 'POST', { code: '123456', email })).status === 400);
    const support = await api(page, '/api/support/tickets', 'POST', { type: 'question', subject: 'Тест приёмки', description: 'Проверка сохранения обращения без отправки писем.' });
    check('Support ticket is persisted', support.status === 200 && support.data.ticket?.id);
    const ticketId = support.data.ticket.id;
    const pdf = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.7\n% isolated attachment fixture\n%%EOF').toString('base64');
    const attachmentReply = await api(page, `/api/support/tickets/${ticketId}`, 'POST', { text: 'Вложение', attachments: [{ name: 'check.pdf', url: pdf }] });
    const attachmentUrl = attachmentReply.data?.message?.attachments?.[0]?.url;
    check('Attachment metadata uses a private route', attachmentReply.status === 200 && attachmentUrl?.startsWith('/api/support/tickets/'));
    check('Owner can download the saved attachment', await page.evaluate(async (url) => { const r = await fetch(url); return r.ok && r.headers.get('x-content-type-options') === 'nosniff' && (await r.text()).startsWith('%PDF-1.7'); }, attachmentUrl));
    const lead = await api(page, '/api/leads', 'POST', { clientName: 'Проверка сохранения', clientPhone: '+998901234567', channel: 'Telegram', status: 'new', tokensSpent: 9000 });
    const leadId = lead.data?.lead?.id;
    check('Manual lead persists without browser-supplied token charges', lead.status === 200 && leadId && lead.data.lead.tokensSpent === 0);
    check('Lead stage update persists', (await api(page, '/api/leads', 'PATCH', { id: leadId, status: 'qualified' })).data?.lead?.status === 'qualified');
    check('Invalid appointment is rejected', (await api(page, '/api/leads', 'PATCH', { id: leadId, appointmentTime: 'not-a-date' })).status === 400);
    check('Invalid agent settings are rejected', (await api(page, '/api/agents', 'PATCH', { id: agentId, name: {}, isActive: 'yes' })).status === 400);
    check('Support reply is saved', (await api(page, `/api/support/tickets/${ticketId}`, 'POST', { text: 'Дополнение к тестовому обращению' })).status === 200);
    check('Invalid attachment is rejected', (await api(page, '/api/support/tickets', 'POST', { type: 'bug', subject: 'Файл', description: 'Проверка', attachments: [{ name: 'bad.svg', url: 'data:image/svg+xml;base64,PHN2Zz4=' }] })).status === 400);
    const second = await browser.createBrowserContext(); const other = await second.newPage();
    await other.goto(origin + '/login', { waitUntil: 'networkidle0' });
    await api(other, '/api/auth/sign-up/email', 'POST', { email: `other-${Date.now()}@example.test`, password: 'ChorlaTest!43815', name: 'Второй владелец' });
    await api(other, '/api/auth/register', 'POST', { companyName: 'Другая компания', niche: 'other' });
    check('Other tenant cannot update agent', (await api(other, '/api/agents', 'PATCH', { id: agentId, name: 'FORGED' })).status === 404);
    check('Other tenant cannot read support ticket', (await api(other, `/api/support/tickets/${ticketId}`)).status === 403);
    check('Other tenant cannot update lead', (await api(other, '/api/leads', 'PATCH', { id: leadId, status: 'booked' })).status === 404);
    check('Other tenant cannot attach a lead to an unowned agent', (await api(other, '/api/leads', 'POST', { agentId, clientName: 'Forbidden' })).status === 404);
    check('Other tenant cannot download attachment', await other.evaluate(async (url) => (await fetch(url)).status === 404, attachmentUrl));
    check('Other tenant cannot reopen support ticket', (await api(other, `/api/support/tickets/${ticketId}`, 'POST', { reopen: true })).status === 403);
    check('Normal owner cannot use support administration', (await api(other, '/api/admin/support')).status === 403);
    await second.close();
    await page.goto(origin + '/dashboard', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');
    // Exercise the actual editor reached from the overview deep link.
    await page.goto(origin + '/dashboard/agents?edit=' + agentId, { waitUntil: 'networkidle0' });
    await page.waitForSelector('dialog[open] input');
    check('Agent deep link opens its editor', await page.$eval('dialog[open]', (dialog) => dialog.matches(':modal')));
    await page.$eval('dialog[open] input', (input) => input.focus());
    await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
    await page.keyboard.type('Saved acceptance agent');
    await page.click('dialog[open] button[type="submit"]');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    check('Agent editor saves on the server', (await api(page, '/api/agents')).data.agents.find((a) => a.id === agentId).name === 'Saved acceptance agent');

    for (const width of [375, 768, 1440]) {
      await page.setViewport({ width, height: 1000 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate((theme) => localStorage.setItem('ai-business-os-theme', theme), theme);
        for (const [name, route] of [['overview',''], ['leads','/leads'], ['conversations','/conversations'], ['agents','/agents'], ['integrations','/integrations'], ['billing','/billing'], ['company','/company'], ['support','/support'], ['profile','/profile']]) {
          await page.goto(origin + '/dashboard' + route, { waitUntil: 'networkidle0' });
          await page.waitForSelector('h1');
          await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
          const dimensions = await page.evaluate(() => { const main = document.querySelector('main'); return { document: document.documentElement.scrollWidth > innerWidth + 1, main: main && main.scrollWidth > main.clientWidth + 1, theme: document.documentElement.className, brokenImages: [...document.images].filter((image) => !image.complete || !image.naturalWidth).map((image) => image.src) }; });
          check(`Theme ${theme} is applied on ${name} at ${width}`, dimensions.theme.split(' ').includes(theme));
          if (dimensions.document || dimensions.main || dimensions.brokenImages.length) evidence.overflow.push({ name, width, theme, dimensions });
          const file = `${name}-${width}-${theme}.png`; await page.screenshot({ path: path.join(output, file) }); evidence.screenshots.push(file);
        }
        await page.goto(origin + '/dashboard/company', { waitUntil: 'networkidle0' });
        await page.evaluate(() => [...document.querySelectorAll('main button')].find((b) => b.textContent === 'Команда').click());
        await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
        const teamShot = `team-${width}-${theme}.png`; await page.screenshot({ path: path.join(output, teamShot) }); evidence.screenshots.push(teamShot);
        await page.goto(origin + '/dashboard', { waitUntil: 'networkidle0' });
        await page.click('main button'); await page.waitForSelector('dialog.drawer[open]');
        await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
        const sandboxShot = `sandbox-${width}-${theme}.png`; await page.screenshot({ path: path.join(output, sandboxShot) }); evidence.screenshots.push(sandboxShot);
        await page.keyboard.press('Escape');
      }
    }
    await page.setViewport({ width: 375, height: 700 });
    await page.goto(origin + '/dashboard', { waitUntil: 'networkidle0' });
    await page.click('[aria-label="Открыть меню навигации"]');
    check('Navigation drawer opens as a modal', await page.$eval('dialog.navigation-drawer', (dialog) => dialog.open && dialog.matches(':modal')));
    await page.keyboard.press('Escape');
    check('Navigation Escape restores focus', await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Открыть меню навигации'));
    await page.setViewport({ width: 1440, height: 900 });
    await page.click('main button');
    check('Sandbox opens as a modal', await page.$eval('dialog.drawer', (dialog) => dialog.open));
    await page.screenshot({ path: path.join(output, 'sandbox-1440-dark.png') });
    await page.keyboard.press('Escape');
    // System theme responds to a live operating-system preference change.
    await page.evaluate(() => localStorage.setItem('ai-business-os-theme', 'system'));
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.reload({ waitUntil: 'networkidle0' });
    check('System dark theme is applied', await page.$eval('html', (html) => html.classList.contains('dark')));
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.waitForFunction(() => document.documentElement.classList.contains('light'));
    check('System theme updates without reload', true);
    check('Reduced motion disables transitions', await page.$eval('main button', (button) => parseFloat(getComputedStyle(button).transitionDuration) < 0.01));

    await page.setViewport({ width: 375, height: 420 });
    await page.click('[aria-label="Открыть меню навигации"]');
    for (let i = 0; i < 18; i++) await page.keyboard.press('Tab');
    check('Navigation contains keyboard focus at low height', await page.evaluate(() => !!document.activeElement?.closest('dialog.navigation-drawer')));
    await page.keyboard.press('Escape');
    await page.goto(origin + '/dashboard/leads', { waitUntil: 'networkidle0' });
    await page.evaluate(() => [...document.querySelectorAll('main button')].find((b) => b.textContent.includes('Новый лид')).click());
    await page.waitForSelector('dialog[open] input');
    for (let i = 0; i < 14; i++) await page.keyboard.press('Tab');
    check('Lead modal contains keyboard focus', await page.evaluate(() => !!document.activeElement?.closest('dialog[open]')));
    check('Lead modal fits low viewport height', await page.$eval('dialog[open]', (dialog) => dialog.getBoundingClientRect().height <= innerHeight));
    check('Visible form controls have labels', await page.$eval('dialog[open]', (dialog) => [...dialog.querySelectorAll('input,select,textarea')].every((input) => input.labels?.length || input.getAttribute('aria-label'))));
    await page.keyboard.press('Escape');
    check('Lead modal closes with Escape', !(await page.$('dialog[open]')));

    const longName = 'Компания'.repeat(25);
    await api(page, '/api/workspace/settings', 'PATCH', { companyName: longName });
    await api(page, '/api/agents', 'PATCH', { id: agentId, name: 'Сотрудник'.repeat(22) });
    await page.goto(origin + '/dashboard/agents', { waitUntil: 'networkidle0' });
    check('Long names do not create page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth + 1));
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.screenshot({ path: path.join(output, 'long-names-low-height.png') }); evidence.screenshots.push('long-names-low-height.png');
    await api(page, '/api/workspace/settings', 'PATCH', { companyName: 'Тестовая компания' });
    await api(page, '/api/agents', 'PATCH', { id: agentId, name: 'ИИ-менеджер' });

    // Transport failure is injected only to verify error presentation, never to populate product data.
    await page.setRequestInterception(true);
    const failAgents = (request) => request.url().endsWith('/api/agents') ? request.abort('failed') : request.continue();
    page.on('request', failAgents);
    await page.goto(origin + '/dashboard/agents', { waitUntil: 'networkidle0' });
    check('Request failure has an error state, not an empty employee list', await page.$eval('main', (main) => !!main.querySelector('[role="alert"]') && !main.textContent.includes('Создайте первого')));
    page.off('request', failAgents); await page.setRequestInterception(false);
    check('No horizontal overflow or broken assets', evidence.overflow.length === 0);
    check('No browser runtime errors', evidence.browserErrors.length === 0);
  } finally {
    fs.writeFileSync(path.join(output, 'acceptance.json'), JSON.stringify(evidence, null, 2));
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
