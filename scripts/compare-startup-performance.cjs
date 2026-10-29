// Compare the working tree with HEAD using read-only service calls.
// Requires the current worktree's existing environment; never exports secrets.
process.env.NODE_ENV = 'production';
require('@next/env').loadEnvConfig(process.cwd(), false);
require('tsx/cjs');
const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync, unlinkSync, rmdirSync, mkdtempSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { deepStrictEqual } = require('node:assert');
const { prisma } = require('../src/lib/database/prisma.ts');
const { getDashboard } = require('../src/services/dashboard.service.ts');

async function main() {
  mkdirSync('.zee-qa', { recursive: true });
  const directory = mkdtempSync(resolve('.zee-qa/performance-'));
  try {
    for (const name of ['fitness-target.service.ts', 'dashboard.service.ts']) {
      let source = execFileSync('git', ['show', `HEAD:src/services/${name}`], { encoding: 'utf8' });
      if (name === 'dashboard.service.ts') source = source.replace('@/services/fitness-target.service', './fitness-target.service');
      writeFileSync(join(directory, name), source);
    }
    const baseline = require(join(directory, 'dashboard.service.ts')).getDashboard;
    const user = await prisma.user.findFirst({ where: { role: 'MEMBER', isActive: true, memberId: { not: null } }, orderBy: { id: 'asc' }, select: { memberId: true } });
    if (!user) throw new Error('An active member is required.');
    const now = new Date();
    const samples = { before: [], after: [] };
    const measure = async (label, fn) => {
      const start = performance.now();
      const result = await fn(user.memberId, now);
      const ms = Math.round(performance.now() - start);
      console.log(JSON.stringify({ label, milliseconds: ms }));
      return { result, ms };
    };
    // Warm both paths, then alternate order to reduce connection/latency bias.
    await baseline(user.memberId, now);
    await getDashboard(user.memberId, now);
    for (let round = 0; round < 3; round++) {
      const results = {};
      for (const label of round % 2 ? ['after', 'before'] : ['before', 'after']) {
        results[label] = await measure(label, label === 'before' ? baseline : getDashboard);
        samples[label].push(results[label].ms);
      }
      // Includes membership status, amounts, warnings, target history and streak.
      deepStrictEqual(results.after.result, results.before.result);
    }
    const median = values => [...values].sort((a, b) => a - b)[1];
    const beforeMs = median(samples.before), afterMs = median(samples.after);
    const report = { measuredAt: new Date().toISOString(), method: 'Three alternating paired read-only dashboard service calls; same member, clock and connection pool', samples, beforeMs, afterMs, reductionPercent: Math.round((1 - afterMs / beforeMs) * 100), identicalBusinessResults: true };
    writeFileSync('output/speed-service-comparison.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {
    for (const name of ['fitness-target.service.ts', 'dashboard.service.ts']) {
      try { unlinkSync(join(directory, name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    rmdirSync(directory);
  }
}
main().catch(error => { console.error('Comparison failed:', error.code || error.name); process.exitCode = 1; }).finally(() => prisma.$disconnect());
