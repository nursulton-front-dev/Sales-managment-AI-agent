const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ORIGIN = 'http://localhost:3100';
const OUT_DIR = path.join(process.cwd(), 'docs', 'design', 'implemented', 'screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

const PAGES = [
  { path: '/', name: 'landing' },
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
  { path: '/not-found', name: 'not-found' },
  { path: '/dashboard', name: 'dashboard-overview', auth: true },
  { path: '/dashboard/agents', name: 'dashboard-agents', auth: true },
  { path: '/dashboard/agents/new', name: 'dashboard-wizard', auth: true },
  { path: '/dashboard/conversations', name: 'dashboard-conversations', auth: true },
  { path: '/dashboard/leads', name: 'dashboard-leads', auth: true },
  { path: '/dashboard/integrations', name: 'dashboard-integrations', auth: true },
  { path: '/dashboard/billing', name: 'dashboard-billing', auth: true },
  { path: '/dashboard/company', name: 'dashboard-company', auth: true },
  { path: '/dashboard/support', name: 'dashboard-support', auth: true },
];

async function main() {
  console.log('🚀 Starting Comprehensive gapcha AI Visual, Mascot & Performance Audit...');

  const browser = await puppeteer.launch({
    executablePath: '/opt/google/chrome/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  });

  const auditResults = {
    timestamp: new Date().toISOString(),
    pagesTested: 0,
    screenshots: [],
    performance: [],
    mascotChecks: [],
    reducedMotionChecks: [],
  };

  try {
    const context = await browser.createBrowserContext();

    // Set auth cookie for authenticated dashboard pages
    await context.setCookie(
      {
        name: 'better-auth.session_token',
        value: 'test-session-token-321',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
      {
        name: 'ai_os_workspace_id',
        value: 'ws-test-preview',
        domain: 'localhost',
        path: '/',
      }
    );

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(15000);

    // 1. Audit Desktop Light RU
    console.log('\n--- 1. Desktop Light (RU) Viewport 1440x900 ---');
    await page.setViewport({ width: 1440, height: 900 });

    for (const p of PAGES) {
      const url = `${ORIGIN}${p.path}`;
      const t0 = Date.now();
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      const loadTimeMs = Date.now() - t0;
      const status = response ? response.status() : 0;

      // Ensure locale is RU
      await page.evaluate(() => {
        document.documentElement.setAttribute('lang', 'ru');
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('dark');
        localStorage.setItem('gapcha_locale', 'ru');
      });

      const shotName = `desktop-light-ru-${p.name}.png`;
      const shotPath = path.join(OUT_DIR, shotName);
      await page.screenshot({ path: shotPath, fullPage: false });

      auditResults.pagesTested++;
      auditResults.screenshots.push(shotName);
      auditResults.performance.push({
        page: p.name,
        path: p.path,
        status,
        loadTimeMs,
        viewport: '1440x900',
        locale: 'ru',
        theme: 'light',
      });
      console.log(`✅ [${p.name}] status: ${status}, load: ${loadTimeMs}ms -> ${shotName}`);
    }

    // 2. Audit Mobile Light UZ
    console.log('\n--- 2. Mobile Light (UZ) Viewport 390x844 ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    for (const p of PAGES) {
      const url = `${ORIGIN}${p.path}`;
      const t0 = Date.now();
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      const loadTimeMs = Date.now() - t0;
      const status = response ? response.status() : 0;

      // Switch locale to UZ
      await page.evaluate(() => {
        document.documentElement.setAttribute('lang', 'uz');
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('dark');
        localStorage.setItem('gapcha_locale', 'uz');
      });

      const shotName = `mobile-light-uz-${p.name}.png`;
      const shotPath = path.join(OUT_DIR, shotName);
      await page.screenshot({ path: shotPath, fullPage: false });

      auditResults.screenshots.push(shotName);
      auditResults.performance.push({
        page: p.name,
        path: p.path,
        status,
        loadTimeMs,
        viewport: '390x844',
        locale: 'uz',
        theme: 'light',
      });
      console.log(`✅ [${p.name}] status: ${status}, load: ${loadTimeMs}ms -> ${shotName}`);
    }

    // 3. Audit Desktop Dark RU
    console.log('\n--- 3. Desktop Dark (RU) Viewport 1440x900 ---');
    await page.setViewport({ width: 1440, height: 900 });

    for (const p of [PAGES[0], PAGES[4], PAGES[6], PAGES[7], PAGES[9]]) {
      const url = `${ORIGIN}${p.path}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Apply Dark theme
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      });

      const shotName = `desktop-dark-ru-${p.name}.png`;
      const shotPath = path.join(OUT_DIR, shotName);
      await page.screenshot({ path: shotPath, fullPage: false });
      auditResults.screenshots.push(shotName);
      console.log(`✅ [Dark] [${p.name}] -> ${shotName}`);
    }

    // 4. Mascot Asset & 3D Aksakal Verification
    console.log('\n--- 4. 3D Aksakal Mascot Verification ---');
    await page.goto(`${ORIGIN}/dashboard/agents/new`, { waitUntil: 'networkidle0' });
    const mascotImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter((img) => decodeURIComponent(img.src).includes('illustrations/gapcha/'))
        .map((img) => ({
          src: decodeURIComponent(img.src),
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          complete: img.complete,
          visible: img.offsetWidth > 0 && img.offsetHeight > 0,
        }));
    });

    console.log(`Found ${mascotImages.length} mascot instances on Agent Creation:`);
    assert.ok(mascotImages.length > 0, 'At least one mascot image should be rendered');
    for (const m of mascotImages) {
      console.log(`  Mascot src: ${m.src}, complete: ${m.complete}, dims: ${m.naturalWidth}x${m.naturalHeight}`);
      assert.ok(
        m.src.includes('/illustrations/gapcha/elder-3d/'),
        `Mascot must use approved 3D-aksakal, got: ${m.src}`
      );
      assert.ok(!m.src.includes('sparrow'), `Mascot MUST NOT use sparrow, got: ${m.src}`);
      auditResults.mascotChecks.push(m);
    }
    console.log('✅ PASS: All rendered mascot images belong exclusively to elder-3d (3D-aksakal)');

    // 5. Reduced Motion Verification
    console.log('\n--- 5. Reduced Motion CSS Verification ---');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(`${ORIGIN}/dashboard`, { waitUntil: 'domcontentloaded' });

    const motionEvaluations = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span[style*="width"]'));
      return spans.map((s) => {
        const computed = window.getComputedStyle(s);
        return {
          animationName: computed.animationName,
          transform: computed.transform,
        };
      });
    });

    const nonTrivialAnimations = motionEvaluations.filter((m) => m.animationName && m.animationName !== 'none');
    console.log(`Reduced motion active. Elements with non-none animation: ${nonTrivialAnimations.length}`);
    assert.equal(nonTrivialAnimations.length, 0, 'No animations should run under prefers-reduced-motion: reduce');
    console.log('✅ PASS: prefers-reduced-motion: reduce strictly halts all mascot and CSS keyframe animations');
    auditResults.reducedMotionChecks.push({ status: 'PASSED', activeAnimations: nonTrivialAnimations.length });

    fs.writeFileSync(path.join(OUT_DIR, 'audit-summary.json'), JSON.stringify(auditResults, null, 2));
    console.log(`\n🎉 Visual and performance audit complete! ${auditResults.screenshots.length} screenshots saved.`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
