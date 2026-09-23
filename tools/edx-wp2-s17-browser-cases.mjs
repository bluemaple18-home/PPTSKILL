import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// 沿 S16 harness helper；真 pointer／文字／Escape 與 synthetic fault 分開記錄。
export async function runTextDoubleClickBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport }) {
  const root = '.slide[data-slide-id="portable"]';
  const selector = root + ' [data-pptskill-element-id="component-s17-text"]';
  const image = root + ' [data-pptskill-element-id="component-asset-second"]';
  const title = root + ' [data-pptskill-element-id="role-title"]';
  const dialog = '[data-insert-text-dialog]', input = '[data-insert-text-value]';
  const submit = '[data-action="submit-insert-text"]', cancel = '[data-action="cancel-insert-text"]';
  const original = '  e\u0301\n😀 <b>原文</b> &  ';
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const isOpen = () => evaluate(`document.querySelector('${dialog}').open`);
  const record = (claim, kind = '真 CDP pointer／Input.insertText／keyboard') => run.checks.push({ wp2s17: claim, kind });
  const key = async (key, code, windowsVirtualKeyCode, extra = {}) => {
    for (const type of ['keyDown', 'keyUp']) await cdp.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode, ...extra });
    await settle();
  };
  const observe = () => evaluate(`(()=>{
    window.__s17Dblclicks=[];window.__s17Inputs=[];
    document.addEventListener('dblclick',e=>window.__s17Dblclicks.push({trusted:e.isTrusted,elementId:e.target.closest?.('[data-pptskill-element-id]')?.dataset.pptskillElementId||null}),true);
    document.addEventListener('input',e=>{if(e.target.matches?.('${input}'))window.__s17Inputs.push({trusted:e.isTrusted})},true);
    return true;
  })()`);
  const doubleClick = async (css, modifiers = 0, fx = 0.5, fy = 0.5) => {
    const count = await evaluate('window.__s17Dblclicks.length'), p = await position(css, fx, fy);
    assert.equal(await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(css)}),hit=document.elementFromPoint(${p.x},${p.y});return !!hit&&(hit===n||n.contains(hit))})()`), true, 'pointer 必須命中目標');
    await mouse('mouseMoved', p);
    for (const clickCount of [1, 2]) {
      await mouse('mousePressed', p, true, { clickCount, modifiers });
      await mouse('mouseReleased', p, false, { clickCount, modifiers });
      await settle();
    }
    const events = await evaluate(`window.__s17Dblclicks.slice(${count})`);
    assert.equal(events.length, 1, '一次雙擊必須只有一個 dblclick');
    assert.equal(events[0].trusted, true, '必須是 CDP 真 pointer');
    return events[0];
  };
  const syntheticDoubleClick = async css => {
    const trusted = await evaluate(`(()=>{const e=new MouseEvent('dblclick',{bubbles:true,button:0,detail:2});document.querySelector(${JSON.stringify(css)}).dispatchEvent(e);return e.isTrusted})()`);
    assert.equal(trusted, false); await settle();
  };
  const type = async value => {
    const count = await evaluate('window.__s17Inputs.length');
    await click(input); await key('a', 'KeyA', 65, { modifiers: 4, commands: ['selectAll'] });
    await cdp.send('Input.insertText', { text: value }); await settle();
    assert.equal(await evaluate(`document.querySelector('${input}').value`), value);
    assert.equal(await evaluate(`window.__s17Inputs.slice(${count}).some(e=>e.trusted)`), true);
  };
  const open = async () => {
    await doubleClick(selector); assert.equal(await isOpen(), true);
    assert.equal(await evaluate(`document.activeElement===document.querySelector('${input}')`), true);
    assert.equal(await evaluate(`document.querySelector('#pptskill-insert-text-label').textContent`), '編輯文字（1–500 字元）');
    assert.equal(await evaluate(`document.querySelector('${submit}').textContent`), '儲存');
  };
  const screenshot = async label => {
    for (const css of [dialog, input, submit, cancel]) assert.equal(await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(css)}).getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()`), true, css + ' 不得 clipping');
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const png = Buffer.from(data, 'base64'), path = resolve(outputDir, `${width}-s17-${label}.png`);
    await writeFile(path, png); run.artifacts.push({ label: `s17-${label}`, path, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') });
  };
  let expected;
  const component = () => expected.slides.find(s => s.id === 'portable').content.components.find(c => c.id === 's17-text');
  const save = async value => {
    await type(value); await click(submit); component().text = value;
    assert.deepEqual(await spec(), expected); assert.equal(await isOpen(), false);
    assert.equal(await evaluate(`document.querySelector('${input}').value`), '');
    assert.deepEqual(await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});return{text:n.textContent,children:n.children.length,editable:n.isContentEditable}})()`), { text: value, children: 0, editable: false });
  };

  await navigate(sourcePath); await click('[data-action="layout"]');
  await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'insert-element', target: { slideId: 'portable' }, value: { component: { id: 's17-text', type: 'text', text: original }, geometry: { x: 120, y: 360, width: 480, height: 200 } } })})`);
  expected = await spec(); await observe();
  await click(selector); assert.equal(await isOpen(), false);
  const opening = await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});window.__s17Node=n;window.__s17Root=n.closest('.slide');return{text:n.textContent,style:n.getAttribute('style')}})()`);
  await open(); assert.equal(await evaluate(`document.querySelector('${input}').value`), original);
  assert.deepEqual(await spec(), expected);
  assert.deepEqual(await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});return{text:n.textContent,style:n.getAttribute('style')}})()`), opening);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)})===window.__s17Node&&window.__s17Node.closest('.slide')===window.__s17Root`), true);
  await screenshot('dialog'); record('單擊只選取；雙擊預填同一 dialog，保留 canonical／node／geometry');

  await type('Escape 不提交'); await key('Escape', 'Escape', 27);
  assert.equal(await isOpen(), false); assert.deepEqual(await spec(), expected);
  assert.equal(await evaluate(`document.querySelector('${input}').value`), ''); record('真 Escape 清 draft 且不提交');
  await open(); await type('按鈕取消不提交'); await click(cancel);
  assert.equal(await isOpen(), false); assert.deepEqual(await spec(), expected); record('取消按鈕不提交');

  for (const snap of [false, true]) {
    if (snap) await click('[data-action="snap-layout"]');
    assert.equal(await evaluate(`document.querySelector('[data-action="snap-layout"]').getAttribute('aria-pressed')`), String(snap));
    await click(selector); await open(); await save(`  snap=${snap} <script>x</script>\n😀e\u0301 &  `);
    record(`snap=${snap} 雙擊並純文字儲存，只改指定 text`);
  }

  await click('[data-action="layout"]'); await doubleClick(selector); assert.equal(await isOpen(), false);
  await click('[data-action="edit"]'); await doubleClick(selector); assert.equal(await isOpen(), false);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).isContentEditable`), false);
  await click('[data-action="layout"]'); assert.deepEqual(await spec(), expected); record('play／edit mode 不開 component dialog');
  await click(selector); await doubleClick(selector, 8); assert.equal(await isOpen(), false);
  assert.deepEqual(await spec(), expected); record('真 Shift 雙擊拒絕 component dialog');

  await doubleClick(image); assert.equal(await isOpen(), false);
  assert.equal((await doubleClick(root, 0, 0.96, 0.95)).elementId, null, '必須命中 slide 空白');
  assert.equal(await isOpen(), false); await click(selector);
  await syntheticDoubleClick(image); assert.equal(await isOpen(), false);
  await syntheticDoubleClick('[data-pptskill-editor]'); assert.equal(await isOpen(), false);
  assert.deepEqual(await spec(), expected);
  record('image／空白／chrome／舊 selection 不誤開', '真 image／空白 pointer；synthetic chrome／選錯物件 dblclick');

  await click(selector); const p = await position(image);
  await mouse('mousePressed', p, true, { modifiers: 8 }); await mouse('mouseReleased', p, false, { modifiers: 8 }); await settle();
  assert.equal((await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected')).length, 2);
  await syntheticDoubleClick(selector); assert.equal(await isOpen(), false); assert.deepEqual(await spec(), expected);
  record('保留多選時拒絕 dblclick', '真 Shift pointer 建立多選；synthetic dblclick 避免先改選');
  await click(selector);
  assert.equal(await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)}),clone=n.cloneNode(true);n.parentElement.append(clone);try{clone.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));n.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));return document.querySelector('${dialog}').open}finally{clone.remove()}})()`), false);
  await settle(); assert.deepEqual(await spec(), expected); record('duplicate／偽造 node 拒絕', 'synthetic clone 與 dblclick fault');

  await click(selector);
  await evaluate(`(()=>{const d=document.querySelector('${dialog}');window.__s17ShowModal=d.showModal;d.showModal=()=>{throw Error('S17 showModal fault')};return true})()`);
  try {
    await doubleClick(selector); assert.equal(await isOpen(), false);
    assert.equal(await evaluate(`document.querySelector('${input}').value`), '');
    assert.match(await evaluate(`document.querySelector('[data-editor-status]').textContent`), /S17 showModal fault/);
  } finally { await evaluate(`document.querySelector('${dialog}').showModal=window.__s17ShowModal;true`); }
  await open(); record('showModal failure 回收且下一次雙擊可開', '真 pointer；synthetic showModal throw');
  await type('IME 未完成草稿'); await syntheticDoubleClick(selector);
  assert.equal(await evaluate(`document.querySelector('${input}').value`), 'IME 未完成草稿');
  await evaluate(`document.querySelector('${input}').dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'組'}))`);
  await click(submit); await key('Escape', 'Escape', 27); assert.equal(await isOpen(), true); assert.deepEqual(await spec(), expected);
  await evaluate(`document.querySelector('${input}').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'組字'}))`);
  await click(cancel); assert.equal(await isOpen(), false);
  record('pending 重入不覆蓋 draft，IME 阻擋 save／Escape', 'synthetic dblclick／CompositionEvent；真 Input.insertText／儲存／Escape，非 OS IME');

  await doubleClick(title); assert.equal(await isOpen(), false);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(title)}).isContentEditable`), true);
  await cdp.send('Input.insertText', { text: '角色未儲存草稿' }); await key('Escape', 'Escape', 27);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(title)}).textContent`), expected.slides[0].content.title);
  await click('[data-action="layout"]'); assert.deepEqual(await spec(), expected); record('S1 role 雙擊 direct editing 與 Escape 保留');

  await open(); await type('NEVER_EXPORT_S17');
  const exported = await assertExport('s17-text-double-click', expected);
  assert.ok(!(await readFile(exported, 'utf8')).includes('NEVER_EXPORT_S17'));
  assert.equal(await isOpen(), true); assert.deepEqual(await spec(), expected); record('export 不提交或洩漏 component draft');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported); await observe(); await click('[data-action="layout"]'); await open();
    assert.equal(await evaluate(`document.querySelector('${input}').value`), component().text);
    await screenshot('offline-dialog'); await save('  離線雙擊 <b>仍是純文字</b> 😀  '); record('offline reopen 後雙擊並再次儲存');
    for (let i = 0; i < 2; i++) { await click('[data-action="layout"]'); await click('[data-action="layout"]'); }
    assert.equal(await evaluate(`(()=>{
      const api=window.PPTSKILLEditor,script=document.createElement('script');
      script.textContent=document.querySelector('[data-pptskill-editor-runtime]').textContent;
      document.body.append(script);script.remove();
      const d=document.querySelector('${dialog}'),show=d.showModal;window.__s17Opens=0;d.showModal=function(){window.__s17Opens++;return show.call(this)};
      return window.PPTSKILLEditor===api;
    })()`), true);
    await open(); assert.equal(await evaluate('window.__s17Opens'), 1);
    assert.equal(await evaluate(`document.querySelectorAll('${dialog}').length`), 1);
    await key('Escape', 'Escape', 27); assert.deepEqual(await spec(), expected);
    await assertExport('s17-text-double-click-offline', expected);
    record('remount／bootstrap 保留單一 editor／dialog 入口', '真 pointer；synthetic 同 document runtime bootstrap');
  } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
}
