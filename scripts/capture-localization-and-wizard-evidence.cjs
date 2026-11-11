const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const EVIDENCE_DIR = path.join(__dirname, '..', 'docs', 'localization-wizard', 'evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const ARTIFACTS_DIR = '/home/nursultan/.gemini/antigravity-cli/brain/e0b46a1f-a118-4392-a62e-d503acb9277d';

async function copyToArtifacts(filename) {
  const src = path.join(EVIDENCE_DIR, filename);
  const dest = path.join(ARTIFACTS_DIR, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`📋 Copied ${filename} to artifacts directory`);
  }
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
    console.log('✅ Server is ready on http://localhost:3000\n');

    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Set cookie required by proxy.ts to allow access to /dashboard
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
      tokenBalance: 420,
      status: 'active',
      emailVerified: true,
      telegramBusinessConnected: true,
      telegramBusinessEnabled: true,
      telegramBusinessCanReply: true,
      telegramBusinessUsername: 'cambridge_academy_bot',
      telegramBusinessAgentId: 'agent-1',
      telegramBusinessConnectedAt: new Date().toISOString(),
      instagramConnected: false,
      instagramStatus: 'disconnected',
      instagramAutoReply: false,
      googleCalendarConnected: true,
      googleCalendarEmail: 'maxramovnursulton1@gmail.com',
      googleCalendarWorkingHours: '09:00-18:00',
      googleCalendarSlotDuration: 45,
      settings: {
        agentDraft: {
          name: 'IELTS Maslahatchisi',
          nicheTemplate: 'courses',
          targetGoal: 'Kurslar bo‘yicha maslahat berish va bepul sinov darsiga yozish.',
          languages: ['uz', 'ru'],
          tone: 'consultative',
          servicesAndPricing: '- General English guruhi: 650 000 so‘m/oy\n- Intensiv IELTS: 950 000 so‘m/oy\n- Sinov darsi: 0 so‘m',
          qualificationQuestions: [
            'O‘quvchining yoshi nechada?',
            'Hozirgi ingliz tili darajangiz qanday?',
            'Sinov darsiga qaysi kuni kelish qulay?'
          ],
          restrictions: ['Kafolatsiz 100% natija vaʼda qilmaslik'],
          handoverConditions: ['Mijoz to‘lovni bo‘lib to‘lashni so‘raganda'],
          googleCalendarConnected: true,
          channels: ['telegram', 'widget'],
          unresolvedQuestions: [],
          currentStep: 2,
          updatedAt: new Date().toISOString()
        }
      },
      createdAt: new Date().toISOString()
    };

    const mockAgent = {
      id: 'agent-1',
      workspaceId: 'ws-prod-launch',
      name: 'IELTS Maslahatchisi',
      role: 'sales',
      nicheTemplate: 'courses',
      isActive: true,
      telegramConnected: true,
      telegramUsername: 'cambridge_academy_bot',
      googleCalendarConnected: true,
      knowledgeBase: 'Cambridge Academy - IELTS va General English kurslari.',
      systemPrompt: 'Siz Cambridge Academy o‘quv markazining konsultantisiz.',
      qualificationQuestions: ['Hozirgi darajangiz qanday?', 'Qachon imtihon topshirmoqchisiz?'],
      createdAt: new Date().toISOString()
    };

    const mockLeads = [
      {
        id: 'lead-1',
        name: 'Jasur Bekmurodov',
        phone: '+998 90 123 45 67',
        status: 'qualified',
        dealValue: 950000,
        channel: 'telegram',
        agentId: 'agent-1',
        createdAt: new Date().toISOString(),
        booking: {
          date: '2026-11-12T11:00:00.000Z',
          service: 'IELTS Intensive',
          status: 'confirmed'
        }
      },
      {
        id: 'lead-2',
        name: 'Madina Karimova',
        phone: '+998 97 765 43 21',
        status: 'new',
        dealValue: 650000,
        channel: 'widget',
        agentId: 'agent-1',
        createdAt: new Date().toISOString()
      }
    ];

    const mockConversations = [
      {
        id: 'conv-1',
        leadName: 'Jasur Bekmurodov',
        channel: 'telegram',
        status: 'active',
        unreadCount: 0,
        lastMessage: 'Sinov darsiga payshanba soat 11:00 ga yozildingiz!',
        lastMessageAt: new Date().toISOString(),
        agentAssigned: 'IELTS Maslahatchisi',
        messages: [
          { id: 'm-1', role: 'user', content: 'Assalomu alaykum! IELTS kurslari haqida maʼlumot bera olasizmi?', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: 'm-2', role: 'assistant', content: 'Vaalaykum assalom! Albatta. Bizda 3 oylik Intensive IELTS va General English guruhlari bor. Hozirgi darajangiz qanday?', timestamp: new Date(Date.now() - 3500000).toISOString() },
          { id: 'm-3', role: 'user', content: 'Pre-intermediate, 6.5 ball kerak.', timestamp: new Date(Date.now() - 3400000).toISOString() },
          { id: 'm-4', role: 'assistant', content: 'Ajoyib! Sizga Intensive guruhimiz to‘g‘ri keladi. Qaysi kuni bepul sinov darsiga kela olasiz?', timestamp: new Date(Date.now() - 3300000).toISOString() }
        ]
      }
    ];

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
          body: JSON.stringify({ success: true, leads: mockLeads })
        });
      } else if (url.includes('/api/conversations') && req.method() === 'GET') {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, conversations: mockConversations })
        });
      } else if (url.includes('/api/assistant/wizard') && req.method() === 'GET') {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            draft: mockWorkspace.settings.agentDraft,
            plan: 'trial',
            maxAgents: 1
          })
        });
      } else if (url.includes('/api/assistant/wizard') && req.method() === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        if (body.action === 'save_draft') {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, savedAt: new Date().toISOString() })
          });
        } else {
          req.continue();
        }
      } else {
        req.continue();
      }
    });

    // -----------------------------------------------------------------
    // 1. Dashboard Overview (RU with Top Switcher RU active)
    // -----------------------------------------------------------------
    console.log('📸 1. Dashboard Overview in RU (Desktop 1440)...');
    await page.setCookie({ name: 'gapcha_locale', value: 'ru', domain: 'localhost', path: '/' });
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.setItem('gapcha_locale', 'ru'));
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));

    const ruOverview = '01-dashboard-ru-overview-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, ruOverview), fullPage: false });
    await copyToArtifacts(ruOverview);

    // -----------------------------------------------------------------
    // 2. Click UZ switcher -> Dashboard Overview in UZ (Umumiy ko‘rinish)
    // -----------------------------------------------------------------
    console.log('📸 2. Switching to UZ via Header Switcher & Capturing Overview...');
    const uzButton = await page.$('button[aria-label="O‘zbekcha interfeys"]');
    if (uzButton) {
      await uzButton.click();
      await new Promise((r) => setTimeout(r, 600));
    } else {
      await page.setCookie({ name: 'gapcha_locale', value: 'uz', domain: 'localhost', path: '/' });
      await page.evaluate(() => localStorage.setItem('gapcha_locale', 'uz'));
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise((r) => setTimeout(r, 800));
    }

    const uzOverview = '02-dashboard-uz-overview-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, uzOverview), fullPage: false });
    await copyToArtifacts(uzOverview);

    // -----------------------------------------------------------------
    // 3. Leads & Bookings (Mijozlar va yozuvlar) in UZ
    // -----------------------------------------------------------------
    console.log('📸 3. Leads & Bookings in UZ...');
    await page.goto('http://localhost:3000/dashboard/leads', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    const uzLeads = '03-dashboard-uz-leads-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, uzLeads), fullPage: false });
    await copyToArtifacts(uzLeads);

    // -----------------------------------------------------------------
    // 4. Conversations (Suhbatlar) in UZ
    // -----------------------------------------------------------------
    console.log('📸 4. Conversations in UZ...');
    await page.goto('http://localhost:3000/dashboard/conversations', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    const uzConversations = '04-dashboard-uz-conversations-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, uzConversations), fullPage: false });
    await copyToArtifacts(uzConversations);

    // -----------------------------------------------------------------
    // 5. Integrations (Integratsiyalar) in UZ
    // -----------------------------------------------------------------
    console.log('📸 5. Integrations in UZ...');
    await page.goto('http://localhost:3000/dashboard/integrations', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    const uzIntegrations = '05-dashboard-uz-integrations-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, uzIntegrations), fullPage: false });
    await copyToArtifacts(uzIntegrations);

    // -----------------------------------------------------------------
    // 6. Profile (Profil) in UZ with Language Selector
    // -----------------------------------------------------------------
    console.log('📸 6. Profile in UZ...');
    await page.goto('http://localhost:3000/dashboard/profile', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    const uzProfile = '06-dashboard-uz-profile-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, uzProfile), fullPage: false });
    await copyToArtifacts(uzProfile);

    // -----------------------------------------------------------------
    // 7. Redesigned Agent Wizard in UZ (Desktop 1440 60/40 Split)
    // -----------------------------------------------------------------
    console.log('📸 7. Redesigned Agent Creation Wizard in UZ (Desktop 1440)...');
    await page.goto('http://localhost:3000/dashboard/agents/new', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const uzWizardDesktop = '07-wizard-uz-desktop-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, uzWizardDesktop), fullPage: false });
    await copyToArtifacts(uzWizardDesktop);

    // -----------------------------------------------------------------
    // 8. Wizard Edit Modal in UZ
    // -----------------------------------------------------------------
    console.log('📸 8. Wizard Section Edit Modal in UZ...');
    // Click on the first edit button in the resume card
    const editButtons = await page.$$('button');
    for (const btn of editButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('O‘zgartirish')) {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
    const uzWizardModal = '08-wizard-uz-edit-modal-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, uzWizardModal), fullPage: false });
    await copyToArtifacts(uzWizardModal);

    // Close modal
    const closeBtn = await page.$('button[aria-label="Yopish"]');
    if (closeBtn) await closeBtn.click();
    await new Promise((r) => setTimeout(r, 400));

    // -----------------------------------------------------------------
    // 9. Redesigned Agent Wizard in Mobile (390px Viewport)
    // -----------------------------------------------------------------
    console.log('📸 9. Redesigned Agent Creation Wizard on Mobile (390px)...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3000/dashboard/agents/new', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    const uzWizardMobileDialogue = '09-wizard-uz-mobile-dialogue-390.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, uzWizardMobileDialogue), fullPage: false });
    await copyToArtifacts(uzWizardMobileDialogue);

    // Switch to Resume tab on mobile
    console.log('📸 10. Wizard Mobile Tab: Resume view...');
    const resumeTab = await page.$('button[id*="resume"], button[role="tab"]:last-child');
    if (resumeTab) {
      await resumeTab.click();
      await new Promise((r) => setTimeout(r, 500));
    }
    const uzWizardMobileResume = '10-wizard-uz-mobile-resume-390.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, uzWizardMobileResume), fullPage: false });
    await copyToArtifacts(uzWizardMobileResume);

    // -----------------------------------------------------------------
    // 11. Redesigned Agent Wizard in RU (Desktop 1440)
    // -----------------------------------------------------------------
    console.log('📸 11. Redesigned Agent Creation Wizard in RU (Desktop 1440)...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.setCookie({ name: 'gapcha_locale', value: 'ru', domain: 'localhost', path: '/' });
    await page.evaluate(() => localStorage.setItem('gapcha_locale', 'ru'));
    await page.goto('http://localhost:3000/dashboard/agents/new', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    const ruWizardDesktop = '11-wizard-ru-desktop-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, ruWizardDesktop), fullPage: false });
    await copyToArtifacts(ruWizardDesktop);

    console.log('\n🎉 All evidence screenshots captured and copied to brain artifacts directory!');
    await browser.close();
  } finally {
    server.kill();
  }
}

runCapture().catch((err) => {
  console.error('❌ Evidence capture error:', err);
  process.exit(1);
});
