import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// API／setter 故障／IME 為 evaluate fixture；drag／resize 使用真 pointer。
// 正式 listener、雙 viewport、targetClosed 與離線生命週期沿既有 runner。
export async function runEditTextComponentBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport }) {
  await navigate(sourcePath);
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const request = (value, slideId = 'portable', elementId = 'component-portable-quote') => ({ operation: 'edit-text', target: { slideId, elementId }, value });
  const selector = (slide = 'portable', id = 'portable-quote') => `.slide[data-slide-id="${slide}"] [data-edit-target="slides.${slide}.content.components.${id}"]`;
  const text = '  e\u0301\n😀 <script>window.__s14Executed=true</script><img src=x><a href="x">連結</a> &  ';
  const expected = await spec();
  await evaluate(`window.__s14Nodes=[...document.querySelectorAll('.slide,.slide [data-edit-target]')];window.__s14Trusted=[];window.addEventListener('pointerdown',e=>window.__s14Trusted.push(e.isTrusted),true)`);
  const edit = async r => {
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify(r)})`);
    const slide = expected.slides.find(s => s.id === r.target.slideId);
    const actual = await evaluate(`document.querySelector('.slide[data-slide-id="${r.target.slideId}"] [data-pptskill-element-id="${r.target.elementId}"]').dataset.editTarget`);
    slide.content.components.find(c => actual === `slides.${slide.id}.content.components.${c.id}`).text = r.value;
    assert.deepEqual(await spec(), expected);
    assert.equal(await evaluate('window.__s14Nodes.every(n=>n.isConnected)'), true);
  };
  const verify = async (slide = 'portable', id = 'portable-quote') => {
    const canonical = expected.slides.find(s => s.id === slide).content.components.find(c => c.id === id);
    const actual = await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector(slide, id))});return{text:n.textContent,editable:n.isContentEditable,children:n.children.length,executed:window.__s14Executed===true}})()`);
    assert.deepEqual(actual, { text: canonical.text, editable: false, children: 0, executed: false });
  };
  await click('[data-action="edit"]'); await edit(request(text)); await verify();
  // 元件 API 不提交其他 role 的待編輯 DOM；IME fixture 明確拒絕。
  assert.equal(await evaluate(`(()=>{const n=document.querySelector('.slide[data-slide-id="portable"] [data-pptskill-element-id="role-title"]'),before=window.PPTSKILLEditor.getDeckSpec();const old=n.textContent;n.textContent='未提交';n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));let rejected=false;try{window.PPTSKILLEditor.executeOperation(${JSON.stringify(request('IME 拒絕'))})}catch(e){rejected=/IME/.test(e.message)}const unchanged=JSON.stringify(before)===JSON.stringify(window.PPTSKILLEditor.getDeckSpec())&&n.textContent==='未提交';n.textContent=old;n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));return rejected&&unchanged})()`), true);
  await click('[data-action="layout"]');
  // asset fixture 未給舊 quote geometry；沿既有 UI 初始化後才驗證 pointer gesture。
  await click(selector()); await click('[data-action="initialize-layout"]');
  const initializedBox = { x: 800, y: 280, width: 640, height: 480 };
  expected.slides[0].composition.geometryOverrides = { ...expected.slides[0].composition.geometryOverrides, 'portable-quote': initializedBox };
  assert.deepEqual(await spec(), expected);
  run.checks.push({ wp2s14: 'real-pointer-initialize-geometry', canonical: initializedBox });
  const insert = { operation: 'insert-element', target: { slideId: 'asset-other' }, value: { component: { id: 's14-new', type: 'text', text: '新元件' }, geometry: { x: 600, y: 400, width: 240, height: 160 } } };
  await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify(insert)})`);
  const other = expected.slides.find(s => s.id === 'asset-other'); other.content.components.push(insert.value.component); other.composition.geometryOverrides = { ...other.composition.geometryOverrides, 's14-new': insert.value.geometry };
  await edit(request(text, 'asset-other', 'component-s14-new')); await verify('asset-other', 's14-new');
  // 原地 setter 先 throw／先改再 throw 均保留原 root 與子文字節點。
  for (const after of [false, true]) {
    assert.equal(await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector())}),children=[...n.childNodes],before=document.querySelector('.deck').outerHTML,state=JSON.stringify(window.PPTSKILLEditor.getDeckSpec()),d=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');Object.defineProperty(n,'textContent',{configurable:true,get(){return d.get.call(this)},set(v){if(${after})d.set.call(this,v);throw Error('S14 setter fixture')}});let rejected=false;try{window.PPTSKILLEditor.executeOperation(${JSON.stringify(request('不得提交'))})}catch(e){rejected=e.message==='S14 setter fixture'}finally{delete n.textContent}return rejected&&n===document.querySelector(${JSON.stringify(selector())})&&children.every((c,i)=>n.childNodes[i]===c)&&before===document.querySelector('.deck').outerHTML&&state===JSON.stringify(window.PPTSKILLEditor.getDeckSpec())})()`), true);
  }
  const start = async kind => {
    await click(selector());
    const css = kind === 'resize' ? '.moveable-se' : selector();
    const p = await position(css, kind === 'resize' ? 0.5 : 0.1, kind === 'resize' ? 0.5 : 0.1);
    assert.equal(await evaluate(`Boolean(document.elementFromPoint(${p.x},${p.y})?.closest(${JSON.stringify(css)}))`), true);
    const scale = await evaluate(`document.querySelector('.slide[data-slide-id="portable"]').getBoundingClientRect().width/1600`);
    await mouse('mouseMoved', p); await mouse('mousePressed', p, true);
    for (let step = 1; step <= 6; step++) await mouse('mouseMoved', { x: p.x + 24 * scale * step / 6, y: p.y + 16 * scale * step / 6 }, true);
    await settle(); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true);
    return { x: p.x + 24 * scale, y: p.y + 16 * scale };
  };
  for (const snap of [false, true]) {
    if (snap) await click('[data-action="snap-layout"]');
    for (const kind of ['drag', 'resize']) {
      const originalBox = await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector())});return [n.style.left,n.style.top,n.style.width,n.style.height]})()`);
      const p = await start(kind), before = await spec();
      const result = await evaluate(`(()=>{const api=window.PPTSKILLEditor,before=document.querySelector('.deck').outerHTML,selection=JSON.stringify(api.layout.getSelectionState());let count=0;for(const r of ${JSON.stringify([request(''), request('😀'.repeat(501)), request('非文字', 'portable', 'component-asset-second')])})try{api.executeOperation(r)}catch{count++}api.executeOperation(${JSON.stringify(request(expected.slides[0].content.components[0].text))});return{count,dom:before===document.querySelector('.deck').outerHTML,selection:selection===JSON.stringify(api.layout.getSelectionState()),gesture:api.layout.getState().gesturing}})()`);
      assert.deepEqual(result, { count: 3, dom: true, selection: true, gesture: true });
      await edit(request(`${text}${snap ? '吸附' : '自由'}${kind}`, 'asset-other', 'component-s14-new'));
      await mouse('mouseReleased', p); await settle();
      assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), false);
      assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected'), []);
      assert.deepEqual((await spec()).slides[0], before.slides[0]);
      assert.deepEqual(await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector())});return [n.style.left,n.style.top,n.style.width,n.style.height]})()`), originalBox);
      assert.deepEqual(await spec(), expected); await verify(); await verify('asset-other', 's14-new');
      run.checks.push({ wp2s14: 'real-pointer-preview-cancel', snap, kind, noOpPreserved: true, invalidPreserved: true });
    }
  }
  assert.equal(await evaluate('window.__s14Trusted.length>0&&window.__s14Trusted.every(Boolean)'), true);
  await click(selector()); await mouse('mouseMoved', { x: 4, y: 4 }); await settle();
  const screenshot = resolve(outputDir, `${width}-s14-edit-text-component.png`);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }); await writeFile(screenshot, Buffer.from(shot.data, 'base64')); run.artifacts.push(screenshot);
  const exported = await assertExport('s14-edit-text-component', expected);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported); await verify(); await verify('asset-other', 's14-new');
    await evaluate(`window.__s14Nodes=[...document.querySelectorAll('.slide,.slide [data-edit-target]')]`);
    await edit(request('離線重新編輯')); await edit(request('離線新元件再編輯', 'asset-other', 'component-s14-new'));
    await evaluate(`window.PPTSKILLEditor.executeOperation({operation:'move-element',target:{slideId:'asset-other',elementId:'component-s14-new'},value:{x:620,y:420}})`);
    Object.assign(other.composition.geometryOverrides['s14-new'], { x: 620, y: 420 });
    const reinsert = structuredClone(insert); reinsert.value.component.id = 's14-offline';
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify(reinsert)})`);
    other.content.components.push(reinsert.value.component); other.composition.geometryOverrides['s14-offline'] = reinsert.value.geometry;
    await edit(request('離線插入後編輯', 'asset-other', 'component-s14-offline'));
    await assertExport('s14-edit-text-component-offline', expected);
  } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
  run.checks.push({ wp2s14: 'API-fixture-existing-new-crossslide-escape-setter-IME-offline', screenshot, directEditable: false });
}
