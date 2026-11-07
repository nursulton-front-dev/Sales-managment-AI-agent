const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const EVIDENCE_DIR = path.join(__dirname, '..', 'docs', 'integrations', 'evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeout}ms`);
}

async function runCapture() {
  console.log('🚀 Starting Next.js production server for evidence capture...');
  const server = spawn('npx', ['next', 'start', '-p', '3000'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    stdio: 'ignore'
  });

  try {
    await waitForServer('http://localhost:3000/');
    console.log('✅ Production server is up on port 3000');

    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Set cookie required by proxy.ts to allow access to /dashboard
    await page.setCookie({
      name: 'ai_os_workspace_id',
      value: 'ws-prod-launch',
      domain: 'localhost',
      path: '/'
    });

    const mockWorkspace = {
      id: 'ws-prod-launch',
      companyName: 'Cambrdige Lc',
      niche: 'courses',
      ownerName: 'Nursultan',
      ownerEmail: 'maxramovnursulton1@gmail.com',
      ownerPhone: '+998901234567',
      plan: 'trial',
      tokenBalance: 100,
      status: 'active',
      emailVerified: true,
      telegramBusinessConnected: true,
      telegramBusinessEnabled: true,
      telegramBusinessCanReply: true,
      telegramBusinessUsername: 'gapcha_assistant_bot',
      telegramBusinessAgentId: 'agent-1',
      telegramBusinessConnectedAt: new Date().toISOString(),
      instagramConnected: false,
      instagramStatus: 'disconnected',
      instagramAutoReply: false,
      googleCalendarConnected: true,
      googleCalendarEmail: 'maxramovnursulton1@gmail.com',
      googleCalendarWorkingHours: '09:00-19:00',
      googleCalendarSlotDuration: 30,
      settings: { quickStartDismissed: false },
      createdAt: new Date().toISOString()
    };

    const mockAgent = {
      id: 'agent-1',
      workspaceId: 'ws-prod-launch',
      name: 'Алишер (Консультант курсов)',
      role: 'sales',
      nicheTemplate: 'courses',
      isActive: true,
      telegramConnected: true,
      telegramUsername: 'cambridge_edu_bot',
      googleCalendarConnected: true,
      knowledgeBase: 'Курсы английского языка IELTS и General English.',
      systemPrompt: 'Ты консультант учебного центра Cambrdige Lc.',
      qualificationQuestions: ['Какой у вас текущий уровень?', 'Когда планируете сдавать экзамен?'],
      createdAt: new Date().toISOString()
    };

    const mockWidget = {
      id: 'widget-prod-1',
      workspaceId: 'ws-prod-launch',
      agentId: 'agent-1',
      enabled: true,
      title: 'Онлайн-консультант Cambrdige Lc',
      greeting: 'Здравствуйте! Я помогу подобрать курс и записаться на бесплатный пробный урок.',
      primaryColor: '#FF545A',
      position: 'bottom-right',
      lastSeenOrigin: 'cambridge.uz',
      lastSeenAt: new Date().toISOString()
    };

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/workspace/settings')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            hasWorkspace: true,
            workspace: mockWorkspace,
            isImpersonating: false,
            user: {
              id: 'ws-prod-launch',
              name: mockWorkspace.ownerName,
              email: mockWorkspace.ownerEmail,
              emailVerified: true,
              role: 'super_admin'
            }
          })
        });
      } else if (url.includes('/api/agents') && req.method() === 'GET') {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, agents: [mockAgent] })
        });
      } else if (url.includes('/api/leads') && req.method() === 'GET') {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, leads: [] })
        });
      } else if (url.includes('/api/integrations/widget') && req.method() === 'GET') {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, widget: mockWidget })
        });
      } else if (url.includes('/api/calendar/status')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            connected: true,
            email: mockWorkspace.googleCalendarEmail,
            workingHours: mockWorkspace.googleCalendarWorkingHours,
            slotDuration: mockWorkspace.googleCalendarSlotDuration
          })
        });
      } else if (url.includes('/api/integrations/telegram-business/status')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            connected: true,
            enabled: true,
            canReply: true,
            username: mockWorkspace.telegramBusinessUsername,
            serviceBotUsername: 'gapcha_assistant_bot'
          })
        });
      } else {
        req.continue();
      }
    });

    // 1. Dashboard Overview
    console.log('📸 Capturing /dashboard (Overview)...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    const overviewPath = path.join(EVIDENCE_DIR, 'launch-overview-1440.png');
    await page.screenshot({ path: overviewPath, fullPage: true });
    console.log('✅ Saved:', overviewPath);

    // 2. Agents Page
    console.log('📸 Capturing /dashboard/agents (Agents)...');
    await page.goto('http://localhost:3000/dashboard/agents', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    const agentsPath = path.join(EVIDENCE_DIR, 'launch-agents-1440.png');
    await page.screenshot({ path: agentsPath, fullPage: true });
    console.log('✅ Saved:', agentsPath);

    // 3. Integrations Catalog Page
    console.log('📸 Capturing /dashboard/integrations (Catalog)...');
    await page.goto('http://localhost:3000/dashboard/integrations', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    const integrationsPath = path.join(EVIDENCE_DIR, 'launch-integrations-1440.png');
    await page.screenshot({ path: integrationsPath, fullPage: true });
    console.log('✅ Saved:', integrationsPath);

    await browser.close();
    console.log('\n🎉 Evidence captured successfully!');
  } finally {
    server.kill('SIGTERM');
  }
}

runCapture().catch((err) => {
  console.error('❌ Capture failed:', err);
  process.exit(1);
});
