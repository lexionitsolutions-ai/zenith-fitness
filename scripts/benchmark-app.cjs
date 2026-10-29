// Read-only HTTP timings. Session tokens and member responses stay in memory.
process.env.NODE_ENV = 'production';
require('@next/env').loadEnvConfig(process.cwd(), false);
const { PrismaClient } = require('@prisma/client');
const { SignJWT } = require('jose');
const { writeFileSync } = require('node:fs');
const argument = (name) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const origin = new URL(argument('origin') || 'http://localhost:3000').origin;
const allowed = ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://zenith-fitness-theta.vercel.app'];
if (!allowed.includes(origin)) throw new Error('Benchmark origin must be localhost or the configured production app.');
const publicOnly = process.argv.includes('--public');
if (!publicOnly && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required.');
const db = new PrismaClient();
const staffMode = process.argv.includes('--staff');
let testAdmissionId;
let routes = publicOnly ? ['/login', '/api/health', '/brand/icon-192.png'] : ['/api/member/dashboard', '/api/member/points', '/', '/dashboard', '/points', '/workout', '/schedule'];
async function main() {
  const user = publicOnly ? null : await db.user.findFirst({ where: staffMode ? { role: 'STAFF', isActive: true } : { role: 'MEMBER', isActive: true, memberId: { not: null } }, orderBy: { id: 'asc' }, select: { id: true, memberId: true, role: true } });
  if (!publicOnly && !user) throw new Error('An active member is required for read-only timings.');
  if (staffMode) {
    const member = await db.member.findFirst({ where: { qrCodeActive: true }, orderBy: { id: 'asc' }, select: { admissionId: true } });
    if (!member) throw new Error('A member with an active QR is required.');
    testAdmissionId = member.admissionId;
    routes = ['/staff', '/staff/members', '/staff/progress', '/staff/points', `/api/staff/member?q=${encodeURIComponent(member.admissionId)}`, `/api/staff/scan?qrToken=${encodeURIComponent(member.admissionId)}`];
  }
  const token = publicOnly ? null : await new SignJWT({ userId: user.id, memberId: user.memberId, role: user.role })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m')
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  const request = async (path) => {
    const start = performance.now();
    const response = await fetch(origin + path, { headers: token ? { cookie: `zenith_session=${token}` } : {}, redirect: 'manual', signal: AbortSignal.timeout(60000) });
    const ttfbMs = Math.round(performance.now() - start);
    const body = await response.text();
    const totalMs = Math.round(performance.now() - start);
    let ok = path === '/' ? (response.status === 307 && response.headers.get('location')?.endsWith('/dashboard')) || (response.status === 200 && body.includes('/dashboard') && body.includes('NEXT_REDIRECT')) : response.status === 200 && (path.startsWith('/api/') || (!body.includes('NEXT_REDIRECT') && !/digest.{0,8}[0-9]{6}/.test(body)));
    if (ok && staffMode && path.startsWith('/api/staff/')) {
      const payload = JSON.parse(body);
      ok = payload.success === true && payload.data?.admissionId === testAdmissionId;
    }
    if (!ok) throw new Error(`Unexpected response for ${path.split('?')[0]}: HTTP ${response.status}`);
    return { status: response.status, ttfbMs, totalMs, bytes: Buffer.byteLength(body) };
  };
  const results = [];
  for (const path of routes) {
    const first = await request(path);
    const warmed = [];
    for (let i = 0; i < 3; i++) warmed.push(await request(path));
    const median = field => [...warmed].sort((a, b) => a[field] - b[field])[1][field];
    results.push({ path: path.split('?')[0], status: first.status, firstTtfbMs: first.ttfbMs, firstTotalMs: first.totalMs, medianTtfbMs: median('ttfbMs'), medianTotalMs: median('totalMs') });
    console.log(JSON.stringify(results.at(-1)));
  }
  const start = performance.now();
  await Promise.all((publicOnly ? routes : staffMode ? routes.slice(0, 4) : ['/dashboard', '/points', '/workout', '/schedule']).map(request));
  const report = { origin, measuredAt: new Date().toISOString(), kind: `${publicOnly ? 'Public' : staffMode ? 'Authenticated staff' : 'Authenticated member'} HTTP timings; excludes browser rendering and hydration`, rounds: 3, results, concurrentNavigationMs: Math.round(performance.now() - start) };
  if (staffMode) {
    const member = await db.user.findFirst({ where: { role: 'MEMBER', isActive: true }, select: { id: true, memberId: true, role: true } });
    if (!member) throw new Error('A member account is required for the staff access check.');
    const memberToken = await new SignJWT({ userId: member.id, memberId: member.memberId, role: member.role }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('5m').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
    for (const path of routes.filter(path => path.startsWith('/api/staff/'))) {
      const response = await fetch(origin + path, { headers: { cookie: `zenith_session=${memberToken}` }, redirect: 'manual', signal: AbortSignal.timeout(60000) });
      await response.text();
      if (response.status !== 403) throw new Error('Member account was not denied staff API access.');
    }
    report.memberAccessDenied = true;
    report.authorizedRole = user.role;
  }
  if (argument('output')) writeFileSync(argument('output'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ concurrentNavigationMs: report.concurrentNavigationMs, successful: true }));
}
main().catch(error => { console.error('Benchmark failed:', error.code || error.message.replace(/zenith_session=[^\s]+/g, '[redacted]')); process.exitCode = 1; }).finally(() => db.$disconnect());
