import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { listCompositionPrimitives } from '../runtime/composition-primitives.js';
import { buildDeckEditorRuntimeScript, createDeckEditor } from '../runtime/deck-editor.js';
import { sanitizeDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { getGenerationCapabilities } from '../runtime/generation-capabilities.js';
import { createGenerationPlan } from '../runtime/generation-plan.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);
const slide = (id) => ({ id, title: `標題 ${id}`, subtitle: `副標 ${id}`, keyPoints: ['重點一', '重點二', '重點三'] });
const outline = { deckTitle: '能力驗證', sourcePolicy: 'user-provided-only', slides: [slide('main')] };
const style = {
  id: 'test-style', name: 'Test', layout: { primaryMove: 'asymmetric-grid', compositionLanguage: 'executive' }, density: 'medium',
  typography: { display: 'Arial', body: 'Arial' }, palette: { canvas: '#fff', text: '#111', muted: '#777', accent: '#06c', surface: '#eee' },
  spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 8, borderWidth: 1 },
  motion: { personality: 'none', durationMs: 0, easing: 'linear', reducedMotion: true }, assetTreatment: 'contain',
};
const chartDeck = (chartType, values) => ({
  schemaVersion: '1.0', deckId: 'chart-capability', title: 'Chart', language: 'zh-Hant', style,
  slides: [{
    id: 'main',
    content: { title: '圖表', subtitle: '不可偷換圖意', keyPoints: ['重點一', '重點二', '重點三'], components: [{ id: 'chart', type: 'chart', chartType, labels: ['A', 'B'], series: [{ name: '系列', values }] }] },
    composition: { primitive: 'component-focus', variant: 'default', slots: { title: 'content.title', subtitle: 'content.subtitle', component: 'content.components.chart' } },
  }],
});

test('planner capability view 直接反映 composition registry 與真實 chart 邊界', () => {
  const capabilities = getGenerationCapabilities();
  assert.deepEqual(capabilities.compositionPrimitives.map(({ id }) => id), listCompositionPrimitives().map(({ id }) => id));
  assert.deepEqual(capabilities.components.chart, { status: 'conditional', supportedChartTypes: ['bar'], valueDomain: 'non-negative' });

  const plan = createGenerationPlan({
    outline, styleSpecId: style.id, capacity: { maxSlidesPerUnit: 3 },
    generationPermissions: { chart: true },
    candidates: [
      { id: 'bar-ok', primitive: 'component-focus', component: { type: 'chart', chartType: 'bar', series: [{ values: [10, 20] }] } },
      { id: 'line-no', primitive: 'component-focus', component: { type: 'chart', chartType: 'line', series: [{ values: [10, 20] }] } },
      { id: 'negative-no', primitive: 'component-focus', component: { type: 'chart', chartType: 'bar', series: [{ values: [-10, 20] }] } },
      { id: 'primitive-no', primitive: 'freeform-canvas' },
    ],
  });
  assert.deepEqual(plan.capabilities, capabilities);
  assert.deepEqual(plan.candidates.map(({ id, status }) => [id, status]), [
    ['bar-ok', 'available'], ['line-no', 'unavailable'], ['negative-no', 'unavailable'], ['primitive-no', 'unavailable'],
  ]);
  assert.match(JSON.stringify(plan.candidates), /chart_type_unavailable|negative_chart_values|composition_primitive_unavailable/);
  const unauthorized = createGenerationPlan({
    outline, styleSpecId: style.id, capacity: { maxSlidesPerUnit: 3 },
    candidates: [{ id: 'bar-no-permission', primitive: 'component-focus', component: { type: 'chart', chartType: 'bar', series: [{ values: [10, 20] }] } }],
  });
  assert.equal(unauthorized.candidates[0].status, 'unavailable');
  assert.match(JSON.stringify(unauthorized.candidates[0]), /generation_permission_required/);
});

test('renderer 只接受目前能保真呈現的 bar chart，不把其他圖型或負值畫成正值 bar-row', () => {
  assert.equal(renderFullDeck(chartDeck('bar', [10, 20])).status, 'pass');
  const unsupported = renderFullDeck(chartDeck('line', [10, 20]));
  assert.equal(unsupported.status, 'fail');
  assert.match(unsupported.errors.join(' '), /line.*支援|支援.*line/);
  const negative = renderFullDeck(chartDeck('bar', [-10, 20]));
  assert.equal(negative.status, 'fail');
  assert.match(negative.errors.join(' '), /負值/);
  assert.equal(sanitizeDeckSpec(chartDeck('line', [10, 20])).slides[0].content.components[0].chartType, 'line');
});

test('Node 與 browser editor 共用 chart capability，不能另存 unsupported 語意', () => {
  assert.throws(() => createDeckEditor(chartDeck('line', [10, 20])), /line.*支援|支援.*line/);
  assert.throws(() => createDeckEditor(chartDeck('bar', [-10, 20])), /負值/);
  const script = buildDeckEditorRuntimeScript();
  assert.match(script, /supportedChartTypes=\["bar"\]/);
  assert.match(script, /不支援負值語意/);
  assert.doesNotMatch(script, /Math\.abs\(v\)/);
});

test('installed Skill 的 plan-new seam 輸出 capability view 並阻止 unavailable candidate 冒充可用', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp2-plan-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]);
  const installedSkill = await readFile(join(root, 'user', '.codex', 'skills', 'pptskill', 'SKILL.md'), 'utf8');
  assert.match(installedSkill, /workflow-cli\.mjs plan-new/);

  const requestPath = join(root, 'plan-request.json');
  await writeFile(requestPath, JSON.stringify({
    outline, styleSpecId: style.id, capacity: { maxSlidesPerUnit: 3 }, generationPermissions: { chart: true },
    candidates: [{ id: 'line-no', primitive: 'component-focus', component: { type: 'chart', chartType: 'line', series: [{ values: [10, 20] }] } }],
  }));
  const result = JSON.parse((await run(process.execPath, [join(installRoot, 'core', 'runtime', 'workflow-cli.mjs'), 'plan-new', '--request', requestPath])).stdout);
  assert.equal(result.status, 'pass');
  assert.equal(result.mode, 'new-deck-plan');
  assert.equal(result.plan.candidates[0].status, 'unavailable');
  assert.deepEqual(result.plan.capabilities.components.chart.supportedChartTypes, ['bar']);
});
