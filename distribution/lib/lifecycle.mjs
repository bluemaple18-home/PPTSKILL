import { execFile } from 'node:child_process';
import { access, cp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, parse, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const markerName = '.pptskill-install.json';
const exists = async (path) => { try { await access(path); return true; } catch { return false; } };
const versionPattern = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const minimumVersionPattern = /^\d+\.\d+\.\d+$/;

export const defaultInstallRoot = () => resolve(homedir(), '.pptskill', 'runtime');
export const defaultProfilePath = () => resolve(homedir(), '.pptskill', 'profile.json');

const assertInstallRoot = (path) => {
  const target = resolve(path);
  if (target === parse(target).root || target === resolve(homedir()) || basename(target) === '.pptskill') throw new Error('拒絕使用過度寬廣的安裝目錄；請指定 PPTSKILL runtime 子目錄。');
  return target;
};

const readManifest = async (root) => {
  const manifest = JSON.parse(await readFile(resolve(root, 'package-manifest.json'), 'utf8'));
  if (manifest?.schemaVersion !== '1.0' || manifest?.name !== 'PPTSKILL' || !versionPattern.test(manifest?.version)) throw new Error('distribution manifest 無效。');
  for (const required of ['core', 'adapters']) if (!await exists(resolve(root, required))) throw new Error(`distribution 缺少 ${required}。`);
  return manifest;
};

export const readAndValidateInstallMarker = async (root) => {
  let marker;
  try {
    marker = JSON.parse(await readFile(resolve(root, markerName), 'utf8'));
  } catch {
    throw new Error('找不到或無法讀取有效的 PPTSKILL install marker。');
  }
  if (marker?.schemaVersion !== '1.0' || marker?.name !== 'PPTSKILL' || !versionPattern.test(marker?.version)) throw new Error('PPTSKILL install marker 驗證失敗；拒絕修改 runtime。');
  return marker;
};

const stagePayload = async ({ sourceRoot, stageRoot }) => {
  const manifest = await readManifest(sourceRoot);
  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(stageRoot, { recursive: true });
  await cp(resolve(sourceRoot, 'core'), resolve(stageRoot, 'core'), { recursive: true });
  await cp(resolve(sourceRoot, 'adapters'), resolve(stageRoot, 'adapters'), { recursive: true });
  await cp(resolve(sourceRoot, 'lib'), resolve(stageRoot, 'lib'), { recursive: true });
  for (const entry of ['install.mjs', 'update.mjs', 'uninstall.mjs', 'smoke.mjs', 'profile.mjs', 'package-manifest.json']) await cp(resolve(sourceRoot, entry), resolve(stageRoot, entry));
  await writeFile(resolve(stageRoot, markerName), `${JSON.stringify({ schemaVersion: '1.0', name: 'PPTSKILL', version: manifest.version }, null, 2)}\n`);
  return manifest;
};

export async function installDistribution({ sourceRoot, installRoot = defaultInstallRoot() }) {
  const target = assertInstallRoot(installRoot);
  if (await exists(target)) throw new Error('PPTSKILL runtime 已存在；請使用 update。');
  await mkdir(dirname(target), { recursive: true });
  const stage = resolve(dirname(target), `.${basename(target)}-install-${process.pid}`);
  try {
    const manifest = await stagePayload({ sourceRoot: resolve(sourceRoot), stageRoot: stage });
    await rename(stage, target);
    return { status: 'installed', installRoot: target, version: manifest.version };
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}

export async function updateDistribution({ sourceRoot, installRoot = defaultInstallRoot(), afterBackup, beforeStageCleanup, beforeRollback, beforeBackupCleanup } = {}) {
  const target = assertInstallRoot(installRoot);
  await readAndValidateInstallMarker(target);
  const parent = dirname(target);
  const stage = resolve(parent, `.${basename(target)}-update-${process.pid}`);
  const backup = resolve(parent, `.${basename(target)}-backup-${process.pid}`);
  let movedCurrent = false;
  let activationCommitted = false;
  try {
    const manifest = await stagePayload({ sourceRoot: resolve(sourceRoot), stageRoot: stage });
    await rename(target, backup);
    movedCurrent = true;
    if (afterBackup) await afterBackup();
    await rename(stage, target);
    activationCommitted = true;
    try {
      if (beforeBackupCleanup) await beforeBackupCleanup();
      await rm(backup, { recursive: true, force: true });
      return { status: 'updated', installRoot: target, version: manifest.version };
    } catch (error) {
      return { status: 'updated_with_warning', installRoot: target, version: manifest.version, backupPath: backup, warning: `新版已啟用，但舊版備份清理失敗：${error.message}` };
    }
  } catch (error) {
    if (activationCommitted) throw error;
    let rollbackError;
    if (movedCurrent) {
      try {
        if (beforeRollback) await beforeRollback();
        if (await exists(target)) throw new Error('runtime target 已被其他檔案占用');
        if (!await exists(backup)) throw new Error('找不到 rollback backup');
        await rename(backup, target);
      } catch (restoreError) {
        rollbackError = restoreError;
      }
    }
    let stageCleanupError;
    try {
      if (beforeStageCleanup) await beforeStageCleanup();
      await rm(stage, { recursive: true, force: true });
    } catch (cleanupError) {
      stageCleanupError = cleanupError;
    }
    if (rollbackError) throw new Error(`update activation 失敗：${error.message}${stageCleanupError ? `；stage cleanup 失敗：${stageCleanupError.message}` : ''}；rollback 也失敗：${rollbackError.message}；保留備份：${backup}`);
    if (stageCleanupError) throw new Error(`update activation 失敗：${error.message}；rollback 已完成；stage cleanup 失敗：${stageCleanupError.message}；保留 stage：${stage}`);
    throw error;
  }
}

export async function uninstallDistribution({ installRoot = defaultInstallRoot(), profilePath = defaultProfilePath(), purgeProfile = false } = {}) {
  const target = assertInstallRoot(installRoot);
  const requestedProfile = resolve(profilePath);
  const canonicalProfile = defaultProfilePath();
  if (purgeProfile && requestedProfile !== canonicalProfile) throw new Error('拒絕清除非 canonical PPTSKILL profile。');
  if (!await exists(target)) {
    if (purgeProfile) await rm(canonicalProfile, { force: true });
    return { status: 'absent', installRoot: target, profilePreserved: await exists(requestedProfile) };
  }
  await readAndValidateInstallMarker(target);
  await rm(target, { recursive: true });
  if (purgeProfile) await rm(canonicalProfile, { force: true });
  return { status: 'uninstalled', installRoot: target, profilePreserved: !purgeProfile && await exists(requestedProfile) };
}

const parseRuntimeVersion = (text) => {
  const match = text.match(/(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  return match ? { core: match.slice(1, 4).map(Number), prerelease: match[4] || null } : null;
};

const meetsMinimumVersion = (version, minimumVersion) => {
  const minimum = minimumVersion.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (version.core[index] > minimum[index]) return true;
    if (version.core[index] < minimum[index]) return false;
  }
  return version.prerelease === null;
};

const probeAdapter = async (adapter, env) => {
  if (!/^[a-z0-9._-]+$/i.test(adapter.command)) return { id: adapter.id, status: 'unsupported', message: `${adapter.displayName} adapter command 無效。` };
  try {
    const { stdout, stderr } = await run(adapter.command, adapter.versionArgs || ['--version'], { env, timeout: 3000 });
    const version = `${stdout}${stderr}`.trim().split('\n')[0].slice(0, 200);
    const parsed = parseRuntimeVersion(version);
    if (!parsed) return { id: adapter.id, status: 'unsupported', message: `${adapter.displayName} 版本格式無法辨識。`, version };
    if (!meetsMinimumVersion(parsed, adapter.minimumVersion)) return { id: adapter.id, status: 'unsupported', message: `${adapter.displayName} ${version} 低於最低支援版本 ${adapter.minimumVersion}。`, version, minimumVersion: adapter.minimumVersion };
    return { id: adapter.id, status: 'recognized', message: `已辨識 ${adapter.displayName}。`, version };
  } catch (error) {
    if (error?.code === 'ENOENT') return { id: adapter.id, status: 'missing', message: `找不到 ${adapter.displayName}；請確認 CLI 已安裝並位於 PATH。` };
    return { id: adapter.id, status: 'unavailable', message: `${adapter.displayName} 無法執行版本檢查。` };
  }
};

export async function smokeDistribution({ installRoot = defaultInstallRoot(), env = process.env, adapterId, all = false } = {}) {
  const target = assertInstallRoot(installRoot);
  await readAndValidateInstallMarker(target);
  const adapterIds = ['codex', 'claude-code', 'gemini'];
  const adapters = await Promise.all(adapterIds.map(async (id) => JSON.parse(await readFile(resolve(target, 'adapters', id, 'adapter.json'), 'utf8'))));
  const sharedCore = resolve(target, 'core');
  const coreFiles = ['runtime/deck-spec.js', 'runtime/full-deck-renderer.js', 'runtime/local-profile.js'];
  const coreReady = (await Promise.all(coreFiles.map((file) => exists(resolve(sharedCore, file))))).every(Boolean);
  const oneSharedCore = adapters.every((adapter, index) => adapter.id === adapterIds[index]
      && adapter.coreRelativePath === '../../core'
      && resolve(target, 'adapters', adapterIds[index], adapter.coreRelativePath) === sharedCore)
    && (await Promise.all(adapterIds.map((id) => exists(resolve(target, 'adapters', id, 'core'))))).every((value) => !value);
  const manifestChecks = await Promise.all(adapters.map(async (adapter, index) => (adapter.schemaVersion === '1.0'
    && adapter.id === adapterIds[index]
    && adapter.coreRelativePath === '../../core'
    && adapter.entryPath === 'entry.md'
    && minimumVersionPattern.test(adapter.minimumVersion)
    && adapter.profileRelativePath === '../../profile.mjs'
    && /^[a-z0-9._-]+$/i.test(adapter.command)
    && await exists(resolve(target, 'adapters', adapter.id, adapter.entryPath))
    && await exists(resolve(target, 'adapters', adapter.id, adapter.profileRelativePath)))));
  const manifestsReady = manifestChecks.every(Boolean);
  if (adapterId && all) throw new Error('請只選擇 --adapter 或 --all。');
  if (adapterId && !adapterIds.includes(adapterId)) throw new Error(`未知 adapter：${adapterId}。`);
  const selected = manifestsReady ? all ? adapters : adapterId ? adapters.filter(({ id }) => id === adapterId) : [] : [];
  const probes = await Promise.all(selected.map((adapter) => probeAdapter(adapter, env)));
  const packageReady = coreReady && oneSharedCore && manifestsReady;
  return {
    status: packageReady && probes.every(({ status }) => status === 'recognized') ? 'pass' : 'partial',
    mode: all ? 'all' : adapterId ? 'adapter' : 'package',
    installRoot: target,
    coreReady,
    oneSharedCore,
    manifestsReady,
    adapters: probes,
  };
}
