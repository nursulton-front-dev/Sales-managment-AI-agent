const assert = require('node:assert/strict');
const load = require('../scripts/helpers/load-typescript.cjs')();
const { getCompanyDateContext } = load('lib/calendar/working-hours.ts');

const tashkent = getCompanyDateContext(new Date('2026-11-15T20:30:00Z'), 'Asia/Tashkent');
assert.equal(tashkent.today, '2026-11-16');
assert.equal(tashkent.nextMonday, '2026-11-23');

const newYork = getCompanyDateContext(new Date('2026-11-16T02:00:00Z'), 'America/New_York');
assert.equal(newYork.today, '2026-11-15');
assert.equal(newYork.nextMonday, '2026-11-16');

const dst = getCompanyDateContext(new Date('2027-03-13T17:00:00Z'), 'America/New_York');
assert.equal(dst.today, '2027-03-13');
assert.equal(dst.nextMonday, '2027-03-15');
console.log('PASS: company dates follow local calendar days and cross DST');
