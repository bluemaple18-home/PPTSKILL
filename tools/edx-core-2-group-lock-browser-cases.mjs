import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { cropFixturePng } from './edx-core-crop-browser-cases.mjs';

export async function groupLockFixture() {
  const spec = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  const slide = spec.slides.find(s => s.id === 'portable'); spec.slides = [slide];
  slide.content.components = [{ id: 'group-text', type: 'text', text: '整組移動與鎖定' }, { id: 'group-image', type: 'image', alt: '含軸線的群組圖', dataUri: cropFixturePng(), fit: 'contain' }];
  slide.composition = { primitive: 'title-points', variant: 'default', slots: { title: 'content.title', subtitle: 'content.subtitle', points: 'content.keyPoints' }, geometryOverrides: {
    'group-text': { x: 120, y: 300, width: 240, height: 120 }, 'group-image': { x: 500, y: 340, width: 240, height: 160 },
  } };
  return spec;
}

export async function runGroupLockBrowserCases({ cdp, evaluate, navigate, outputDir, width, run, click: baseClick, position, mouse, settle, assertExport }) {
  const source = await groupLockFixture(), rendered = renderFullDeck(source); assert.equal(rendered.status, 'pass');
  const path = resolve(outputDir, 'group-lock-source.html'); await writeFile(path, rendered.html); await navigate(path);
  const ids = ['component-group-text', 'component-group-image'];
  const css = id => '[data-pptskill-element-id="' + id + '"]';
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const selected = () => evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected');
  const click = async selector => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`); await baseClick(selector); };
  const geometry = s => s.slides[0].composition.geometryOverrides;
  const record = (caseName, details = {}) => run.checks.push({ core2: caseName, ...details });
  const screenshot = async label => {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const bytes = Buffer.from(data, 'base64'), path = resolve(outputDir, width + '-group-lock-' + label + '.png'); await writeFile(path, bytes);
    run.artifacts.push({ label, path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  };
  const checkGeometry = async expected => {
    const measured = await evaluate(`(()=>{const slide=document.querySelector('.slide'),s=slide.getBoundingClientRect(),k=s.width/1600;return Object.fromEntries(${JSON.stringify(ids)}.map(id=>{const e=document.querySelector('[data-pptskill-element-id="'+id+'"]'),r=e.getBoundingClientRect();return[id.replace('component-',''),{x:(r.x-s.x)/k,y:(r.y-s.y)/k,width:r.width/k,height:r.height/k}]}))})()`);
    for (const [id, box] of Object.entries(expected)) for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(measured[id][key] - box[key]) < 1.5, `${id} ${key}: ${measured[id][key]} ≠ ${box[key]}`);
  };
  const gesture = async (kind, dx, dy, finish = true) => {
    const scale = await evaluate("document.querySelector('.slide').getBoundingClientRect().width/1600");
    const p = await position(kind === 'resize' ? '.moveable-se' : css(ids[0]), kind === 'resize' ? .5 : .2, .5);
    assert.ok(p.width > 0 && p.height > 0, '可見pointer target');
    await mouse('mouseMoved', p); await mouse('mousePressed', p, true);
    let end;
    for (let i = 1; i <= 6; i++) { end = { x: p.x + dx * scale * i / 6, y: p.y + dy * scale * i / 6 }; await mouse('mouseMoved', end, true); }
    await settle(); if (finish) { await mouse('mouseReleased', end); await settle(); } return end;
  };
  const key = async (key, code, extra = {}) => {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, ...extra });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, ...extra }); await settle();
  };

  await click('[data-action="layout"]');
  const frame = await evaluate("(()=>{const r=document.querySelector('.slide').getBoundingClientRect();return {x:r.x,y:r.y,k:r.width/1600}})()");
  const a = { x: frame.x + 95 * frame.k, y: frame.y + 280 * frame.k }, b = { x: frame.x + 765 * frame.k, y: frame.y + 520 * frame.k };
  const blank = await evaluate(`(()=>{const e=document.elementFromPoint(${a.x},${a.y});return !!e.closest('.slide')&&!e.closest('[data-pptskill-element-id]')})()`); assert.equal(blank, true);
  await mouse('mouseMoved', a); await mouse('mousePressed', a, true);
  for (let i = 1; i <= 6; i++) await mouse('mouseMoved', { x: a.x + (b.x-a.x)*i/6, y: a.y+(b.y-a.y)*i/6 }, true);
  await mouse('mouseReleased', b); await settle(); assert.deepEqual(new Set(await selected()), new Set(ids)); record('trusted marquee', { selected: await selected() });
  await click('[data-action="group-elements"]'); let committed = await spec();
  assert.deepEqual(new Set(committed.slides[0].composition.elementGroups[0]), new Set(ids));
  assert.ok(await evaluate('document.querySelector(".moveable-se")?.getBoundingClientRect().width>0'));
  assert.equal(await evaluate('document.querySelector("[data-action=snap-layout]").disabled'), true); record('toolbar group＋Moveable group handle');
  await screenshot('grouped');
  const end = await gesture('drag', 60, 30, false); assert.deepEqual(await spec(), committed);
  await assertExport('core2-preview-export', committed); await mouse('mouseReleased', end); await settle();
  committed = await spec(); assert.equal(geometry(committed)['group-text'].x, 180); assert.equal(geometry(committed)['group-image'].x, 560);
  await checkGeometry(geometry(committed)); record('trusted group drag／preview export');
  await gesture('resize', 124, 40); committed = await spec();
  assert.deepEqual(geometry(committed)['group-text'], { x: 180, y: 330, width: 288, height: 144 });
  assert.deepEqual(geometry(committed)['group-image'], { x: 636, y: 378, width: 288, height: 192 });
  await checkGeometry(geometry(committed)); record('trusted group resize／canonical比例');
  await key('ArrowRight', 'ArrowRight', { modifiers: 8 }); committed = await spec(); assert.equal(geometry(committed)['group-text'].x, 190); record('trusted Shift nudge整組10px');
  const cancelEnd = await gesture('drag', 35, 35, false); await key('Escape', 'Escape'); await mouse('mouseReleased', cancelEnd); await settle();
  assert.deepEqual(await spec(), committed); assert.deepEqual(await selected(), []); await checkGeometry(geometry(committed)); record('trusted Escape cancel without commit');
  await click(css(ids[1])); assert.deepEqual(new Set(await selected()), new Set(ids));
  const cancelPointer = await gesture('resize', 20, 20, false); await evaluate("document.dispatchEvent(new Event('pointercancel',{bubbles:true}))"); await mouse('mouseReleased', cancelPointer); await settle();
  assert.deepEqual(await spec(), committed); record('trusted pointer＋synthetic pointercancel');
  await gesture('resize', -700, -200); assert.deepEqual(await spec(), committed); record('minimum整組拒絕');
  await click('[data-action="lock-elements"]'); committed = await spec(); assert.deepEqual(new Set(committed.slides[0].composition.lockedElementIds), new Set(ids));
  assert.equal(await evaluate('document.querySelectorAll(".moveable-control-box").length'), 0);
  await key('ArrowRight', 'ArrowRight'); assert.deepEqual(await spec(), committed);
  const rejection = await evaluate(`(()=>{try{window.PPTSKILLEditor.executeOperation({operation:'edit-text',target:{slideId:'portable',elementId:${JSON.stringify(ids[0])}},value:'不可写入'});return false}catch(e){return e.message.includes('鎖定')}})()`); assert.equal(rejection, true);
  record('locked no handles／key與operation拒絕'); await screenshot('locked');
  const exported = await assertExport('core2-locked-export', committed); await navigate(exported); assert.deepEqual(await spec(), committed); assert.deepEqual(await selected(), []);
  await click('[data-action="layout"]'); await click(css(ids[0])); assert.deepEqual(new Set(await selected()), new Set(ids));
  await click('[data-action="unlock-elements"]'); assert.equal((await spec()).slides[0].composition.lockedElementIds, undefined); record('offline reopen／locked click expand／unlock');
  await click('[data-action="ungroup-elements"]'); assert.equal((await spec()).slides[0].composition.elementGroups, undefined);
  await click(css(ids[0])); assert.deepEqual(await selected(), [ids[0]]);
  await evaluate(`window.PPTSKILLEditor.executeOperation({operation:'delete-element',target:{slideId:'portable',elementId:${JSON.stringify(ids[0])}},value:{confirm:true}})`);
  committed = await spec(); assert.equal(committed.slides[0].content.components.length, 1); record('ungroup後復用S18 delete-element API');
  await assertExport('core2-final-export', committed); await screenshot('ungrouped');
  run.artifacts.push({ label: 'core2-source', path, bytes: Buffer.byteLength(rendered.html), sha256: createHash('sha256').update(rendered.html).digest('hex') });
}
