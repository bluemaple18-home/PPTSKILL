// Mainline 交接用：只跑不需 browser／ZIP build 的具名測試；Worker 未執行此全套。
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const excluded = /^(p1-r8-b-distribution|pgq-wp4-s3-content-integrity|pgq-wp4-s3-sample-approval|pgq-wp4-s4-required-visibility|pgq-wp4-s4-full-deck-qa)\.test\.mjs$/;
const skipPattern = 'installed|fresh ZIP|^ZIP install';
const files = readdirSync('tests').filter(f => f.endsWith('.test.mjs')).sort();
const selected = files.filter(f => !excluded.test(f)).map(f => 'tests/' + f);
const omitted = files.flatMap(file => [...readFileSync('tests/' + file, 'utf8').matchAll(/\btest\('([^']+)'/g)].filter(m => excluded.test(file) || new RegExp(skipPattern).test(m[1])).map(m => ({ file: 'tests/' + file, name: m[1], reason: file === 'p1-r8-b-distribution.test.mjs' || (!excluded.test(file)) ? 'ZIP／installed build 交 Mainline' : '需要真正 browser producer，交 Mainline' })));
const args = ['--test', '--test-skip-pattern=' + skipPattern, ...selected];
const manifest = { executedByWorker: false, skipPattern, excludedFiles: files.filter(f => excluded.test(f)), command: ['node', ...args], omitted };
if (process.argv.includes('--manifest-only')) writeFileSync('evidence/edx-wp1-s3-motion/worker-nonbrowser-selection.json', JSON.stringify(manifest, null, 2) + '\n');
else { const result = spawnSync(process.execPath, args, { stdio: 'inherit' }); process.exitCode = result.status ?? 1; }
