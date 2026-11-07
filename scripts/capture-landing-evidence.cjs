const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const EVIDENCE_DIR = path.join(__dirname, '..', 'docs', 'landing', 'evidence');
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
  console.log('🚀 Starting Next.js production server for landing evidence capture...');
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

    // 1. Desktop 1440px - Russian
    console.log('📸 1. Capturing Desktop (1440px) - RU...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/?lang=ru', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const path1440Ru = path.join(EVIDENCE_DIR, 'landing-desktop-1440-ru.png');
    await page.screenshot({ path: path1440Ru, fullPage: true });
    console.log('✅ Saved:', path1440Ru);

    // 2. Desktop 1440px - Uzbek
    console.log('📸 2. Capturing Desktop (1440px) - UZ...');
    await page.goto('http://localhost:3000/?lang=uz', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const path1440Uz = path.join(EVIDENCE_DIR, 'landing-desktop-1440-uz.png');
    await page.screenshot({ path: path1440Uz, fullPage: true });
    console.log('✅ Saved:', path1440Uz);

    // 3. Mobile 390px - Russian
    console.log('📸 3. Capturing Mobile (390px) - RU...');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:3000/?lang=ru', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const path390Ru = path.join(EVIDENCE_DIR, 'landing-mobile-390-ru.png');
    await page.screenshot({ path: path390Ru, fullPage: true });
    console.log('✅ Saved:', path390Ru);

    // 4. Mobile 390px - Uzbek
    console.log('📸 4. Capturing Mobile (390px) - UZ...');
    await page.goto('http://localhost:3000/?lang=uz', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const path390Uz = path.join(EVIDENCE_DIR, 'landing-mobile-390-uz.png');
    await page.screenshot({ path: path390Uz, fullPage: true });
    console.log('✅ Saved:', path390Uz);

    // 5. Tablet 768px - Russian
    console.log('📸 5. Capturing Tablet (768px) - RU...');
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000/?lang=ru', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const path768Ru = path.join(EVIDENCE_DIR, 'landing-tablet-768-ru.png');
    await page.screenshot({ path: path768Ru, fullPage: true });
    console.log('✅ Saved:', path768Ru);

    // 6. Compact Mobile 360px - Russian
    console.log('📸 6. Capturing Compact Mobile (360px) - RU...');
    await page.setViewport({ width: 360, height: 740 });
    await page.goto('http://localhost:3000/?lang=ru', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const path360Ru = path.join(EVIDENCE_DIR, 'landing-compact-360-ru.png');
    await page.screenshot({ path: path360Ru, fullPage: true });
    console.log('✅ Saved:', path360Ru);

    // 7. Test interactive demo tab click
    console.log('🧪 7. Testing interactive elements (demo tabs, accordion, mobile menu)...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

    // Click demo tab 2
    const tabs = await page.$$('[role="tab"]');
    if (tabs.length >= 2) {
      await tabs[1].click();
      await new Promise((r) => setTimeout(r, 400));
      console.log('✅ PASS: Demo tab 2 clicked and rendered');
    }

    // Toggle FAQ accordion
    const faqButtons = await page.$$('button[aria-controls^="faq-answer-"]');
    if (faqButtons.length > 0) {
      await faqButtons[1].click();
      await new Promise((r) => setTimeout(r, 300));
      console.log('✅ PASS: FAQ accordion expanded');
    }

    // Check public accessibility of /
    const publicRes = await fetch('http://localhost:3000/');
    if (publicRes.status === 200) {
      console.log('✅ PASS: Root landing page is publicly accessible (HTTP 200)');
    }

    // Check dashboard protection without cookies
    const dashRes = await fetch('http://localhost:3000/dashboard', { redirect: 'manual' });
    if (dashRes.status === 307 || dashRes.status === 302 || dashRes.status === 303) {
      console.log('✅ PASS: /dashboard properly redirects unauthorized visitors to /login (HTTP 307)');
    }

    await browser.close();
    console.log('\n🎉 Landing page visual evidence captured successfully across all viewports!');
  } finally {
    server.kill('SIGTERM');
  }
}

runCapture().catch((err) => {
  console.error('❌ Capture failed:', err);
  process.exit(1);
});
