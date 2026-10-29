// Actual mobile-sized browser navigation against localhost; read-only.
process.env.NODE_ENV = 'production';
require('@next/env').loadEnvConfig(process.cwd(), false);
const { chromium } = require('../.zee-qa/browser-tools/node_modules/playwright');
const { PrismaClient } = require('@prisma/client');
const { SignJWT } = require('jose');
const { writeFileSync } = require('node:fs');
const db = new PrismaClient();
let browser;
async function main() {
  const user = await db.user.findFirst({ where: { role: 'MEMBER', isActive: true, memberId: { not: null } }, orderBy: { id: 'asc' }, select: { id: true, memberId: true, role: true } });
  if (!user || !process.env.SESSION_SECRET) throw new Error('Existing local member and signing key required.');
  const token = await new SignJWT({ userId: user.id, memberId: user.memberId, role: user.role }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('10m').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await context.addCookies([{ name: 'zenith_session', value: token, url: 'http://localhost:3000', httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const requests = [];
  page.on('request', request => {
    if (request.headers().rsc === '1') requests.push({ path: new URL(request.url()).pathname, at: performance.now() });
  });
  const ready = () => page.locator('main:not([aria-busy="true"])').first().waitFor({ state: 'visible' });
  await page.goto('http://localhost:3000/dashboard');
  await ready();
  await page.waitForFunction(() => Boolean(window.next));
  const results = [];
  for (const path of ['/points', '/dashboard', '/points', '/workout', '/dashboard', '/workout', '/diet-consultation', '/dashboard', '/points']) {
    console.log(JSON.stringify({ tapping: path }));
    const start = performance.now();
    await page.locator(`nav[aria-label="Member navigation"] a[href="${path}"]`).last().tap();
    await page.waitForURL(url => url.pathname === path);
    await ready();
    const contentMs = Math.round(performance.now() - start);
    const result = { path, contentMs, destinationRscRequests: requests.filter(request => request.at >= start && request.path === path).length };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  const checks = {};
  if (process.argv.includes('--verify-cache')) {
    // Confirm expiry and explicit refresh still retrieve fresh server content.
    console.log('Checking cache expiry after 31 seconds');
    await page.waitForTimeout(31000);
    const expiredStart = performance.now();
    await page.locator('nav[aria-label="Member navigation"] a[href="/dashboard"]').last().tap();
    await page.waitForURL(url => url.pathname === '/dashboard');
    await ready();
    checks.expiredPageFetched = requests.some(request => request.at >= expiredStart && request.path === '/dashboard');
    console.log(JSON.stringify({ expiredPageFetched: checks.expiredPageFetched }));
    const refreshed = page.waitForResponse(response => response.request().headers().rsc === '1' && new URL(response.url()).pathname === '/dashboard');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await refreshed;
    checks.explicitRefreshFetched = true;
    console.log('Explicit refresh response received');
    const afterRefreshStart = performance.now();
    await page.locator('nav[aria-label="Member navigation"] a[href="/points"]').last().tap();
    await page.waitForURL(url => url.pathname === '/points');
    await ready();
    checks.refreshInvalidatedOtherTabs = requests.some(request => request.at >= afterRefreshStart && request.path === '/points');
    await page.locator('nav[aria-label="Member navigation"] a[href="/dashboard"]').last().tap();
    await page.waitForURL(url => url.pathname === '/dashboard');
    await ready();
    console.log(JSON.stringify({ refreshInvalidatedOtherTabs: checks.refreshInvalidatedOtherTabs }));
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/login');
    console.log('Checking back navigation after logout');
    await page.goBack();
    await page.waitForURL(url => url.pathname === '/login');
    checks.logoutBlocksCachedMemberPages = await page.locator('svg[height="210"]').count() === 0;
    if (Object.values(checks).some(value => !value)) throw new Error('Navigation cache correctness check failed.');
    console.log(JSON.stringify({ cacheChecks: checks }));
  }
  const report = { checks, measuredAt: new Date().toISOString(), method: 'Headless Edge, mobile viewport and touch; actual tab taps until main content is visible; existing member; no mutations', results };
  const output = process.argv.find(value => value.startsWith('--output='))?.slice(9);
  if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
}
main().catch(error => { console.error('Navigation test failed:', error.code || error.name, String(error.message).split('\n')[0]); process.exitCode = 1; }).finally(async () => { await browser?.close(); await db.$disconnect(); });
