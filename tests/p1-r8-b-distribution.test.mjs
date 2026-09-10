import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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

const fakeSingleCliEnvironment = async (root, command, version) => {
  const bin = join(root, `bin-${command}`);
  await import('node:fs/promises').then(({ mkdir }) => mkdir(bin, { recursive: true }));
  await writeFile(join(bin, command), `#!/bin/sh\nprintf '%s\\n' '${version}'\n`, { mode: 0o755 });
  return { ...process.env, PATH: bin };
};

test('ZIP 可在無 Git 流程 fresh install，三個 adapter 共用單一 core', async () => {
  const { root, archivePath, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  const listing = (await run('/usr/bin/unzip', ['-Z1', archivePath])).stdout;
  assert.match(listing, /^PPTSKILL\/core\/runtime\/deck-spec\.js$/m);
  assert.equal((listing.match(/PPTSKILL\/core\/runtime\/deck-spec\.js/g) || []).length, 1);
  assert.doesNotMatch(listing, /\.git\//);
  assert.doesNotMatch(listing, /golden-covers\/(accepted|rejected|unresolved)\//);
  assert.match(listing, /^PPTSKILL\/profile\.mjs$/m);
  for (const id of ['codex', 'claude-code', 'gemini']) {
    assert.match(listing, new RegExp(`^PPTSKILL/adapters/${id}/entry\\.md$`, 'm'));
    const entry = await readFile(join(bundleRoot, 'adapters', id, 'entry.md'), 'utf8');
    assert.match(entry, /所有相對路徑都必須從本 `adapter\.json` 所在目錄解析/);
    assert.match(entry, /<pptskill-runtime>\/core\/working-spec\.md/);
    assert.match(entry, /runtime\/grill-outline\.js/);
    assert.match(entry, /renderFullDeck\(\)/);
    assert.match(entry, /export-sanitizer-allowlist\.md/);
  }

  const installed = JSON.parse((await run(process.execPath, [join(bundleRoot, 'install.mjs'), '--install-root', installRoot])).stdout);
  assert.equal(installed.status, 'installed');
  assert.equal(JSON.parse(await readFile(join(installRoot, 'package-manifest.json'))).requiresGit, false);
  const packageSmoke = JSON.parse((await run(process.execPath, [join(installRoot, 'smoke.mjs'), '--install-root', installRoot], { env: { PATH: '' } })).stdout);
  assert.equal(packageSmoke.status, 'pass');
  assert.equal(packageSmoke.mode, 'package');
  assert.equal(packageSmoke.adapters.length, 0);
  assert.equal(packageSmoke.coreReady, true);
  assert.equal(packageSmoke.oneSharedCore, true);
  assert.equal(packageSmoke.manifestsReady, true);
  const adapterFixtures = [
    ['codex', 'codex', 'codex 1.2.3'],
    ['claude-code', 'claude', 'claude 2.3.4'],
    ['gemini', 'gemini', 'gemini 3.4.5'],
  ];
  for (const [id, command, version] of adapterFixtures) {
    const env = await fakeSingleCliEnvironment(root, command, version);
    const smoke = JSON.parse((await run(process.execPath, [join(installRoot, 'smoke.mjs'), '--install-root', installRoot, '--adapter', id], { env })).stdout);
    assert.equal(smoke.status, 'pass');
    assert.equal(smoke.mode, 'adapter');
    assert.deepEqual(smoke.adapters.map(({ status }) => status), ['recognized']);
    const manifestPath = join(installRoot, 'adapters', id, 'adapter.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const portableProfileEntry = resolve(dirname(manifestPath), manifest.profileRelativePath);
    const profile = await run(process.execPath, [portableProfileEntry, 'show'], { cwd: root, env: { ...env, HOME: join(root, 'user-home') } });
    assert.match(profile.stdout, /這是正常狀態/);
  }
  const env = await fakeCliEnvironment(root);
  const releaseSmoke = JSON.parse((await run(process.execPath, [join(installRoot, 'smoke.mjs'), '--install-root', installRoot, '--all'], { env })).stdout);
  assert.equal(releaseSmoke.status, 'pass');
  assert.equal(releaseSmoke.mode, 'all');
  assert.deepEqual(releaseSmoke.adapters.map(({ status }) => status), ['recognized', 'recognized', 'recognized']);
});

test('相同 source tree 在不同 process timezone 產生相同 ZIP SHA', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-r8b-deterministic-'));
  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Taipei';
    const first = await buildDistribution({ archivePath: join(root, 'first.zip') });
    process.env.TZ = 'America/Los_Angeles';
    const second = await buildDistribution({ archivePath: join(root, 'second.zip') });
    assert.equal(first.sha256, second.sha256);
    assert.equal(await hashFile(first.archivePath), await hashFile(second.archivePath));
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test('package smoke 會拒絕 adapter manifest 指向但不存在的 portable profile entry', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  await import('node:fs/promises').then(({ rm }) => rm(join(installRoot, 'profile.mjs')));
  const result = await smokeDistribution({ installRoot });
  assert.equal(result.status, 'partial');
  assert.equal(result.manifestsReady, false);
});

test('built ZIP 可直接 show/save canonical profile，不依賴 pnpm 或 repo tools', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const userHome = join(root, 'user');
  const env = { ...process.env, HOME: userHome };
  const absent = await run(process.execPath, [join(bundleRoot, 'profile.mjs'), 'show'], { env });
  assert.match(absent.stdout, /尚未儲存個人偏好/);
  const input = join(root, 'profile-input.json');
  await writeFile(input, JSON.stringify({ language: 'zh-Hant', density: 'low' }));
  const saved = await run(process.execPath, [join(bundleRoot, 'profile.mjs'), 'save', '--input', input, '--remember'], { env });
  assert.match(saved.stdout, /已儲存個人偏好/);
  const profile = JSON.parse(await readFile(join(userHome, '.pptskill', 'profile.json'), 'utf8'));
  assert.equal(profile.language, 'zh-Hant');
  const corePackage = JSON.parse(await readFile(join(bundleRoot, 'core', 'package.json'), 'utf8'));
  assert.equal(corePackage.type, 'module');
  assert.equal(corePackage.scripts, undefined);
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

test('update commit point 後的 backup cleanup failure 回傳 committed warning', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  await writeFile(join(installRoot, 'old-sentinel.txt'), '舊 runtime');
  const result = await updateDistribution({ sourceRoot: bundleRoot, installRoot, beforeBackupCleanup: () => { throw new Error('synthetic cleanup failure'); } });
  assert.equal(result.status, 'updated_with_warning');
  assert.match(result.warning, /新版已啟用/);
  assert.equal(await exists(join(installRoot, 'old-sentinel.txt')), false);
  assert.equal(await exists(result.backupPath), true);
});

test('activation failure 後 rollback 本身失敗時 fail-loud 並保留 recovery backup', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  await assert.rejects(updateDistribution({
    sourceRoot: bundleRoot,
    installRoot,
    afterBackup: () => { throw new Error('synthetic activation failure'); },
    beforeStageCleanup: () => { throw new Error('synthetic stage cleanup failure'); },
    beforeRollback: () => { throw new Error('synthetic rollback failure'); },
  }), /stage cleanup 失敗.*rollback 也失敗.*保留備份/);
  assert.equal(await exists(installRoot), false);
  assert.equal((await readdir(join(root, 'user', '.pptskill'))).some((name) => name.includes('runtime-backup-')), true);
});

test('stage cleanup 失敗也必須先完成 pre-activation rollback', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  const order = [];
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  await writeFile(join(installRoot, 'rollback-sentinel.txt'), '舊 runtime');
  await assert.rejects(updateDistribution({
    sourceRoot: bundleRoot,
    installRoot,
    afterBackup: () => { order.push('activation-failed'); throw new Error('synthetic activation failure'); },
    beforeRollback: () => { order.push('rollback'); },
    beforeStageCleanup: () => { order.push('stage-cleanup'); throw new Error('synthetic stage cleanup failure'); },
  }), /rollback 已完成.*stage cleanup 失敗/);
  assert.deepEqual(order, ['activation-failed', 'rollback', 'stage-cleanup']);
  assert.equal(await readFile(join(installRoot, 'rollback-sentinel.txt'), 'utf8'), '舊 runtime');
});

test('tampered install marker 使 update 與 uninstall 拒絕 destructive action', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  for (const marker of [
    { schemaVersion: '9.9', name: 'PPTSKILL', version: '0.1.0' },
    { schemaVersion: '1.0', name: 'NOT-PPTSKILL', version: '0.1.0' },
    { schemaVersion: '1.0', name: 'PPTSKILL', version: 'latest' },
  ]) {
    await writeFile(join(installRoot, '.pptskill-install.json'), JSON.stringify(marker));
    await assert.rejects(updateDistribution({ sourceRoot: bundleRoot, installRoot }), /marker 驗證失敗/);
    await assert.rejects(uninstallDistribution({ installRoot }), /marker 驗證失敗/);
    assert.equal(await exists(installRoot), true);
  }
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
  await assert.rejects(uninstallDistribution({ installRoot, profilePath, purgeProfile: true }), /非 canonical/);
  assert.equal(await exists(profilePath), true);
  assert.equal(await exists(installRoot), true);
});

test('production uninstall CLI 拒絕任意 profile path，purge 只刪 canonical profile', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const userHome = join(root, 'user');
  const installRoot = join(userHome, '.pptskill', 'runtime');
  const canonicalProfile = join(userHome, '.pptskill', 'profile.json');
  const unrelated = join(root, 'unrelated.json');
  const env = { ...process.env, HOME: userHome };
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  await saveLocalProfile({ language: 'zh-Hant' }, { remember: true, profilePath: canonicalProfile });
  await writeFile(unrelated, 'keep');
  await assert.rejects(run(process.execPath, [join(bundleRoot, 'uninstall.mjs'), '--install-root', '--purge-profile'], { env }), /請提供 --install-root/);
  assert.equal(await exists(canonicalProfile), true);
  await assert.rejects(run(process.execPath, [join(bundleRoot, 'uninstall.mjs'), '--install-root', installRoot, '--purge-profile', '--profile', unrelated], { env }), /正式 CLI 不接受 --profile/);
  assert.equal(await exists(installRoot), true);
  await run(process.execPath, [join(bundleRoot, 'uninstall.mjs'), '--install-root', installRoot, '--purge-profile'], { env });
  assert.equal(await exists(canonicalProfile), false);
  assert.equal(await readFile(unrelated, 'utf8'), 'keep');
  await saveLocalProfile({ language: 'zh-Hant' }, { remember: true, profilePath: canonicalProfile });
  const absent = JSON.parse((await run(process.execPath, [join(bundleRoot, 'uninstall.mjs'), '--install-root', installRoot, '--purge-profile'], { env })).stdout);
  assert.equal(absent.status, 'absent');
  assert.equal(absent.profilePreserved, false);
  assert.equal(await exists(canonicalProfile), false);
});

