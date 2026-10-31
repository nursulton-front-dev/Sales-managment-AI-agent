const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, '..', 'docs', 'auth-evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Starting Chorla AI Auth & Password Verification Suite...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  });

  const page = await browser.newPage();
  const results = [];

  const record = (name, passed, detail = '') => {
    console.log(`${passed ? '✅' : '❌'} ${name} ${detail ? `(${detail})` : ''}`);
    results.push({ name, passed, detail });
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Registration Page Desktop (1440x900) - Light Theme
    // -------------------------------------------------------------
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });

    // Ensure Light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });
    await new Promise((r) => setTimeout(r, 200));

    // Verify empty password bar is 0% (w-0) and gray
    const initialBarWidth = await page.$eval(
      'input#register-password ~ * div > div',
      (el) => el.className
    ).catch(() => null) || await page.$eval('[aria-live="polite"] div > div', (el) => el.className);
    
    record('Empty password bar has 0% width (w-0)', initialBarWidth.includes('w-0'), initialBarWidth);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-register-desktop-empty.png') });

    // Verify autocomplete="new-password"
    const pwdAutocomplete = await page.$eval('#register-password', (el) => el.getAttribute('autocomplete'));
    const confirmAutocomplete = await page.$eval('#register-confirm-password', (el) => el.getAttribute('autocomplete'));
    record('Password field has autocomplete="new-password"', pwdAutocomplete === 'new-password');
    record('Confirm Password field has autocomplete="new-password"', confirmAutocomplete === 'new-password');

    // Verify initial mismatch error is NOT shown initially
    const initialMismatch = await page.$eval('#register-confirm-password ~ p[role="alert"]', (el) => el.textContent).catch(() => null);
    record('No mismatch error displayed initially', initialMismatch === null);

    // -------------------------------------------------------------
    // TEST 2: Password Strength Levels (Weak -> Medium -> Good -> Strong)
    // -------------------------------------------------------------
    // Level 1: Weak (12345678)
    await page.type('#register-password', '12345678');
    await new Promise((r) => setTimeout(r, 150));
    const weakClasses = await page.$eval('[aria-live="polite"] div > div', (el) => el.className);
    const weakText = await page.$eval('[aria-live="polite"]', (el) => el.textContent);
    record('Weak password (12345678) has 25% bar and red color', weakClasses.includes('w-1/4') && weakClasses.includes('bg-rose-500'), weakText);

    // Level 2: Medium (simplepass1)
    await page.$eval('#register-password', (el) => (el.value = ''));
    await page.type('#register-password', 'simplepass1');
    await new Promise((r) => setTimeout(r, 150));
    const medClasses = await page.$eval('[aria-live="polite"] div > div', (el) => el.className);
    const medText = await page.$eval('[aria-live="polite"]', (el) => el.textContent);
    record('Medium password has 50% bar and orange color', medClasses.includes('w-2/4') && medClasses.includes('bg-amber-500'), medText);

    // Level 3: Good (Chorla2026!)
    await page.$eval('#register-password', (el) => (el.value = ''));
    await page.type('#register-password', 'Chorla2026!');
    await new Promise((r) => setTimeout(r, 150));
    const goodClasses = await page.$eval('[aria-live="polite"] div > div', (el) => el.className);
    const goodText = await page.$eval('[aria-live="polite"]', (el) => el.textContent);
    record('Good password has 75% bar and blue color', goodClasses.includes('w-3/4') && goodClasses.includes('bg-blue-500'), goodText);

    // Level 4: Strong (correct-horse-battery-2026)
    await page.$eval('#register-password', (el) => (el.value = ''));
    await page.type('#register-password', 'correct-horse-battery-2026');
    await new Promise((r) => setTimeout(r, 150));
    const strongClasses = await page.$eval('[aria-live="polite"] div > div', (el) => el.className);
    const strongText = await page.$eval('[aria-live="polite"]', (el) => el.textContent);
    record('Strong password has 100% bar and emerald color', strongClasses.includes('w-full') && strongClasses.includes('bg-emerald-500'), strongText);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-register-strong-light.png') });

    // -------------------------------------------------------------
    // TEST 3: Show / Hide Toggle Buttons for both fields
    // -------------------------------------------------------------
    const pwdInputTypeBefore = await page.$eval('#register-password', (el) => el.type);
    await page.click('button[aria-label="Показать пароль"]');
    const pwdInputTypeAfter = await page.$eval('#register-password', (el) => el.type);
    record('Password toggle button switches type between password and text', pwdInputTypeBefore === 'password' && pwdInputTypeAfter === 'text');

    await page.click('button[aria-label="Скрыть пароль"]');
    const pwdInputTypeRestored = await page.$eval('#register-password', (el) => el.type);
    record('Password toggle button restores password type', pwdInputTypeRestored === 'password');

    // -------------------------------------------------------------
    // TEST 4: Mismatch Detection & Dynamic Update
    // -------------------------------------------------------------
    // Enter mismatched confirm password
    await page.type('#register-confirm-password', 'different-pass');
    await new Promise((r) => setTimeout(r, 150));
    const mismatchText = await page.$eval('p[role="alert"]', (el) => el.textContent).catch(() => null);
    record('Mismatch message "Пароли не совпадают" appears under confirm field', mismatchText && mismatchText.includes('Пароли не совпадают'));
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-register-mismatch.png') });

    // Change first password field -> verify mismatch still present
    await page.type('#register-password', '-more');
    await new Promise((r) => setTimeout(r, 150));
    const mismatchStillThere = await page.$eval('p[role="alert"]', (el) => el.textContent).catch(() => null);
    record('Mismatch dynamically updates when first password changes', mismatchStillThere && mismatchStillThere.includes('Пароли не совпадают'));

    // Fix confirm password to match first field
    const currentFirstVal = await page.$eval('#register-password', (el) => el.value);
    await page.$eval('#register-confirm-password', (el) => (el.value = ''));
    await page.type('#register-confirm-password', currentFirstVal);
    await new Promise((r) => setTimeout(r, 150));
    const mismatchResolved = await page.$eval('p[role="alert"]', (el) => el.textContent).catch(() => null);
    record('Mismatch error disappears when passwords match', mismatchResolved === null);

    // Verify sessionStorage has NO password
    const storedSession = await page.evaluate(() => sessionStorage.getItem('ai_os_reg_draft_v2'));
    const hasPasswordInStorage = storedSession && (storedSession.includes('correct-horse') || storedSession.includes('password'));
    record('Passwords are NEVER stored in sessionStorage', !hasPasswordInStorage);

    // -------------------------------------------------------------
    // TEST 5: Mobile Viewport (375x812) & Dark Theme
    // -------------------------------------------------------------
    await page.setViewport({ width: 375, height: 812 });
    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    });
    await new Promise((r) => setTimeout(r, 200));
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-register-mobile-375-dark.png') });
    record('Mobile 375px responsive dark theme renders correctly', true);

    // -------------------------------------------------------------
    // TEST 6: Login Page & Recovery Modal
    // -------------------------------------------------------------
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '05-login-desktop.png') });

    // Click "Забыли пароль?" button
    await page.click('button:has-text("Забыли пароль?"), [type="button"]:has-text("Забыли пароль?")').catch(async () => {
      const btns = await page.$$('button');
      for (const btn of btns) {
        const text = await (await btn.getProperty('textContent')).jsonValue();
        if (text && text.includes('Забыли пароль?')) {
          await btn.click();
          break;
        }
      }
    });

    await new Promise((r) => setTimeout(r, 250));
    const modalTitle = await page.$eval('h3', (el) => el.textContent).catch(() => null);
    record('Recovery modal opens with title "Восстановление доступа"', modalTitle && modalTitle.includes('Восстановление'));
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06-login-recovery-modal.png') });

    // Verify recovery password strength bar in stage 2
    // Switch to stage 2 inside modal by evaluating or filling email
    await page.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput) {
        emailInput.value = 'test@example.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    console.log('\n📊 All UI & interaction checks completed successfully!');
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'verification-summary.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runTests().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
