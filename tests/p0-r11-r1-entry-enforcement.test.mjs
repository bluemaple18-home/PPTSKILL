import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { contentHash, extractDeckSpec, patchSlideContent } from '../runtime/deck-spec.js';
import { renderExistingDeckWithGate, renderNewDeckWithGate } from '../runtime/workflow-entry.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);
const exists = async (path) => { try { await access(path); return true; } catch { return false; } };

const sourceHtml = await readFile(new URL('../evidence/p0-r11/owner-visual/release-company-deck.html', import.meta.url), 'utf8');
const source = extractDeckSpec(sourceHtml);
const selectedStyle = { status: 'selected', approvedBy: 'human', styleId: source.style.id };
const approvedOutline = {
  schemaVersion: '1.0', deckTitle: source.title, sourcePolicy: 'user-provided-only',
  slides: source.slides.map(({ id, content }) => ({ id, title: content.title, subtitle: content.subtitle, keyPoints: content.keyPoints })),
  approval: { status: 'confirmed', approvedBy: 'human' },
};
const approvedGate = {
  pressureTestAnswer: '核心主張成立，但最薄弱的假設仍需在試行中驗證。',
  outlineApproval: { status: 'confirmed', approvedBy: 'human' },
  styleSelection: selectedStyle,
};

test('既有 HTML 未完成壓力測試與人工核准時不得輸出新 HTML', () => {
  const result = renderExistingDeckWithGate({ sourceHtml, candidateSpec: source, gate: {} });
  assert.equal(result.status, 'blocked');
  assert.equal('html' in result, false);
});

test('既有 HTML 的安全 restyle 保留 slide ID、頁序與全部內容 hash', () => {
  const candidate = structuredClone(source);
  candidate.style = { ...candidate.style, id: 'clickforce-dark' };
  candidate.slides[0].composition = { ...candidate.slides[0].composition, variant: 'company-agenda' };
  const result = renderExistingDeckWithGate({ sourceHtml, candidateSpec: candidate, gate: approvedGate });
  assert.equal(result.status, 'pass');
  const reopened = extractDeckSpec(result.html);
  assert.deepEqual(reopened.slides.map(({ id }) => id), source.slides.map(({ id }) => id));
  assert.deepEqual(reopened.slides.map(contentHash), source.slides.map(contentHash));
});

test('未核准時拒絕既有 HTML 的內容改寫與頁序變更', () => {
  const changed = patchSlideContent(source, source.slides[0].id, { subtitle: '未經核准的新內容' });
  changed.slides.reverse();
  const result = renderExistingDeckWithGate({ sourceHtml, candidateSpec: changed, gate: approvedGate });
  assert.equal(result.status, 'blocked');
  assert.match(result.reason, /內容|頁序/);
  assert.equal('html' in result, false);
});

test('人工核准的 bounded change set 只允許完全相符的內容與頁序修改', () => {
  const targetId = source.slides[0].id;
  const expected = source.slides[0].content.subtitle;
  const replacement = '人工核准後的新副標';
  const changed = patchSlideContent(source, targetId, { subtitle: replacement });
  const changeSet = {
    approval: { status: 'confirmed', approvedBy: 'human' },
    changes: [{ operation: 'content', slideId: targetId, field: 'subtitle', expected, replacement }],
  };
  const result = renderExistingDeckWithGate({ sourceHtml, candidateSpec: changed, gate: { ...approvedGate, changeSet } });
  assert.equal(result.status, 'pass');
  const extra = patchSlideContent(changed, source.slides[1].id, { title: '額外偷改' });
  assert.equal(renderExistingDeckWithGate({ sourceHtml, candidateSpec: extra, gate: { ...approvedGate, changeSet } }).status, 'blocked');
});

test('新簡報仍需人工核准 outline 與 Style 才能 render', () => {
  assert.equal(renderNewDeckWithGate({ deckSpec: source, outline: source, styleSelection: selectedStyle }).status, 'blocked');
  const grill = { status: 'complete', materialsReviewed: true, pressureTestAnswer: '最薄弱的假設需要驗證。' };
  assert.equal(renderNewDeckWithGate({ deckSpec: source, outline: approvedOutline, styleSelection: selectedStyle, grill }).status, 'pass');
});

test('ZIP install 註冊三個真實 pptskill Skill，update 更新且 uninstall 可逆移除', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-r11r1-lifecycle-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const home = join(root, 'user');
  const installRoot = join(home, '.pptskill', 'runtime');
  const installed = JSON.parse((await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot])).stdout);
  assert.equal(installed.skillRegistration.status, 'registered');
  for (const directory of ['.codex', '.claude', '.gemini']) {
    const skill = join(home, directory, 'skills', 'pptskill', 'SKILL.md');
    assert.equal(await exists(skill), true);
    assert.match(await readFile(skill, 'utf8'), /workflow-cli\.mjs render-restyle/);
  }
  const updated = JSON.parse((await run(process.execPath, [join(bundle, 'update.mjs'), '--install-root', installRoot])).stdout);
  assert.equal(updated.skillRegistration.status, 'registered');
  const removed = JSON.parse((await run(process.execPath, [join(bundle, 'uninstall.mjs'), '--install-root', installRoot])).stdout);
  assert.equal(removed.skillRegistration.status, 'removed');
  assert.equal(await exists(join(home, '.claude', 'skills', 'pptskill')), false);
});

test('ZIP install 遇到同名非 PPTSKILL skill 時拒絕覆寫且不啟用 runtime', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-r11r1-collision-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const home = join(root, 'user');
  const existing = join(home, '.claude', 'skills', 'pptskill');
  await mkdir(existing, { recursive: true });
  await writeFile(join(existing, 'SKILL.md'), 'unrelated user skill');
  const installRoot = join(home, '.pptskill', 'runtime');
  await assert.rejects(run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]), /拒絕覆寫既有 claude-code skill/);
  assert.equal(await exists(installRoot), false);
  assert.equal(await readFile(join(existing, 'SKILL.md'), 'utf8'), 'unrelated user skill');
});
