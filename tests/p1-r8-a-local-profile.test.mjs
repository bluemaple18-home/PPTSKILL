import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { createProfileReminderGate, loadLocalProfile, resolveProfilePath, saveLocalProfile, sanitizeLocalProfile } from '../runtime/local-profile.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
const preference = {
  language: 'zh-Hant',
  stylePreferences: ['typography-hero', 'information-led'],
  density: 'low',
  sampleFirst: true,
  motionPreference: 'subtle',
  fontPersonality: 'modern-grotesk',
  colorMood: 'warm-neutral',
};
const hash = (value) => createHash('sha256').update(value).digest('hex');
const run = promisify(execFile);
const profileCli = fileURLToPath(new URL('../tools/profile.mjs', import.meta.url));

test('profile 預設位於版本目錄外，缺少時是正常狀態', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-profile-'));
  const installDirectory = join(root, 'PPTSKILL-v1');
  const profilePath = resolveProfilePath({ homeDirectory: join(root, 'user') });
  assert.equal(profilePath.startsWith(installDirectory), false);
  assert.deepEqual(await loadLocalProfile({ profilePath }), { status: 'absent', profile: null, profilePath });
});

test('只有明確 remember 才寫入，且 profile 使用嚴格 allowlist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-profile-'));
  const profilePath = join(root, '.pptskill', 'profile.json');
  assert.equal((await saveLocalProfile(preference, { profilePath })).status, 'skipped');
  await assert.rejects(stat(profilePath), { code: 'ENOENT' });
  assert.throws(() => sanitizeLocalProfile({ ...preference, clientName: '秘密客戶' }), /不接受欄位/);
  assert.throws(() => sanitizeLocalProfile({ ...preference, colorMood: '客戶專案紅' }), /不是支援/);

  const saved = await saveLocalProfile(preference, { remember: true, profilePath });
  assert.equal(saved.status, 'saved');
  assert.equal(saved.mode, 0o600);
  assert.deepEqual((await loadLocalProfile({ profilePath })).profile, { schemaVersion: '1.0', ...preference });
});

test('profile 與版本目錄隔離，模擬升級不改變 profile hash', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-upgrade-'));
  const profilePath = resolveProfilePath({ homeDirectory: join(root, 'user') });
  await saveLocalProfile(preference, { remember: true, profilePath });
  const before = hash(await readFile(profilePath));
  await writeFile(join(root, 'PPTSKILL-v2.zip'), '新版 runtime，不接觸 user config');
  const after = hash(await readFile(profilePath));
  assert.equal(after, before);
});

test('每份 deck session 最多提醒一次，已有 profile 時不提醒', () => {
  const absent = createProfileReminderGate({ profileStatus: 'absent' });
  assert.match(absent.next(), /記住偏好/);
  assert.equal(absent.next(), null);
  assert.equal(createProfileReminderGate({ profileStatus: 'present' }).next(), null);
});

test('profile 存在時產生與匯出 deck，DeckSpec 不含 profile 欄位、路徑或內容', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-isolation-'));
  const profilePath = resolveProfilePath({ homeDirectory: join(root, 'user') });
  await saveLocalProfile(preference, { remember: true, profilePath });
  const loaded = await loadLocalProfile({ profilePath });
  const result = renderFullDeck({ ...fixture, profile: loaded.profile, profilePath, profileContents: 'R8-ISOLATION-SENTINEL' });
  assert.equal(result.status, 'pass');
  const exported = extractDeckSpec(result.html);
  const serialized = JSON.stringify(exported);
  assert.equal('profile' in exported, false);
  assert.doesNotMatch(serialized, /profilePath|stylePreferences|sampleFirst|fontPersonality|colorMood|R8-ISOLATION-SENTINEL|\.pptskill/);
});

test('profile CLI 對缺少設定與 opt-in 儲存提供可讀結果，不輸出 stack trace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-profile-cli-'));
  const profilePath = join(root, '.pptskill', 'profile.json');
  const inputPath = join(root, 'preference.json');
  await writeFile(inputPath, JSON.stringify(preference));

  const absent = await run(process.execPath, [profileCli, 'show', '--profile', profilePath]);
  assert.match(absent.stdout, /正常狀態/);
  await run(process.execPath, [profileCli, 'save', '--input', inputPath, '--profile', profilePath]);
  await assert.rejects(stat(profilePath), { code: 'ENOENT' });
  const saved = await run(process.execPath, [profileCli, 'save', '--input', inputPath, '--remember', '--profile', profilePath]);
  assert.match(saved.stdout, /已儲存個人偏好/);
  assert.doesNotMatch(saved.stderr, /\bat\s/);
});
