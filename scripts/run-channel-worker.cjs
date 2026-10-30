// Run once from a scheduler every minute. Secrets are never printed.
const origin = process.env.APP_URL || process.env.BETTER_AUTH_URL;
const secret = process.env.CRON_SECRET;
if (!origin || !secret) throw new Error('APP_URL and CRON_SECRET are required');
const url = new URL('/api/cron/channel-events', origin);
if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('HTTPS is required');
fetch(url, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(65_000) })
  .then(async (response) => { if (!response.ok) throw new Error(`Worker returned HTTP ${response.status}`); const result = await response.json(); console.log(`Processed: ${result.processed}`); })
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
