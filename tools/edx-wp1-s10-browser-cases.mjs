import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';

const componentSelector = '.slide[data-slide-id="portable"] [data-edit-target^="slides.portable.content.components."]';

async function buildDistributionFixture(outputDir) {
  const source = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  const portable = source.slides.find(slide => slide.id === 'portable');
  assert.ok(portable, 'S10 browser fixture 缺 portable slide');
  portable.content.components.push(
    { id: 's10-two', type: 'text', text: '第二個待均分元件' },
    { id: 's10-three', type: 'text', text: '第三個待均分元件' },
  );
  portable.composition.geometryOverrides = {
    'portable-quote': { x: 180, y: 260, width: 360, height: 220 },
    's10-two': { x: 620, y: 520, width: 240, height: 160 },
    's10-three': { x: 1180, y: 100, width: 160, height: 120 },
  };
  source.slides = [portable];
  const rendered = renderFullDeck(source);
  assert.equal(rendered.status, 'pass');
  const path = resolve(outputDir, 's10-source.html');
  await writeFile(path, rendered.html);
  return { path, spec: extractDeckSpec(rendered.html) };
}

export async function runDistributionBrowserCases({ cdp, evaluate, navigate, outputDir, run, click, position, settle, assertExport }) {
  const fixture = await buildDistributionFixture(outputDir);
  await navigate(fixture.path);

  const ids = await evaluate(`[...document.querySelectorAll(${JSON.stringify(componentSelector)})].map(node=>node.dataset.pptskillElementId)`);
  assert.equal(ids.length, 3);
  const selected = () => evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected');
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const geometry = componentId => evaluate(`window.PPTSKILLEditor.getDeckSpec().slides[0].composition.geometryOverrides[${JSON.stringify(componentId)}]`);
  const hidden = action => evaluate(`document.querySelector('[data-action=${JSON.stringify(action)}]').hidden`);
  const clickWithShift = async css => {
    const point = await position(css);
    for (const [type, buttons] of [['mouseMoved', 0], ['mousePressed', 1], ['mouseReleased', 0]]) {
      await cdp.send('Input.dispatchMouseEvent', {
        type, x: point.x, y: point.y, button: type === 'mouseMoved' ? 'none' : 'left',
        buttons, clickCount: type === 'mouseMoved' ? 0 : 1, modifiers: 8,
      });
    }
    await settle();
  };

  await click('[data-action="layout"]');
  await click(`${componentSelector}[data-pptskill-element-id="${ids[0]}"]`);
  await clickWithShift(`${componentSelector}[data-pptskill-element-id="${ids[1]}"]`);
  assert.deepEqual(await selected(), ids.slice(0, 2));
  assert.equal(await hidden('distribute-horizontal-centers'), true, '2 選取不得顯示 distribute');
  await clickWithShift(`${componentSelector}[data-pptskill-element-id="${ids[2]}"]`);
  assert.deepEqual(await selected(), ids);
  assert.equal(await hidden('distribute-horizontal-centers'), false);
  assert.equal(await hidden('distribute-vertical-centers'), false);
  assert.equal(await evaluate('document.querySelectorAll(".moveable-control-box").length'), 0);
  run.checks.push({ s10: 'distribution-context', selected: ids, controls: 0 });

  await click('[data-action="distribute-horizontal-centers"]');
  assert.deepEqual(await geometry('portable-quote'), { x: 180, y: 260, width: 360, height: 220 });
  assert.deepEqual(await geometry('s10-two'), { x: 690, y: 520, width: 240, height: 160 });
  assert.deepEqual(await geometry('s10-three'), { x: 1180, y: 100, width: 160, height: 120 });
  assert.deepEqual(await selected(), ids, 'horizontal distribution 後 selection 必須保留');
  run.checks.push({ s10: 'horizontal-centers', selected: ids });

  await click('[data-action="distribute-vertical-centers"]');
  assert.deepEqual(await geometry('portable-quote'), { x: 180, y: 270, width: 360, height: 220 });
  assert.deepEqual(await geometry('s10-two'), { x: 690, y: 520, width: 240, height: 160 });
  assert.deepEqual(await geometry('s10-three'), { x: 1180, y: 100, width: 160, height: 120 });
  assert.deepEqual(await selected(), ids, 'vertical distribution 後 selection 必須保留');

  const committed = await spec();
  const exported = await assertExport('s10-distribute-export', committed);
  assert.deepEqual(await selected(), ids, 'export 不得清 live selection');
  await navigate(exported);
  assert.deepEqual(await selected(), [], 'offline reopen selection 必須為空');
  assert.equal(await evaluate('document.querySelectorAll("[data-pptskill-context-toolbar],.selecto-selection,.moveable-control-box,.slide [data-editor-selected]").length'), 0);
  assert.deepEqual(await spec(), committed);
  run.checks.push({ s10: 'vertical-export-reopen', selectionRetainedBeforeExport: true, reopenedSelection: [] });
  run.artifacts.push({ label: 's10-source', path: fixture.path });
}
