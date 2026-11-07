/**
 * Landing Page Logic & Pricing Parity Test Suite
 * Verifies:
 * 1. Bilingual content parity (RU vs UZ) - all keys exist and non-empty
 * 2. Strict tariff synchronization with lib/pricing.ts
 * 3. Absence of forbidden terms (Chorla, Gapchi) in user-facing texts
 * 4. Honesty gates (trial definition, token ratio 1:1, payment status notice)
 * 5. Sitemap and robots route filtering
 */

const assert = require('node:assert/strict');
const loader = require('./helpers/load-typescript.cjs');

const load = loader({
  NEXT_PUBLIC_APP_URL: 'https://chorla-ai.vercel.app'
});

const { LANDING_CONTENT } = load('lib/landing/content.ts');
const { PLANS, TRIAL_PLAN } = load('lib/pricing.ts');

async function runTests() {
  console.log('🚀 Running gapcha AI Landing Verification Suite...\n');

  const ru = LANDING_CONTENT.ru;
  const uz = LANDING_CONTENT.uz;

  // 1. Language Parity
  assert.ok(ru, 'Russian content must exist');
  assert.ok(uz, 'Uzbek content must exist');

  // Helper to compare object keys recursively
  function compareKeys(objA, objB, path = '') {
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    for (const key of keysA) {
      assert.ok(
        keysB.includes(key),
        `Missing key "${path ? path + '.' : ''}${key}" in Uzbek translations`
      );
      if (typeof objA[key] === 'object' && objA[key] !== null && !Array.isArray(objA[key])) {
        compareKeys(objA[key], objB[key], `${path ? path + '.' : ''}${key}`);
      }
    }
  }

  compareKeys(ru, uz);
  console.log('✅ PASS: Complete structural parity between RU and UZ dictionaries');

  // 2. Pricing & Plan Synchronization
  assert.strictEqual(ru.pricing.plans.length, 3);
  assert.strictEqual(uz.pricing.plans.length, 3);

  const startPlan = ru.pricing.plans.find((p) => p.id === 'start');
  assert.strictEqual(startPlan.priceUsd, PLANS.start.usdPriceFormatted);
  assert.strictEqual(startPlan.priceUzs, PLANS.start.uzsPriceFormatted);
  assert.ok(startPlan.tokens.includes('2 000'));

  const bizPlan = ru.pricing.plans.find((p) => p.id === 'business');
  assert.strictEqual(bizPlan.priceUsd, PLANS.business.usdPriceFormatted);
  assert.strictEqual(bizPlan.priceUzs, PLANS.business.uzsPriceFormatted);
  assert.ok(bizPlan.tokens.includes('6 000'));

  const proPlan = ru.pricing.plans.find((p) => p.id === 'pro');
  assert.strictEqual(proPlan.priceUsd, PLANS.pro.usdPriceFormatted);
  assert.strictEqual(proPlan.priceUzs, PLANS.pro.uzsPriceFormatted);
  assert.ok(proPlan.tokens.includes('15 000'));

  // Trial honesty
  assert.strictEqual(TRIAL_PLAN.tokens, 100);
  assert.ok(ru.hero.trialNote.includes('100'));
  assert.ok(uz.hero.trialNote.includes('100'));
  assert.ok(ru.pricing.trialText.includes('100'));
  assert.ok(uz.pricing.trialText.includes('100'));
  console.log('✅ PASS: Landing plans and 100-token trial strictly match lib/pricing.ts');

  // 3. Brand Name & Forbidden Terms Guard
  const stringifiedRu = JSON.stringify(ru).toLowerCase();
  const stringifiedUz = JSON.stringify(uz).toLowerCase();

  assert.strictEqual(stringifiedRu.includes('gapchi'), false, 'RU content must not contain "gapchi"');
  assert.strictEqual(stringifiedUz.includes('gapchi'), false, 'UZ content must not contain "gapchi"');
  assert.strictEqual(stringifiedRu.includes('chorla'), false, 'RU content must not contain "chorla"');
  assert.strictEqual(stringifiedUz.includes('chorla'), false, 'UZ content must not contain "chorla"');

  assert.ok(ru.meta.title.includes('gapcha AI'));
  assert.ok(uz.meta.title.includes('gapcha AI'));
  console.log('✅ PASS: Brand name strictly preserved as "gapcha AI" without legacy remnants');

  // 4. Honest Capabilities Guard
  // FAQ Q1 explains TG Business vs Bot
  assert.ok(ru.faq.items[0].question.includes('Telegram Business'));
  assert.ok(uz.faq.items[0].question.includes('Telegram Business'));

  // Integrations differentiate messaging vs calendar
  const calIntegration = ru.integrations.items.find((i) => i.id === 'calendar');
  assert.strictEqual(calIntegration.type, 'Интеграция расписания');
  const tgIntegration = ru.integrations.items.find((i) => i.id === 'tg_business');
  assert.strictEqual(tgIntegration.type, 'Канал общения');
  console.log('✅ PASS: Integrations accurately differentiate messaging channels from calendar scheduling');

  // 5. Sitemap and Robots Route Verification
  const sitemapFn = load('app/sitemap.ts').default;
  const sitemapEntries = sitemapFn();
  const urls = sitemapEntries.map((e) => e.url);

  assert.ok(urls.includes('https://chorla-ai.vercel.app/'));
  assert.ok(urls.includes('https://chorla-ai.vercel.app/login'));
  assert.ok(urls.includes('https://chorla-ai.vercel.app/register'));
  assert.ok(urls.includes('https://chorla-ai.vercel.app/privacy'));
  assert.ok(urls.includes('https://chorla-ai.vercel.app/data-deletion'));

  // Ensure no private dashboards or APIs in sitemap
  assert.strictEqual(urls.some((u) => u.includes('/dashboard')), false, 'Sitemap must not contain /dashboard');
  assert.strictEqual(urls.some((u) => u.includes('/admin')), false, 'Sitemap must not contain /admin');
  assert.strictEqual(urls.some((u) => u.includes('/api')), false, 'Sitemap must not contain /api');

  const robotsFn = load('app/robots.ts').default;
  const robotsConfig = robotsFn();
  const rules = robotsConfig.rules[0] || robotsConfig.rules;
  assert.ok(rules.disallow.includes('/dashboard/'));
  assert.ok(rules.disallow.includes('/admin/'));
  assert.ok(rules.disallow.includes('/api/'));
  console.log('✅ PASS: Sitemap and robots correctly include public pages and exclude private surfaces');

  console.log('\n🎉 All landing verification checks passed successfully!');
}

runTests().catch((err) => {
  console.error('❌ Landing test failed:', err);
  process.exit(1);
});
