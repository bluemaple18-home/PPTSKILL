import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';

const componentSelector = '.slide[data-slide-id="portable"] [data-edit-target^="slides.portable.content.components."]';

async function buildSelectionFixture(outputDir) {
  const source = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  const portable = source.slides.find(slide => slide.id === 'portable');
  const other = source.slides.find(slide => slide.id !== 'portable');
  assert.ok(portable && other, 'S8 browser fixture 需要第二頁驗證 slide switch');
  portable.content.components.push(
    { id: 's8-two', type: 'text', text: '第二個可框選元件' },
    { id: 's8-three', type: 'text', text: '第三個可框選元件' },
  );
  portable.composition.geometryOverrides = {
    'portable-quote': { x: 180, y: 260, width: 360, height: 220 },
    's8-two': { x: 620, y: 260, width: 360, height: 220 },
    's8-three': { x: 1060, y: 260, width: 360, height: 220 },
  };
  source.slides = [portable, other];
  const rendered = renderFullDeck(source);
  assert.equal(rendered.status, 'pass');
  const path = resolve(outputDir, 's8-source.html');
  await writeFile(path, rendered.html);
  return { path, spec: extractDeckSpec(rendered.html) };
}

export async function runSelectionBrowserCases({ cdp, evaluate, navigate, outputDir, width, run, click, position, settle, assertExport }) {
  const fixture = await buildSelectionFixture(outputDir);
  const selected = () => evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected');
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const controlCount = () => evaluate('document.querySelectorAll(".moveable-control-box").length');
  const proxyCount = () => evaluate('document.querySelectorAll("[data-pptskill-editor-chrome=geometry-target]").length');
  const markerCount = () => evaluate('document.querySelectorAll(".slide [data-pptskill-element-id][data-editor-selected]").length');
  const statusText = () => evaluate('document.querySelector("[data-editor-status]").textContent');
  const key = async name => {
    const code = name === 'Escape' ? 27 : 0;
    for (const type of ['keyDown', 'keyUp']) await cdp.send('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: code });
    await settle();
  };
  const dispatchMouse = (type, point, { held = false, shift = false } = {}) => cdp.send('Input.dispatchMouseEvent', {
    type, x: point.x, y: point.y, button: type === 'mouseMoved' ? 'none' : 'left',
    buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1, modifiers: shift ? 8 : 0,
  });
  const clickWithShift = async css => {
    const point = await position(css);
    await dispatchMouse('mouseMoved', point, { shift: true });
    await dispatchMouse('mousePressed', point, { held: true, shift: true });
    await dispatchMouse('mouseReleased', point, { shift: true });
    await settle();
  };
  const slidePoint = (x, y, slideId = 'portable') => evaluate(`(()=>{const s=document.querySelector('.slide[data-slide-id=${JSON.stringify(slideId)}]'),r=s.getBoundingClientRect();return{x:r.x+r.width*${x}/1600,y:r.y+r.height*${y}/900}})()`);
  const marquee = async (shift = false) => {
    const start = await slidePoint(120, 200), end = await slidePoint(1020, 520);
    await dispatchMouse('mouseMoved', start, { shift });
    await dispatchMouse('mousePressed', start, { held: true, shift });
    for (let step = 1; step <= 5; step += 1) {
      await dispatchMouse('mouseMoved', {
        x: start.x + (end.x - start.x) * step / 5,
        y: start.y + (end.y - start.y) * step / 5,
      }, { held: true, shift });
    }
    await dispatchMouse('mouseReleased', end, { shift });
    await settle();
  };
  const assertNoMutation = async before => assert.deepEqual(await spec(), before, 'selection input 不得改 canonical');
  const makeSecondThird = async ids => {
    await click(`${componentSelector}[data-pptskill-element-id="${ids[1]}"]`);
    await clickWithShift(`${componentSelector}[data-pptskill-element-id="${ids[2]}"]`);
    assert.deepEqual(await selected(), [ids[1], ids[2]]);
  };
  const makeMulti = async ids => {
    await key('Escape');
    await marquee(false);
    assert.deepEqual(await selected(), [ids[0], ids[1]]);
  };

  await navigate(fixture.path);
  const ids = await evaluate(`(()=>[...document.querySelectorAll(${JSON.stringify(componentSelector)})].map(node=>node.dataset.pptskillElementId))()`);
  assert.equal(ids.length, 3);
  const before = await spec();
  const canonicalSha256 = createHash('sha256').update(JSON.stringify(before)).digest('hex');
  assert.deepEqual(before, fixture.spec);
  assert.deepEqual(await selected(), []);
  await click('[data-action="layout"]');

  await marquee(false);
  assert.deepEqual(await selected(), [ids[0], ids[1]], '真 pointer marquee 應只框到前兩個 component');
  assert.equal(await markerCount(), 2);
  assert.equal(await controlCount(), 0); assert.equal(await proxyCount(), 0);
  assert.match(await statusText(), /2/);
  await assertNoMutation(before);
  run.checks.push({ s8: 'pointer-marquee', ids: [ids[0], ids[1]], controls: 0, proxies: 0 });

  await clickWithShift(`${componentSelector}[data-pptskill-element-id="${ids[2]}"]`);
  assert.deepEqual(await selected(), ids, 'Shift-click add');
  await clickWithShift(`${componentSelector}[data-pptskill-element-id="${ids[0]}"]`);
  assert.deepEqual(await selected(), [ids[1], ids[2]], 'Shift-click remove');
  await assertNoMutation(before);

  await marquee(true);
  const firstShiftMarquee = await selected();
  assert.deepEqual(firstShiftMarquee, [ids[0], ids[2]], 'Shift marquee toggle');
  await key('Escape'); await makeSecondThird(ids); await marquee(true);
  assert.deepEqual(await selected(), firstShiftMarquee, '相同起始狀態的 Shift marquee 結果必須可重現');
  run.checks.push({ s8: 'shift-toggle', result: firstShiftMarquee });

  await click(`${componentSelector}[data-pptskill-element-id="${ids[2]}"]`);
  assert.deepEqual(await selected(), [ids[2]]);
  assert.equal(await controlCount(), 1, '回到單選必須恢復 Moveable');
  await assertNoMutation(before);
  run.checks.push('S8 >1 teardown Moveable；回 1 恢復單一 Moveable');

  await makeMulti(ids); await key('Escape');
  assert.deepEqual(await selected(), []); assert.equal(await controlCount(), 0);
  await marquee(false); await click('[data-action="layout"]');
  assert.deepEqual(await selected(), []); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().enabled'), false);
  await click('[data-action="layout"]');
  await marquee(false); await click('[data-action="edit"]');
  assert.deepEqual(await selected(), []); assert.equal(await evaluate('document.body.dataset.editorMode'), 'edit');
  await click('[data-action="edit"]'); await click('[data-action="layout"]');
  await marquee(false);
  const otherId = fixture.spec.slides[1].id;
  await evaluate(`document.querySelector('.slide[data-slide-id=${JSON.stringify(otherId)}]').scrollIntoView({block:'center'})`); await settle();
  const otherPoint = await slidePoint(80, 80, otherId);
  await dispatchMouse('mouseMoved', otherPoint); await dispatchMouse('mousePressed', otherPoint, { held: true }); await dispatchMouse('mouseReleased', otherPoint); await settle();
  assert.deepEqual(await selected(), [], '切頁清 selection');
  assert.equal(await evaluate(`document.querySelector('.slide[data-slide-id=${JSON.stringify(otherId)}]').dataset.editorSelected`), 'true');
  await evaluate('window.dispatchEvent(new Event("blur"))'); await settle();
  assert.deepEqual(await selected(), []);
  run.checks.push('S8 Escape/layout/text/slide-switch/blur cleanup');

  await evaluate('document.querySelector(".slide[data-slide-id=portable]").scrollIntoView({block:"center"})'); await settle();
  const portablePoint = await slidePoint(80, 80); await dispatchMouse('mousePressed', portablePoint, { held: true }); await dispatchMouse('mouseReleased', portablePoint); await settle();
  if (!await evaluate('window.PPTSKILLEditor.layout.getSelectionState().enabled')) await click('[data-action="layout"]');
  await marquee(false);
  const exportBefore = await spec();
  const exported = await assertExport('s8-multiselect-export', exportBefore);
  assert.deepEqual(await selected(), [ids[0], ids[1]], 'export 必須保留 live selection');
  assert.deepEqual(await spec(), exportBefore);
  assert.equal(createHash('sha256').update(JSON.stringify(await spec())).digest('hex'), canonicalSha256);
  await navigate(exported);
  assert.deepEqual(await selected(), [], 'offline reopen selection 必須為空');
  assert.equal(await evaluate('document.querySelectorAll(".selecto-selection,[data-pptskill-editor-chrome],.moveable-control-box,.slide [data-pptskill-element-id][data-editor-selected]").length'), 0);
  await click('[data-action="layout"]');
  await click(`${componentSelector}[data-pptskill-element-id="${ids[0]}"]`);
  assert.deepEqual(await selected(), [ids[0]]); assert.equal(await controlCount(), 1);
  assert.deepEqual(await spec(), exportBefore);
  run.checks.push({ s8: 'export-reopen', canonicalSha256, liveSelectionPreserved: true, reopenedSelection: [] });
  run.artifacts.push({ label: 's8-source', path: fixture.path });
}
