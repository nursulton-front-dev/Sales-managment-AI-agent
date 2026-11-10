const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, '..', 'docs', 'design', 'gapcha-mascot', 'evidence');
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

async function captureEvidence() {
  console.log('🚀 Launching Chrome for Animated Sparrow Evidence Capture...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  });

  try {
    const page = await browser.newPage();

    // -------------------------------------------------------------
    // 1. Animated Sparrow Showcase Page (animated/index.html)
    // -------------------------------------------------------------
    console.log('📸 1. Capturing Animated Showcase (Desktop & Mobile)...');
    const animatedHtmlPath = `file://${path.resolve(__dirname, '..', 'docs', 'design', 'gapcha-mascot', 'animated', 'index.html')}`;

    await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });
    await page.goto(animatedHtmlPath, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 600));

    const showcaseDesktop = 'animated-sparrow-showcase-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, showcaseDesktop), fullPage: true });
    await copyToArtifacts(showcaseDesktop);

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(animatedHtmlPath, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 500));

    const showcaseMobile = 'animated-sparrow-showcase-390.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, showcaseMobile), fullPage: false });
    await copyToArtifacts(showcaseMobile);

    // -------------------------------------------------------------
    // 2. Real App 404 Page (Desktop Light, Dark, Mobile)
    // -------------------------------------------------------------
    console.log('📸 2. Capturing 404 Page with Signpost & Look Pose...');

    // Desktop Light
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.goto('http://localhost:3000/non-existent-page-404', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 500));

    const p404Light = 'sparrow-404-desktop-1440-light.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, p404Light), fullPage: false });
    await copyToArtifacts(p404Light);

    // Desktop Dark
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.goto('http://localhost:3000/non-existent-page-404', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 500));

    const p404Dark = 'sparrow-404-desktop-1440-dark.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, p404Dark), fullPage: false });
    await copyToArtifacts(p404Dark);

    // Mobile 390px
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3000/non-existent-page-404', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 500));

    const p404Mobile = 'sparrow-404-mobile-390.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, p404Mobile), fullPage: false });
    await copyToArtifacts(p404Mobile);

    // -------------------------------------------------------------
    // 3. Landing Page Demo Section (Single Mascot Accent)
    // -------------------------------------------------------------
    console.log('📸 3. Capturing Landing Page Demo Section with Mascot Accent...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3000/#demo', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    // Scroll to #demo section
    await page.evaluate(() => {
      const el = document.getElementById('demo');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await new Promise((r) => setTimeout(r, 500));

    const landingDemoDesktop = 'sparrow-landing-demo-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, landingDemoDesktop), fullPage: false });
    await copyToArtifacts(landingDemoDesktop);

    // Mobile Landing Demo
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.evaluate(() => {
      const el = document.getElementById('demo');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await new Promise((r) => setTimeout(r, 500));

    const landingDemoMobile = 'sparrow-landing-demo-390.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, landingDemoMobile), fullPage: false });
    await copyToArtifacts(landingDemoMobile);

    // -------------------------------------------------------------
    // 4. Dashboard Mock Auth & Empty States (Conversations & Leads)
    // -------------------------------------------------------------
    console.log('📸 4. Capturing Dashboard Empty States with Mascot...');
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
      telegramBusinessConnected: false, // test empty channels state
      instagramConnected: false,
      googleCalendarConnected: false,
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
      } else if (url.includes('/api/conversations')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            conversations: []
          })
        });
      } else if (url.includes('/api/leads')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            leads: []
          })
        });
      } else if (url.includes('/api/agents') && req.method() === 'GET') {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            agents: []
          })
        });
      } else {
        req.continue();
      }
    });

    // Conversations Empty State
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3000/dashboard/conversations', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    const conversationsEmpty = 'sparrow-conversations-empty-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, conversationsEmpty), fullPage: false });
    await copyToArtifacts(conversationsEmpty);

    // Leads Empty State
    await page.goto('http://localhost:3000/dashboard/leads', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    const leadsEmpty = 'sparrow-leads-empty-1440.png';
    await page.screenshot({ path: path.join(EVIDENCE_DIR, leadsEmpty), fullPage: false });
    await copyToArtifacts(leadsEmpty);

    await browser.close();
    console.log('🎉 All animated sparrow evidence captured successfully!');
  } catch (err) {
    await browser.close();
    throw err;
  }
}

captureEvidence().catch((err) => {
  console.error('Evidence capture failed:', err);
  process.exit(1);
});
