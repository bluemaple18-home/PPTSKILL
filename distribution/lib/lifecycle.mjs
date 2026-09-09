import { execFile } from 'node:child_process';
import { access, cp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, parse, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const markerName = '.pptskill-install.json';
const exists = async (path) => { try { await access(path); return true; } catch { return false; } };

export const defaultInstallRoot = () => resolve(homedir(), '.pptskill', 'runtime');
export const defaultProfilePath = () => resolve(homedir(), '.pptskill', 'profile.json');

const assertInstallRoot = (path) => {
  const target = resolve(path);
  if (target === parse(target).root || target === resolve(homedir()) || basename(target) === '.pptskill') throw new Error('拒絕使用過度寬廣的安裝目錄；請指定 PPTSKILL runtime 子目錄。');
  return target;
};

const readManifest = async (root) => {
  const manifest = JSON.parse(await readFile(resolve(root, 'package-manifest.json'), 'utf8'));
  if (manifest?.schemaVersion !== '1.0' || manifest?.name !== 'PPTSKILL' || !manifest?.version) throw new Error('distribution manifest 無效。');
  for (const required of ['core', 'adapters']) if (!await exists(resolve(root, required))) throw new Error(`distribution 缺少 ${required}。`);
  return manifest;
};

const stagePayload = async ({ sourceRoot, stageRoot }) => {
  const manifest = await readManifest(sourceRoot);
  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(stageRoot, { recursive: true });
  await cp(resolve(sourceRoot, 'core'), resolve(stageRoot, 'core'), { recursive: true });
  await cp(resolve(sourceRoot, 'adapters'), resolve(stageRoot, 'adapters'), { recursive: true });
  await cp(resolve(sourceRoot, 'lib'), resolve(stageRoot, 'lib'), { recursive: true });
  for (const entry of ['install.mjs', 'update.mjs', 'uninstall.mjs', 'smoke.mjs', 'package-manifest.json']) await cp(resolve(sourceRoot, entry), resolve(stageRoot, entry));
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

export async function updateDistribution({ sourceRoot, installRoot = defaultInstallRoot(), afterBackup } = {}) {
  const target = assertInstallRoot(installRoot);
  if (!await exists(resolve(target, markerName))) throw new Error('找不到有效的 PPTSKILL runtime；請先 install。');
  const parent = dirname(target);
  const stage = resolve(parent, `.${basename(target)}-update-${process.pid}`);
  const backup = resolve(parent, `.${basename(target)}-backup-${process.pid}`);
  let movedCurrent = false;
  try {
    const manifest = await stagePayload({ sourceRoot: resolve(sourceRoot), stageRoot: stage });
    await rename(target, backup);
    movedCurrent = true;
    if (afterBackup) await afterBackup();
    await rename(stage, target);
    await rm(backup, { recursive: true, force: true });
    return { status: 'updated', installRoot: target, version: manifest.version };
  } catch (error) {
    if (movedCurrent && !await exists(target) && await exists(backup)) await rename(backup, target);
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}

export async function uninstallDistribution({ installRoot = defaultInstallRoot(), profilePath = defaultProfilePath(), purgeProfile = false } = {}) {
  const target = assertInstallRoot(installRoot);
  if (!await exists(target)) return { status: 'absent', installRoot: target, profilePreserved: await exists(profilePath) };
  if (!await exists(resolve(target, markerName))) throw new Error('拒絕移除：目錄不是有效的 PPTSKILL runtime。');
  await rm(target, { recursive: true });
  if (purgeProfile) await rm(resolve(profilePath), { force: true });
  return { status: 'uninstalled', installRoot: target, profilePreserved: !purgeProfile && await exists(profilePath) };
}

const probeAdapter = async (adapter, env) => {
  if (!/^[a-z0-9._-]+$/i.test(adapter.command)) return { id: adapter.id, status: 'unsupported', message: `${adapter.displayName} adapter command 無效。` };
  try {
    const { stdout, stderr } = await run(adapter.command, adapter.versionArgs || ['--version'], { env, timeout: 3000 });
    const version = `${stdout}${stderr}`.trim().split('\n')[0].slice(0, 200);
    if (!/\d+\.\d+/.test(version)) return { id: adapter.id, status: 'unsupported', message: `${adapter.displayName} 版本格式無法辨識。`, version };
    return { id: adapter.id, status: 'recognized', message: `已辨識 ${adapter.displayName}。`, version };
  } catch (error) {
    if (error?.code === 'ENOENT') return { id: adapter.id, status: 'missing', message: `找不到 ${adapter.displayName}；請確認 CLI 已安裝並位於 PATH。` };
    return { id: adapter.id, status: 'unavailable', message: `${adapter.displayName} 無法執行版本檢查。` };
  }
};

export async function smokeDistribution({ installRoot = defaultInstallRoot(), env = process.env } = {}) {
  const target = assertInstallRoot(installRoot);
  if (!await exists(resolve(target, markerName))) throw new Error('找不到有效的 PPTSKILL runtime。');
  const adapterIds = ['codex', 'claude-code', 'gemini'];
  const adapters = await Promise.all(adapterIds.map(async (id) => JSON.parse(await readFile(resolve(target, 'adapters', id, 'adapter.json'), 'utf8'))));
  const sharedCore = resolve(target, 'core');
  const coreFiles = ['runtime/deck-spec.js', 'runtime/full-deck-renderer.js', 'runtime/local-profile.js'];
  const coreReady = (await Promise.all(coreFiles.map((file) => exists(resolve(sharedCore, file))))).every(Boolean);
  const oneSharedCore = adapters.every((adapter) => resolve(target, 'adapters', adapter.id, adapter.coreRelativePath) === sharedCore)
    && (await Promise.all(adapterIds.map((id) => exists(resolve(target, 'adapters', id, 'core'))))).every((value) => !value);
  const probes = await Promise.all(adapters.map((adapter) => probeAdapter(adapter, env)));
  return {
    status: coreReady && oneSharedCore && probes.every(({ status }) => status === 'recognized') ? 'pass' : 'partial',
    installRoot: target,
    coreReady,
    oneSharedCore,
    adapters: probes,
  };
}
