import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// 只供既有 runner 的 base10／listener 前置後呼叫；所有選圖與 fit 操作使用真 pointer／keyboard。
export async function runImageFitBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport }) {
  const group = '[data-selected-image-fit]', button = fit => `[data-image-fit="${fit}"]`;
  const image = (id, slide = 'portable') => `.slide[data-slide-id="${slide}"] [data-pptskill-element-id="component-asset-${id}"]`;
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const selected = () => evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected');
  const visible = () => evaluate(`(()=>{const e=document.querySelector('${group}');return !e.hidden&&e.getBoundingClientRect().width>0&&getComputedStyle(e).display!=='none'})()`);
  const key = async (key, code, keyCode) => {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
    await settle();
  };
  await navigate(sourcePath);
  const expected = await spec(), second = expected.slides[0].content.components.find(c => c.id === 'asset-second');
  const firstDom = await evaluate(`document.querySelector(${JSON.stringify(image('first') + ' img')}).outerHTML`);
  await evaluate(`window.__s7Clicks=[];document.addEventListener('click',e=>{const b=e.target.closest('[data-image-fit]');if(b)window.__s7Clicks.push({fit:b.dataset.imageFit,trusted:e.isTrusted,detail:e.detail})})`);
  const verify = async fit => {
    assert.deepEqual(await spec(), expected, 'fit-only 全 DeckSpec preservation');
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(image('first') + ' img')}).outerHTML`), firstDom);
    for (const id of ['first', 'second']) {
      const component = expected.slides[0].content.components.find(c => c.id === `asset-${id}`);
      const actual = await evaluate(`(async()=>{const img=document.querySelector(${JSON.stringify(image(id) + ' img')});await img.decode();return{src:img.getAttribute('src'),alt:img.alt,fit:getComputedStyle(img).objectFit,width:img.naturalWidth,height:img.naturalHeight}})()`);
      assert.deepEqual(actual, { src: component.dataUri, alt: component.alt, fit: component.fit || 'contain', width: 1, height: 1 });
    }
    if (fit) for (const value of ['contain', 'cover']) {
      assert.equal(await evaluate(`document.querySelector('${button(value)}').getAttribute('aria-pressed')`), String(value === fit));
      assert.equal(await evaluate(`document.querySelector('${button(value)}').disabled`), false);
    }
  };
  const pointerFit = async fit => {
    const before = await position(button(fit));
    assert.ok(before.width > 0 && before.height > 0);
    assert.equal(await evaluate(`Boolean(document.elementFromPoint(${before.x},${before.y})?.closest('${button(fit)}'))`), true);
    await mouse('mousePressed', before, true);
    assert.deepEqual(await position(button(fit)), before, 'pointerdown 取消 preview 不移動 control');
    assert.deepEqual(await selected(), ['component-asset-second']);
    await mouse('mouseReleased', before); await settle();
    second.fit = fit; await verify(fit);
    assert.deepEqual(await selected(), ['component-asset-second']);
    run.checks.push({ wp2s7: 'pointer-fit', fit, rect: before, hit: true });
  };
  await click('[data-action="layout"]'); assert.equal(await visible(), false);
  await click(image('second')); assert.equal(await visible(), true); await verify('cover');
  await pointerFit('contain'); await pointerFit('cover'); await pointerFit('cover');
  await click(image('second')); await verify('cover');

  // Tab 從 contain 移到 cover，再由原生 Space／Enter 啟動；不 dispatch synthetic click。
  await pointerFit('contain'); await key('Tab', 'Tab', 9);
  assert.equal(await evaluate("document.activeElement.dataset.imageFit"), 'cover');
  await key('ArrowRight', 'ArrowRight', 39); assert.deepEqual(await spec(), expected);
  await key(' ', 'Space', 32); second.fit = 'cover'; await verify('cover');
  await pointerFit('contain'); await key('Tab', 'Tab', 9); await key('Enter', 'Enter', 13);
  second.fit = 'cover'; await verify('cover');
  const trusted = await evaluate('window.__s7Clicks');
  assert.ok(trusted.every(e => e.trusted)); assert.ok(trusted.some(e => e.detail === 0 && e.fit === 'cover'));
  run.checks.push({ wp2s7: 'native-keyboard', keys: ['Tab', 'ArrowRight', 'Space', 'Enter'], trusted });

  // 截取真正出現 S7 controls 的畫面；不拿 base screenshot 代替。
  await mouse('mouseMoved', { x: 4, y: 4 }); await settle();
  const screenshot = resolve(outputDir, `${width}-s7-selected-image-fit.png`);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(screenshot, Buffer.from(shot.data, 'base64')); run.artifacts.push(screenshot);

  // 兩種 vendor 模式、drag／resize，真 pointer 持續 gesture 時直接按 fit control。
  for (const snap of [false, true]) {
    if (snap) await click('[data-action="snap-layout"]');
    for (const kind of ['drag', 'resize']) {
      await click(image('second'));
      const p = await position(kind === 'resize' ? '.moveable-se' : image('second'), kind === 'resize' ? 0.5 : 0.1, kind === 'resize' ? 0.5 : 0.1);
      await mouse('mouseMoved', p); await mouse('mousePressed', p, true);
      for (let step = 1; step <= 6; step++) await mouse('mouseMoved', { x: p.x + 24 * step / 6, y: p.y + 16 * step / 6 }, true);
      await settle();
      assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true);
      assert.deepEqual(await spec(), expected, 'preview 不寫 canonical');
      await pointerFit(second.fit === 'cover' ? 'contain' : 'cover');
      assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), false);
      run.checks.push({ wp2s7: 'gesture-cancel-fit-only', kind, snap });
    }
  }
  await click('[data-action="snap-layout"]');
  await click('.slide[data-slide-id="portable"] [data-pptskill-element-id="component-portable-quote"]');
  assert.equal(await visible(), false);
  await click(image('second'));
  const p = await position(image('first'));
  for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, modifiers: 8 });
  await settle(); assert.equal((await selected()).length, 2); assert.equal(await visible(), false);
  await click(image('second'));
  await evaluate('document.activeElement?.blur()');
  await key('Escape', 'Escape', 27); assert.equal(await visible(), false);
  await click(image('second'));
  await evaluate("document.querySelector('.slide[data-slide-id=\"asset-other\"]').scrollIntoView()"); await settle();
  await click('.slide[data-slide-id="asset-other"] [data-pptskill-element-id="role-title"]');
  assert.equal(await visible(), false);
  await evaluate("document.querySelector('.slide[data-slide-id=\"portable\"]').scrollIntoView()"); await settle();
  await click(image('second')); await click('[data-action="edit"]'); assert.equal(await visible(), false);
  await click('[data-action="edit"]'); assert.equal(await visible(), false);
  await click('[data-action="layout"]'); await click(image('second')); await verify(second.fit);
  const exported = await assertExport('s7-image-fit', expected);
  assert.equal(await evaluate(`new DOMParser().parseFromString(window.PPTSKILLEditor.exportHtml(),'text/html').querySelectorAll('[data-pptskill-selected-image-toolbar],[data-image-fit]').length`), 0);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported); await click('[data-action="layout"]'); await click(image('second'));
    assert.equal(await visible(), true); await verify(second.fit);
    await pointerFit(second.fit === 'cover' ? 'contain' : 'cover');
    await assertExport('s7-image-fit-offline', expected);
  } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
  run.checks.push({ wp2s7: 'selection-mode-export-offline', newControlsScreenshot: screenshot, preserved: ['first-image', 'geometry', 'alt', 'dataUri', 'other-slide', 'composition', 'typography', 'motion', 'style', 'background'] });
}
