const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = '/home/nursultan/.gemini/antigravity-cli/brain/b2cb7f91-e1a4-405a-86b4-520d6927b785/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  const userProfile = {
    id: 'usr_owner',
    name: 'Нурсултон',
    email: 'maxramovnursulton1@gmail.com',
    companyName: 'Учебный центр «Прогресс»',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };

  const setAuthContext = async (targetTheme = 'light') => {
    await page.evaluateOnNewDocument((user, theme) => {
      localStorage.setItem('ai_os_user', JSON.stringify(user));
      localStorage.setItem('ai_os_plan', 'BUSINESS');
      localStorage.setItem('ai_os_tokens', '6000');
      localStorage.setItem('ai_os_email_verified', 'true');
      localStorage.setItem('ai_os_gcal_connected', 'true');
      localStorage.setItem('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, userProfile, targetTheme);

    await page.setCookie({
      name: 'ai_os_workspace_id',
      value: 'ws_test_demo',
      domain: 'localhost',
      path: '/',
    });
  };

  console.log('Capturing Billing screenshots...');
  // 1. Billing Desktop Light
  await page.setViewport({ width: 1440, height: 900 });
  await setAuthContext('light');
  await page.goto('http://localhost:3000/dashboard/billing', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'billing-desktop-light.png'), fullPage: false });
  console.log('Saved billing-desktop-light.png');

  // 2. Billing Desktop Dark
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'billing-desktop-dark.png'), fullPage: false });
  console.log('Saved billing-desktop-dark.png');

  // 3. Billing Mobile Light
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'billing-mobile-light.png'), fullPage: false });
  console.log('Saved billing-mobile-light.png');

  // 4. Billing Mobile Dark
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'billing-mobile-dark.png'), fullPage: false });
  console.log('Saved billing-mobile-dark.png');

  console.log('Capturing Integrations screenshots...');
  // 5. Integrations Desktop Light
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await page.goto('http://localhost:3000/dashboard/integrations', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integrations-desktop-light.png'), fullPage: false });
  console.log('Saved integrations-desktop-light.png');

  // 6. Integrations Desktop Dark
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integrations-desktop-dark.png'), fullPage: false });
  console.log('Saved integrations-desktop-dark.png');

  // 7. Integrations Mobile Light
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integrations-mobile-light.png'), fullPage: false });
  console.log('Saved integrations-mobile-light.png');

  // 8. Integrations Mobile Dark
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integrations-mobile-dark.png'), fullPage: false });
  console.log('Saved integrations-mobile-dark.png');

  console.log('Capturing Registration Step 3 screenshots...');
  // 9. Register Step 3 Desktop Light
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });

  // Fill Step 1
  await page.type('input[placeholder*="Cambridge"]', 'Учебный центр «Прогресс»');
  await page.type('input[placeholder*="+998 90 123 45 67"]', '+998 90 123 45 67');
  
  // Click Continue to Step 2
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const next = btns.find(b => b.textContent.includes('Продолжить'));
    if (next) next.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // Click Continue to Step 3
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const next = btns.find(b => b.textContent.includes('Продолжить'));
    if (next) next.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'register-step3-desktop-light.png'), fullPage: false });
  console.log('Saved register-step3-desktop-light.png');

  // 10. Register Step 3 Desktop Dark
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'register-step3-desktop-dark.png'), fullPage: false });
  console.log('Saved register-step3-desktop-dark.png');

  // 11. Register Step 3 Mobile Light
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'register-step3-mobile-light.png'), fullPage: false });
  console.log('Saved register-step3-mobile-light.png');

  // 12. Register Step 3 Mobile Dark
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'register-step3-mobile-dark.png'), fullPage: false });
  console.log('Saved register-step3-mobile-dark.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
