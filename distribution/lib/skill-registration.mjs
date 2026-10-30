import { createHash } from 'node:crypto';
import { access, cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const markerName = '.pptskill-skill.json';
const exists = async (path) => { try { await access(path); return true; } catch { return false; } };
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const targetsFor = (homeRoot) => [
  { adapter: 'codex', path: resolve(homeRoot, '.codex', 'skills', 'pptskill') },
  { adapter: 'claude-code', path: resolve(homeRoot, '.claude', 'skills', 'pptskill') },
  { adapter: 'gemini', path: resolve(homeRoot, '.gemini', 'skills', 'pptskill') },
];

const readOwnedMarker = async (target, installRoot) => {
  try {
    const marker = JSON.parse(await readFile(resolve(target, markerName), 'utf8'));
    return marker?.schemaVersion === '1.0' && marker?.name === 'PPTSKILL' && marker?.skill === 'pptskill'
      && resolve(marker.installRoot) === resolve(installRoot) && typeof marker.skillSha256 === 'string' ? marker : null;
  } catch { return null; }
};

export async function preflightSkillRegistration({ homeRoot, installRoot }) {
  for (const target of targetsFor(homeRoot)) {
    if (await exists(target.path) && !await readOwnedMarker(target.path, installRoot)) throw new Error(`拒絕覆寫既有 ${target.adapter} skill：${target.path}`);
  }
  return { status: 'pass', targets: targetsFor(homeRoot) };
}

export async function registerSkills({ runtimeRoot, homeRoot, version }) {
  const installRoot = resolve(runtimeRoot);
  await preflightSkillRegistration({ homeRoot, installRoot });
  const source = resolve(installRoot, 'skill', 'pptskill');
  const skillContents = await readFile(resolve(source, 'SKILL.md'));
  const skillSha256 = sha256(skillContents);
  const applied = [];
  try {
    for (const target of targetsFor(homeRoot)) {
      await mkdir(dirname(target.path), { recursive: true });
      const stage = `${target.path}.stage-${process.pid}`;
      const backup = `${target.path}.backup-${process.pid}`;
      await rm(stage, { recursive: true, force: true });
      await rm(backup, { recursive: true, force: true });
      await cp(source, stage, { recursive: true });
      await writeFile(resolve(stage, markerName), `${JSON.stringify({ schemaVersion: '1.0', name: 'PPTSKILL', skill: 'pptskill', version, installRoot, skillSha256 }, null, 2)}\n`);
      const hadPrevious = await exists(target.path);
      if (hadPrevious) await rename(target.path, backup);
      try { await rename(stage, target.path); } catch (error) { if (hadPrevious) await rename(backup, target.path); throw error; }
      applied.push({ ...target, backup: hadPrevious ? backup : null });
    }
    const cleanup = await Promise.allSettled(applied.filter(({ backup }) => backup).map(({ backup }) => rm(backup, { recursive: true, force: true })));
    const cleanupWarnings = cleanup.filter(({ status }) => status === 'rejected').map(({ reason }) => reason.message);
    return { status: cleanupWarnings.length ? 'registered_with_warning' : 'registered', skill: 'pptskill', targets: applied.map(({ adapter, path }) => ({ adapter, path })), cleanupWarnings };
  } catch (error) {
    for (const item of applied.reverse()) {
      await rm(item.path, { recursive: true, force: true });
      if (item.backup && await exists(item.backup)) await rename(item.backup, item.path);
    }
    throw error;
  }
}

export async function unregisterSkills({ runtimeRoot, homeRoot }) {
  const results = [];
  for (const target of targetsFor(homeRoot)) {
    if (!await exists(target.path)) { results.push({ adapter: target.adapter, status: 'absent' }); continue; }
    const marker = await readOwnedMarker(target.path, runtimeRoot);
    if (!marker) { results.push({ adapter: target.adapter, status: 'preserved-unowned' }); continue; }
    const currentSha = sha256(await readFile(resolve(target.path, 'SKILL.md')));
    if (currentSha !== marker.skillSha256) { results.push({ adapter: target.adapter, status: 'preserved-modified' }); continue; }
    await rm(target.path, { recursive: true });
    results.push({ adapter: target.adapter, status: 'removed' });
  }
  return { status: results.every(({ status }) => ['absent', 'removed'].includes(status)) ? 'removed' : 'partial', targets: results };
}

export async function inspectSkillRegistration({ runtimeRoot, homeRoot }) {
  const results = [];
  for (const target of targetsFor(homeRoot)) {
    const marker = await readOwnedMarker(target.path, runtimeRoot);
    const skillPath = resolve(target.path, 'SKILL.md');
    const ready = Boolean(marker) && await exists(skillPath) && sha256(await readFile(skillPath)) === marker.skillSha256;
    results.push({ adapter: target.adapter, ready, path: target.path });
  }
  return { status: results.every(({ ready }) => ready) ? 'pass' : 'partial', targets: results };
}
