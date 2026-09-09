import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { installDistribution, smokeDistribution, uninstallDistribution, updateDistribution } from '../distribution/lib/lifecycle.mjs';
import { saveLocalProfile } from '../runtime/local-profile.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);
const hashFile = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const exists = async (path) => { try { await access(path); return true; } catch { return false; } };

const prepareBundle = async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-r8b-'));
  const archivePath = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath });
  const extractRoot = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archivePath, '-d', extractRoot]);
  return { root, archivePath, bundleRoot: join(extractRoot, 'PPTSKILL') };
};

const fakeCliEnvironment = async (root, versions = {}) => {
  const bin = join(root, 'bin');
  const commands = { codex: 'codex 1.2.3', claude: 'claude 2.3.4', gemini: 'gemini 3.4.5', ...versions };
  await import('node:fs/promises').then(({ mkdir }) => mkdir(bin, { recursive: true }));
  for (const [command, version] of Object.entries(commands)) await writeFile(join(bin, command), `#!/bin/sh\nprintf '%s\\n' '${version}'\n`, { mode: 0o755 });
  return { ...process.env, PATH: `${bin}:${process.env.PATH || ''}` };
};

test('ZIP 可在無 Git 流程 fresh install，三個 adapter 共用單一 core', async () => {
  const { root, archivePath, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  const listing = (await run('/usr/bin/unzip', ['-Z1', archivePath])).stdout;
  assert.match(listing, /^PPTSKILL\/core\/runtime\/deck-spec\.js$/m);
  assert.equal((listing.match(/PPTSKILL\/core\/runtime\/deck-spec\.js/g) || []).length, 1);
  assert.doesNotMatch(listing, /\.git\//);
  assert.doesNotMatch(listing, /golden-covers\/(accepted|rejected|unresolved)\//);

  const installed = JSON.parse((await run(process.execPath, [join(bundleRoot, 'install.mjs'), '--install-root', installRoot])).stdout);
  assert.equal(installed.status, 'installed');
  assert.equal(JSON.parse(await readFile(join(installRoot, 'package-manifest.json'))).requiresGit, false);
  const smoke = JSON.parse((await run(process.execPath, [join(installRoot, 'smoke.mjs'), '--install-root', installRoot], { env: await fakeCliEnvironment(root) })).stdout);
  assert.equal(smoke.status, 'pass');
  assert.equal(smoke.coreReady, true);
  assert.equal(smoke.oneSharedCore, true);
  assert.deepEqual(smoke.adapters.map(({ status }) => status), ['recognized', 'recognized', 'recognized']);
});

test('update 保留外部 profile，失敗時 rollback 舊 runtime', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  const profilePath = join(root, 'user', '.pptskill', 'profile.json');
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  await saveLocalProfile({ language: 'zh-Hant', density: 'low' }, { remember: true, profilePath });
  const profileHash = await hashFile(profilePath);
  await writeFile(join(installRoot, 'rollback-sentinel.txt'), '舊 runtime');

  await assert.rejects(updateDistribution({ sourceRoot: bundleRoot, installRoot, afterBackup: () => { throw new Error('synthetic update failure'); } }), /synthetic update failure/);
  assert.equal(await readFile(join(installRoot, 'rollback-sentinel.txt'), 'utf8'), '舊 runtime');
  assert.equal(await hashFile(profilePath), profileHash);

  const updated = await updateDistribution({ sourceRoot: bundleRoot, installRoot });
  assert.equal(updated.status, 'updated');
  assert.equal(await exists(join(installRoot, 'rollback-sentinel.txt')), false);
  assert.equal(await hashFile(profilePath), profileHash);
});

test('uninstall 預設保留 profile，只有明確 purge-profile 才刪除', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  const profilePath = join(root, 'user', '.pptskill', 'profile.json');
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  await saveLocalProfile({ language: 'zh-Hant' }, { remember: true, profilePath });
  const result = await uninstallDistribution({ installRoot, profilePath });
  assert.equal(result.profilePreserved, true);
  assert.equal(await exists(profilePath), true);
  assert.equal(await exists(installRoot), false);

  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  await uninstallDistribution({ installRoot, profilePath, purgeProfile: true });
  assert.equal(await exists(profilePath), false);
});

test('adapter 缺少或版本無法辨識時回報人話，不吐 stack trace', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  const env = await fakeCliEnvironment(root, { gemini: 'development-build' });
  const missingBin = join(root, 'missing-bin');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(missingBin, { recursive: true }));
  await writeFile(join(missingBin, 'codex'), "#!/bin/sh\nprintf 'codex 1.2.3\\n'\n", { mode: 0o755 });
  const partial = await smokeDistribution({ installRoot, env: { ...env, PATH: missingBin } });
  assert.equal(partial.status, 'partial');
  assert.match(partial.adapters.find(({ id }) => id === 'claude-code').message, /找不到 Claude Code/);
  assert.doesNotMatch(JSON.stringify(partial), /\bat\s.*\.mjs:/);

  const unsupported = await smokeDistribution({ installRoot, env });
  assert.equal(unsupported.adapters.find(({ id }) => id === 'gemini').status, 'unsupported');
  assert.match(unsupported.adapters.find(({ id }) => id === 'gemini').message, /版本格式無法辨識/);
  assert.equal((await stat(join(installRoot, 'smoke.mjs'))).isFile(), true);
});
