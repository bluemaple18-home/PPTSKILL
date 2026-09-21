import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';

const componentSelector = '.slide[data-slide-id="portable"] [data-edit-target^="slides.portable.content.components."]';

async function buildAlignmentFixture(outputDir) {
  const source = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  const portable = source.slides.find(slide => slide.id === 'portable');
  assert.ok(portable, 'S9 browser fixture 缺 portable slide');
  portable.content.components.push({ id: 's9-two', type: 'text', text: '第二個待對齊元件' });
  portable.composition.geometryOverrides = {
    'portable-quote': { x: 180, y: 260, width: 360, height: 220 },
    's9-two': { x: 620, y: 520, width: 240, height: 160 },
  };
  source.slides = [portable];
  const rendered = renderFullDeck(source);
  assert.equal(rendered.status, 'pass');
  const path = resolve(outputDir, 's9-source.html');
  await writeFile(path, rendered.html);
  return { path, spec: extractDeckSpec(rendered.html) };
}

export async function runAlignmentBrowserCases({ cdp, evaluate, navigate, outputDir, run, click, position, settle, assertExport }) {
  const fixture = await buildAlignmentFixture(outputDir);
  await navigate(fixture.path);

  const ids = await evaluate(`[...document.querySelectorAll(${JSON.stringify(componentSelector)})].map(node=>node.dataset.pptskillElementId)`);
  assert.equal(ids.length, 2);
  const selected = () => evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected');
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const geometry = componentId => evaluate(`window.PPTSKILLEditor.getDeckSpec().slides[0].composition.geometryOverrides[${JSON.stringify(componentId)}]`);
  const toolbarHidden = () => evaluate('document.querySelector("[data-pptskill-context-toolbar]").hidden');

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
  assert.deepEqual(await selected(), [ids[0]]);
  assert.equal(await toolbarHidden(), true);
  await clickWithShift(`${componentSelector}[data-pptskill-element-id="${ids[1]}"]`);
  assert.deepEqual(await selected(), ids);
  assert.equal(await toolbarHidden(), false);
  assert.equal(await evaluate('document.querySelectorAll(".moveable-control-box").length'), 0);

  await click('[data-action="align-left"]');
  assert.deepEqual(await geometry('portable-quote'), { x: 180, y: 260, width: 360, height: 220 });
  assert.deepEqual(await geometry('s9-two'), { x: 180, y: 520, width: 240, height: 160 });
  assert.deepEqual(await selected(), ids, 'align-left 後 selection 必須保留');
  assert.equal(await toolbarHidden(), false);
  run.checks.push({ s9: 'align-left', selected: ids });

  await click('[data-action="align-center-x"]');
  assert.deepEqual(await geometry('portable-quote'), { x: 180, y: 260, width: 360, height: 220 });
  assert.deepEqual(await geometry('s9-two'), { x: 240, y: 520, width: 240, height: 160 });
  assert.deepEqual(await selected(), ids, 'align-center-x 後 selection 必須保留');
  run.checks.push({ s9: 'align-center-x', selected: ids });

  const committed = await spec();
  const exported = await assertExport('s9-align-export', committed);
  assert.deepEqual(await selected(), ids, 'export 不得清 live selection');
  await navigate(exported);
  assert.deepEqual(await selected(), [], 'offline reopen selection 必須為空');
  assert.equal(await evaluate('document.querySelectorAll("[data-pptskill-context-toolbar],.selecto-selection,.moveable-control-box,.slide [data-editor-selected]").length'), 0);
  assert.deepEqual(await spec(), committed);
  run.checks.push({ s9: 'export-reopen', selectionRetainedBeforeExport: true, reopenedSelection: [] });
  run.artifacts.push({ label: 's9-source', path: fixture.path });
}