test('adapter 缺少或版本無法辨識時回報人話，不吐 stack trace', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  const env = await fakeCliEnvironment(root, { gemini: 'development-build' });
  const missingBin = join(root, 'missing-bin');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(missingBin, { recursive: true }));
  await writeFile(join(missingBin, 'codex'), "#!/bin/sh\nprintf 'codex 1.2.3\\n'\n", { mode: 0o755 });
  const partial = await smokeDistribution({ installRoot, env: { ...env, PATH: missingBin }, all: true });
  assert.equal(partial.status, 'partial');
  assert.match(partial.adapters.find(({ id }) => id === 'claude-code').message, /找不到 Claude Code/);
  assert.doesNotMatch(JSON.stringify(partial), /\bat\s.*\.mjs:/);

  const unsupported = await smokeDistribution({ installRoot, env, adapterId: 'gemini' });
  assert.equal(unsupported.adapters.find(({ id }) => id === 'gemini').status, 'unsupported');
  assert.match(unsupported.adapters.find(({ id }) => id === 'gemini').message, /版本格式無法辨識/);
  assert.equal((await stat(join(installRoot, 'smoke.mjs'))).isFile(), true);
});

test('低於 adapter minimumVersion 時提供明確 unsupported 訊息', async () => {
  const { root, bundleRoot } = await prepareBundle();
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await installDistribution({ sourceRoot: bundleRoot, installRoot });
  const env = await fakeCliEnvironment(root, { gemini: 'Gemini CLI 0.0.1' });
  const result = await smokeDistribution({ installRoot, env, adapterId: 'gemini' });
  assert.equal(result.status, 'partial');
  assert.equal(result.adapters[0].status, 'unsupported');
  assert.match(result.adapters[0].message, /低於最低支援版本 0\.1\.0/);
  const prereleaseEnv = await fakeCliEnvironment(root, { gemini: 'Gemini CLI 0.1.0-beta.1' });
  const prerelease = await smokeDistribution({ installRoot, env: prereleaseEnv, adapterId: 'gemini' });
  assert.equal(prerelease.adapters[0].status, 'unsupported');
});

test('ZIP control docs 不攜帶 repo execution frontier 或視覺退回狀態', async () => {
  const { bundleRoot } = await prepareBundle();
  const readme = await readFile(join(bundleRoot, 'README.md'), 'utf8');
  const spec = await readFile(join(bundleRoot, 'core', 'working-spec.md'), 'utf8');
  assert.doesNotMatch(readme, /視覺品質已被 owner 退回修復/);
  assert.doesNotMatch(readme, /不代表最終視覺品質已被 owner 接受/);
  assert.doesNotMatch(spec, /目前 frontier/);
  assert.doesNotMatch(spec, /P1-R8-B-R1/);
  assert.match(spec, /status 與 frontier 刻意不進入 distributable core/);
});
