const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const EVIDENCE_DIR = path.join(__dirname, '..', 'docs', 'design', 'gapcha-mascot', 'evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const ARTIFACTS_DIR = '/home/nursultan/.gemini/antigravity-cli/brain/e0b46a1f-a118-4392-a62e-d503acb9277d';

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

async function copyToArtifacts(filename) {
  const src = path.join(EVIDENCE_DIR, filename);
  const dest = path.join(ARTIFACTS_DIR, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`📋 Copied ${filename} to artifacts directory`);
  }
}

async function runEvidenceCapture() {
  console.log('🚀 Starting Next.js production server for Mascot evidence capture...');
  const server = spawn('npx', ['next', 'start', '-p', '3000'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    stdio: 'ignore'
  });

  try {
    await waitForServer('http://localhost:3000/');
    console.log('✅ Server is ready on http://localhost:3000\n');

    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      headless: true,
    });

    const page = await browser.newPage();

    // -------------------------------------------------------------
    // PART 1: Local Mascot Overview & 3 State Mockups
    // -------------------------------------------------------------
    console.log('📸 Capturing Mascot Assets & Showcase Gallery...');
    const overviewPath = `file://${path.resolve(__dirname, '..', 'docs', 'design', 'gapcha-mascot', 'index.html')}`;

    // Desktop 1440px - Light Theme - RU
    await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });
    await page.goto(overviewPath, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 600));

    const overviewLightRu = 'mascot-assets-overview-1440-light-ru.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, overviewLightRu), fullPage: true });
    await copyToArtifacts(overviewLightRu);

    // Desktop 1440px - Dark Theme - UZ
    await page.click('#themeToggle');
    await page.click('#langToggle');
    await new Promise((r) => setTimeout(r, 400));

    const overviewDarkUz = 'mascot-assets-overview-1440-dark-uz.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, overviewDarkUz), fullPage: true });
    await copyToArtifacts(overviewDarkUz);

    // Mobile 390px - Light Theme
    await page.click('#themeToggle'); // back to light
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 400));

    const overviewMobile = 'mascot-assets-overview-390-mobile.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, overviewMobile), fullPage: false });
    await copyToArtifacts(overviewMobile);

    // -------------------------------------------------------------
    // PART 2: Real App Integration (AI Wizard, Assistant, Success)
    // -------------------------------------------------------------
    console.log('\n📸 Capturing Real App Dashboard Integrations...');

    await page.setCookie({
      name: 'ai_os_workspace_id',
      value: 'ws-prod-launch',
      domain: 'localhost',
      path: '/'
    });

    const mockWorkspace = {
      id: 'ws-prod-launch',
      companyName: 'Cambridge Academy',
      niche: 'courses',
      ownerName: 'Nursulton',
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
      googleCalendarWorkingHours: '10:00-18:00',
      googleCalendarSlotDuration: 45,
      settings: {
        agentDraft: {
          name: 'ИИ-Менеджер Приемной Комиссии',
          nicheTemplate: 'courses',
          targetGoal: 'Консультация по предметам, уровню подготовки и запись на пробный урок.',
          languages: ['ru', 'uz'],
          tone: 'consultative',
          servicesAndPricing: '- IELTS: 850 000 сум\n- General English: 650 000 сум',
          qualificationQuestions: ['Какой у вас уровень?', 'В какое время удобно?'],
          restrictions: [],
          handoverConditions: [],
          googleCalendarConnected: true,
          channels: ['telegram', 'widget'],
          unresolvedQuestions: [],
          currentStep: 1,
          updatedAt: new Date().toISOString()
        }
      },
      createdAt: new Date().toISOString()
    };

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/workspace/settings') || url.includes('/api/admin/session')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            workspace: mockWorkspace,
            user: {
              id: 'usr-1',
              email: mockWorkspace.ownerEmail,
              name: mockWorkspace.ownerName,
              companyName: mockWorkspace.companyName,
              role: 'owner'
            }
          })
        });
      } else if (url.includes('/api/agents') && req.method() === 'GET') {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            agents: [
              {
                id: 'agent-1',
                workspaceId: 'ws-prod-launch',
                name: 'ИИ-Менеджер Приемной Комиссии',
                role: 'sales',
                nicheTemplate: 'courses',
                isActive: true,
                createdAt: new Date().toISOString()
              }
            ]
          })
        });
      } else if (url.includes('/api/assistant/wizard')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            draft: mockWorkspace.settings.agentDraft
          })
        });
      } else if (url.includes('/api/assistant/chat')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Канал Telegram подключен и активен. Входящие сообщения обрабатываются ИИ без задержек.',
            diagnostics: {
              channels: {
                telegramBusiness: { status: 'connected' },
                instagram: { status: 'disconnected' }
              },
              calendar: { connected: true },
              quota: { plan: 'trial', tokenBalance: 100 }
            }
          })
        });
      } else {
        req.continue();
      }
    });

    // 1. Desktop AI Wizard (/dashboard/agents/new) with Sparrow Welcome
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3000/dashboard/agents/new', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    const wizardDesktop = 'mascot-ai-wizard-1440-light.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, wizardDesktop), fullPage: false });
    await copyToArtifacts(wizardDesktop);

    // 2. Open Platform Assistant Drawer (Mascot avatar & Help empty state)
    console.log('📸 Capturing Platform Assistant Drawer with Mascot...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent && (b.textContent.includes('Помощь') || b.textContent.includes('Yordam'))
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 900));

    const assistantDrawer = 'mascot-platform-assistant-1440-light.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, assistantDrawer), fullPage: false });
    await copyToArtifacts(assistantDrawer);

    // Close drawer
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Закрыть панель помощи"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // 3. Setup Success State
    console.log('📸 Capturing Setup Success State with Mascot...');
    // Switch to manual or trigger success card view
    await page.evaluate(() => {
      // Find manual switch or simulate agent success state
      const manualBtn = document.querySelectorAll('button');
      for (const btn of manualBtn) {
        if (btn.textContent && btn.textContent.includes('Заполнить самостоятельно')) {
          btn.click();
          break;
        }
      }
    });
    await new Promise((r) => setTimeout(r, 800));

    // Fill and click save agent to see success state
    await page.evaluate(() => {
      const saveBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent && b.textContent.includes('Сохранить и запустить')
      );
      if (saveBtn) saveBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const successDesktop = 'mascot-setup-success-1440-light.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, successDesktop), fullPage: false });
    await copyToArtifacts(successDesktop);

    // 4. Mobile 390px - AI Wizard & Assistant
    console.log('📸 Capturing Mobile Viewports (390px)...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3000/dashboard/agents/new', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    const wizardMobile = 'mascot-ai-wizard-mobile-390.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, wizardMobile), fullPage: false });
    await copyToArtifacts(wizardMobile);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent && (b.textContent.includes('Помощь') || b.textContent.includes('Yordam'))
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 900));

    const assistantMobile = 'mascot-platform-assistant-mobile-390.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, assistantMobile), fullPage: false });
    await copyToArtifacts(assistantMobile);

    await browser.close();
    console.log('🎉 All evidence screenshots captured successfully.');
  } finally {
    server.kill();
  }
}

runEvidenceCapture().catch((err) => {
  console.error('Evidence capture failed:', err);
  process.exit(1);
});
