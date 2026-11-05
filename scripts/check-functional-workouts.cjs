// End-to-end QA uses newly created synthetic accounts only, never a real member's session.
// Test-created batches/accounts are removed by exact captured IDs in finally.
const origin = process.argv.find(value => value.startsWith('--origin='))?.slice(9) || 'http://127.0.0.1:3100';
if (!['http://127.0.0.1:3100', 'https://zenith-fitness-theta.vercel.app'].includes(origin)) throw new Error('Use the local QA server or the confirmed Zenith app origin.');
require('@next/env').loadEnvConfig(process.cwd(), origin.startsWith('http://127.0.0.1'));
const { PrismaClient } = require('@prisma/client');
const { chromium } = require('../.zee-qa/browser-tools/node_modules/playwright');
const bcrypt = require('bcryptjs');
const { randomUUID, randomInt } = require('node:crypto');
const { mkdirSync, writeFileSync } = require('node:fs');
const db = new PrismaClient();
const accounts = [];
const videoIds = [];
const checks = {};
let browser;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function main() {
  mkdirSync('output/functional-qa', { recursive: true });
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  for (const role of ['STAFF', 'ADMIN', 'MEMBER']) {
    const pin = randomUUID();
    const account = await db.user.create({ data: { mobileNumber: `+919${randomInt(100000000, 999999999)}`,
      displayName: `Functional QA ${role} ${Date.now()}`, pinHash: await bcrypt.hash(pin, 10), role, mustChangePassword: false } });
    accounts.push(account);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const login = await context.request.post(`${origin}/api/auth/login`, { data: { mobile: account.mobileNumber, pin } });
    assert(login.ok(), `${role} synthetic account login failed (${login.status()})`);
    account.context = context;
  }
  const staff = accounts[0], admin = accounts[1], member = accounts[2];
  const anonymous = await browser.newContext();
  assert((await anonymous.request.get(`${origin}/api/workout/functional`)).status() === 401, 'Anonymous read must require login');
  assert((await anonymous.request.post(`${origin}/api/workout/functional`, { data: {} })).status() === 401, 'Anonymous creation must require login');
  checks.anonymousAccessDenied = true;

  const staffPage = await staff.context.newPage();
  staffPage.setDefaultTimeout(60000);
  await staffPage.goto(`${origin}/workout?mode=functional`);
  await staffPage.getByRole('heading', { name: 'Functional batches', exact: true }).waitFor();
  await staffPage.getByRole('button', { name: 'Add video', exact: true }).click();
  await staffPage.getByLabel('Exercise / video name', { exact: true }).fill('QA trainer video clip');
  await staffPage.getByLabel('YouTube or MP4 link', { exact: true }).fill('https://youtu.be/LBp7ez0VzaI?feature=shared');
  await staffPage.getByLabel('Clip start (seconds)', { exact: true }).fill('35');
  await staffPage.getByLabel('Clip end (optional)', { exact: true }).fill('40');
  await staffPage.getByLabel('Remove black sidebars for portrait footage').check();
  const videoSaved = staffPage.waitForResponse(response => response.url().endsWith('/api/workout/functional/videos') && response.request().method() === 'POST');
  await staffPage.getByRole('button', { name: 'Save video', exact: true }).click();
  const savedVideo = await videoSaved;
  assert(savedVideo.status() === 201, 'Trainer video creation must succeed');
  videoIds.push((await savedVideo.json()).data.id);
  await staffPage.getByRole('status').filter({ hasText: 'Video saved' }).waitFor();
  const clip = await db.functionalExercise.findUnique({ where: { id: videoIds[0] } });
  assert(clip.videoStartSeconds === 35 && clip.videoEndSeconds === 40 && clip.videoLayout === 'CENTER_CROP', 'Trainer video clip settings must persist');
  checks.trainerCanSaveOwnVideoClips = true;
  await staffPage.getByRole('button', { name: 'Create batch', exact: true }).click();
  await staffPage.getByLabel('Batch name').fill('QA trainer functional circuit');
  await staffPage.getByLabel('Rounds', { exact: true }).fill('1');
  await staffPage.getByRole('button', { name: 'Jump Squats', exact: true }).click();
  await staffPage.getByRole('button', { name: 'Mountain Climbers', exact: true }).click();
  const workInputs = staffPage.getByLabel('Work (sec)', { exact: true });
  const restInputs = staffPage.getByLabel('Rest (sec)', { exact: true });
  for (let i = 0; i < 2; i++) { await workInputs.nth(i).fill('5'); await restInputs.nth(i).fill('0'); }
  for (let i = 0; i < 2; i++) {
    await staffPage.getByLabel('Reps (optional)', { exact: true }).nth(i).fill('4');
    await staffPage.getByLabel('Reps per second', { exact: true }).nth(i).fill('1');
  }
  await staffPage.getByRole('button', { name: 'Move exercise 2 up', exact: true }).click();
  await staffPage.screenshot({ path: 'output/functional-qa/trainer-create-mobile.png', fullPage: true });
  const savedResponse = staffPage.waitForResponse(response => response.url().endsWith('/api/workout/functional') && response.request().method() === 'POST');
  await staffPage.getByRole('button', { name: 'Save batch', exact: true }).click();
  const saved = await savedResponse;
  assert(saved.status() === 201, `Trainer save failed (${saved.status()})`);
  const batchId = (await saved.json()).data.id;
  await staffPage.getByRole('status').filter({ hasText: 'Batch saved' }).waitFor();
  checks.trainerCanCreateThroughInterface = true;
  await staffPage.reload();
  await staffPage.getByRole('heading', { name: 'QA trainer functional circuit', exact: true }).waitFor();
  const persisted = await db.functionalBatch.findUnique({ where: { id: batchId }, include: { exercises: { orderBy: { sortOrder: 'asc' }, include: { exercise: true } } } });
  assert(persisted.createdById === staff.id && persisted.exercises[0].exercise.slug === 'mountain-climbers', 'Batch creator and reordered exercises must persist');
  assert(persisted.exercises.every(item => item.repsPerSecond === 1 && item.repetitions === 4), 'Rep targets and reps per second must persist');
  checks.repSettingsPersist = true;
  checks.batchPersistsAfterReloadWithExactOrder = true;

  const library = await db.functionalExercise.findMany({ where: { active: true } });
  const adminSave = await admin.context.request.post(`${origin}/api/workout/functional`, { data: { title: 'QA admin batch', rounds: 1, exercises: [{ exerciseId: library[0].id, workSeconds: 5, restSeconds: 0 }] } });
  assert(adminSave.status() === 201, `Admin create failed (${adminSave.status()})`);
  const adminPage = await admin.context.newPage();
  await adminPage.goto(`${origin}/workout?mode=functional`);
  await adminPage.getByRole('button', { name: 'Create batch', exact: true }).waitFor();
  await adminPage.getByRole('heading', { name: 'QA trainer functional circuit', exact: true }).waitFor();
  checks.adminCanViewAndCreate = true;

  const memberPage = await member.context.newPage();
  memberPage.setDefaultTimeout(60000);
  await memberPage.goto(`${origin}/workout?mode=functional`);
  await memberPage.getByRole('heading', { name: 'QA trainer functional circuit', exact: true }).waitFor();
  assert(await memberPage.getByRole('button', { name: 'Create batch', exact: true }).count() === 0, 'Member must not get creation controls');
  assert(await memberPage.getByRole('button', { name: 'Add video', exact: true }).count() === 0, 'Member must not get video creation controls');
  assert((await member.context.request.post(`${origin}/api/workout/functional/videos`, { data: { name: 'Forbidden video', videoUrl: 'https://youtu.be/LBp7ez0VzaI' } })).status() === 403, 'Member video creation must be denied');
  const memberWrite = await member.context.request.post(`${origin}/api/workout/functional`, { data: { title: 'Forbidden batch', exercises: [{ exerciseId: library[0].id }] } });
  assert(memberWrite.status() === 403, 'Member API writes must be denied');
  checks.memberCanSeeSavedBatchButCannotCreate = true;
  await memberPage.screenshot({ path: 'output/functional-qa/member-batches-mobile.png', fullPage: true });
  const card = memberPage.getByRole('article').filter({ has: memberPage.getByRole('heading', { name: 'QA trainer functional circuit', exact: true }) });
  await card.getByRole('button', { name: 'Play batch', exact: true }).click();
  const player = memberPage.getByRole('dialog');
  await player.waitFor();
  assert(await player.locator('[data-testid="portrait-player"]').evaluate(el => el.clientHeight > el.clientWidth), 'Workout player must be portrait');
  checks.portraitVideoPlayer = true;
  await player.getByRole('button', { name: 'Start workout', exact: true }).click();
  await memberPage.waitForFunction(() => { const v = document.querySelector('[role="dialog"] video'); return v && v.readyState >= 2 && v.videoWidth > 0 && v.currentTime > 0; });
  checks.memberVideoDecodesAndPlays = true;
  await memberPage.waitForFunction(() => Number(document.querySelector('output[aria-label="Paced rep count"]')?.textContent) >= 1);
  await player.getByRole('button', { name: 'Pause workout', exact: true }).click();
  const pausedCount = await player.getByLabel('Paced rep count', { exact: true }).textContent();
  await memberPage.waitForTimeout(500);
  assert(await player.getByLabel('Paced rep count', { exact: true }).textContent() === pausedCount, 'Paused counter must not advance');
  await player.getByLabel('Playback reps per second', { exact: true }).fill('2');
  assert(await player.getByLabel('Paced rep count', { exact: true }).textContent() === pausedCount, 'Pace change must preserve already counted reps');
  checks.repCounterPauseAndCustomPace = true;
  await memberPage.screenshot({ path: 'output/functional-qa/member-player-mobile.png' });
  await player.getByRole('button', { name: 'Start workout', exact: true }).click();
  await player.getByRole('heading', { name: 'Batch complete', exact: true }).waitFor({ timeout: 20000 });
  checks.circuitAdvancesAndCompletes = true;
  await player.getByRole('button', { name: 'Close player', exact: true }).click();
  const sourceCard = memberPage.getByRole('article').filter({ has: memberPage.getByRole('heading', { name: 'Lakhan Functional Session', exact: true }) });
  await sourceCard.getByRole('button', { name: 'Play batch', exact: true }).click();
  const sourcePlayer = memberPage.getByRole('dialog');
  const sourceFrame = sourcePlayer.locator('iframe[title="Lakhan Functional Video demonstration"]');
  await sourceFrame.waitFor();
  assert((await sourceFrame.getAttribute('src')).includes('LBp7ez0VzaI'), 'Supplied trainer video must be rendered');
  const linkedVideo = sourcePlayer.frameLocator('iframe').locator('video');
  await linkedVideo.waitFor({ timeout: 30000 });
  await sourcePlayer.getByRole('button', { name: 'Start workout', exact: true }).click();
  await linkedVideo.evaluate(video => new Promise((resolve, reject) => {
    const timer = setInterval(() => { if (!video.paused && video.currentTime > 0 && video.videoWidth > 0) { clearInterval(timer); resolve(true); } }, 100);
    setTimeout(() => { clearInterval(timer); reject(new Error('Linked trainer video did not play')); }, 20000);
  }));
  checks.linkedTrainerVideoActuallyPlays = true;
  await sourcePlayer.getByRole('button', { name: 'Pause workout', exact: true }).click();
  await linkedVideo.evaluate(video => new Promise((resolve, reject) => {
    const timer = setInterval(() => { if (video.paused) { clearInterval(timer); resolve(true); } }, 100);
    setTimeout(() => { clearInterval(timer); reject(new Error('Linked trainer video did not pause')); }, 10000);
  }));
  await memberPage.screenshot({ path: 'output/functional-qa/lakhan-player-mobile.png' });
  checks.linkedTrainerVideoRendered = true;
  await sourcePlayer.getByRole('button', { name: 'Close player', exact: true }).click();
  await memberPage.getByRole('navigation', { name: 'Workout type', exact: true }).getByRole('link', { name: 'Weight Training', exact: true }).click();
  await memberPage.getByRole('heading', { name: 'Choose your workout card', exact: true }).waitFor();
  checks.weightTrainingToggleStillWorks = true;
  await memberPage.getByRole('navigation', { name: 'Workout type', exact: true }).getByRole('link', { name: 'Functional Batch', exact: true }).click();
  await memberPage.getByRole('heading', { name: 'Functional batches', exact: true }).waitFor();
  assert(await memberPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile must not scroll horizontally');
  checks.mobileFitsViewport = true;
  await memberPage.setViewportSize({ width: 1440, height: 1000 });
  await memberPage.screenshot({ path: 'output/functional-qa/member-batches-desktop.png', fullPage: true });
  const mediaPage = await member.context.newPage();
  await mediaPage.goto(`${origin}/workout?mode=functional`);
  const media = [];
  for (const exercise of library.filter(item => item.videoUrl.startsWith('/workouts/functional/'))) {
    const result = await mediaPage.evaluate(async url => {
      const video = document.createElement('video'); video.preload = 'metadata'; video.muted = true; video.src = url;
      document.body.append(video);
      try { await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = () => reject(new Error('decode failed')); setTimeout(() => reject(new Error('metadata timeout')), 15000); }); return { ok: video.videoWidth > 0, duration: video.duration }; }
      catch { return { ok: false }; } finally { video.remove(); }
    }, exercise.videoUrl);
    media.push({ slug: exercise.slug, ...result });
  }
  assert(media.every(item => item.ok), 'All imported named media must decode');
  checks.allImportedVideosDecode = media.length;
  const report = { checkedAt: new Date().toISOString(), origin, method: 'Isolated headless Edge, real login for new synthetic STAFF/ADMIN/MEMBER fixtures; only fixture-created data removed', checks, media };
  writeFileSync('output/functional-qa/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  const ids = accounts.map(account => account.id);
  if (ids.length) {
    await db.functionalBatch.deleteMany({ where: { createdById: { in: ids } } });
    if (videoIds.length) await db.functionalExercise.deleteMany({ where: { id: { in: videoIds } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
  await db.$disconnect();
});
