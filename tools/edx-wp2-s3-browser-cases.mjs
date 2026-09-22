import assert from 'node:assert/strict';

// 沿既有 attach-only runner；正向操作一律真實 pointer，synthetic 僅用於 IME 與拒絕路徑。
export async function runStyleCopyBrowserCases({ cdp, evaluate, navigate, sourcePath, width, run, click, position, settle, assertExport }) {
  await navigate(sourcePath);
  const selector = (role = 'title', slide = 'portable') => `.slide[data-slide-id="${slide}"] [data-pptskill-element-id="role-${role}"]`;
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const control = action => `[data-action="${action}"]`;
  const disabled = action => evaluate(`document.querySelector(${JSON.stringify(control(action))}).disabled`);
  const visible = async css => {
    const p = await position(css);
    assert.ok(p.width > 0 && p.height > 0 && p.x >= 0 && p.x < width && p.y >= 0, css + ' 必須有可見尺寸');
    const hit = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(css)}),s=getComputedStyle(e),hit=document.elementFromPoint(${p.x},${p.y});return s.display!=='none'&&s.visibility==='visible'&&Number(s.opacity)>0&&(hit===e||e.contains(hit))})()`);
    assert.equal(hit, true, css + ' pointer 必須命中控制項');
    return p;
  };
  const press = async action => { await visible(control(action)); assert.equal(await disabled(action), false); await click(control(action)); };
  const open = async (role = 'title', slide = 'portable') => {
    const css = selector(role, slide);
    await evaluate(`document.querySelector(${JSON.stringify(css)}).scrollIntoView({block:'center'})`); await settle();
    let p, hit;
    // scroll-snap 可能尚在跨頁定位；限 60 次雙 frame，僅在真實命中後點擊。
    for (let attempt = 0; attempt < 60; attempt++) {
      p = await position(css, 0.1, 0.5);
      hit = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(css)}),h=document.elementFromPoint(${p.x},${p.y});return {ok:h===e||e.contains(h),tag:h?.tagName,role:h?.getAttribute('data-pptskill-element-id'),slide:h?.closest('.slide')?.dataset.slideId,x:${p.x},y:${p.y},scrollY}})()`);
      if (p.width > 0 && p.height > 0 && hit.ok) break;
      await settle();
    }
    assert.equal(hit.ok, true, JSON.stringify({target:css,hit}));
    for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 2 });
    await settle(); assert.equal(await evaluate('document.body.dataset.editorMode'), 'edit');
    assert.equal(await evaluate('document.querySelector("[data-pptskill-typography-toolbar]").hidden'), false);
    for (const action of ['apply-typography', 'copy-style', 'paste-style']) await visible(control(action));
  };
  const apply = async value => {
    await visible('[data-typography-size]'); await click('[data-typography-size]');
    // 真實 number input 焦點與鍵盤選取，避免直接改 canonical API。
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: process.platform === 'darwin' ? 4 : 2, commands: ['selectAll'] });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: process.platform === 'darwin' ? 4 : 2 });
    await cdp.send('Input.insertText', { text: String(value) });
    assert.equal(await evaluate('document.querySelector("[data-typography-size]").value'), String(value));
    await press('apply-typography');
  };
  const checkFont = async (role, slide, size) => {
    const result = await evaluate(`(()=>{const s=window.PPTSKILLEditor.getDeckSpec().slides.find(s=>s.id===${JSON.stringify(slide)}),e=document.querySelector(${JSON.stringify(selector(role, slide))});return {canonical:s.composition.typographyOverrides?.['role-${role}']?.fontSize??null,computed:getComputedStyle(e).fontSize}})()`);
    assert.deepEqual(result, { canonical: size, computed: size + 'px' });
  };
  const rejected = async (operation, role = 'title', slide = 'portable', value = {}) => {
    const error = await evaluate(`(()=>{try{window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation, target: { slideId: slide, elementId: 'role-' + role }, value })});return ''}catch(e){return e.message}})()`);
    assert.ok(error, operation + ' 應拒絕'); return error;
  };
  const before = await spec();
  await open(); assert.equal(await disabled('copy-style'), true); assert.equal(await disabled('paste-style'), true);
  await rejected('copy-style'); await rejected('paste-style'); assert.deepEqual(await spec(), before);
  await apply(64); assert.equal(await disabled('copy-style'), false); await press('copy-style');
  assert.equal(await disabled('paste-style'), false); const copied = await spec();
  await press('copy-style'); assert.deepEqual(await spec(), copied);
  await open('subtitle'); assert.equal(await disabled('copy-style'), true); await press('paste-style'); await checkFont('subtitle', 'portable', 64);
  const once = await spec(); await press('paste-style'); assert.deepEqual(await spec(), once);
  await rejected('copy-style', 'subtitle', 'portable', { fontSize: 90 });
  await rejected('paste-style', 'subtitle', 'foreign'); assert.deepEqual(await spec(), once);
  await open(); await apply(88); await press('reset-typography'); assert.equal(await disabled('copy-style'), true);
  await rejected('copy-style');
  await open('title', 'typography-other'); await press('paste-style'); await checkFont('title', 'typography-other', 64);
  run.checks.push({ wp2s3: 'pointer-visible-title-subtitle-cross-slide-snapshot', rectAndHit: true, sourceChangedAndReset: true, repeatedPaste: true });

  // IME copy/paste UI/API 全拒絕，完整 compositionend 才允許提交。
  await open(); await apply(72); const preIme = await spec();
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector())});e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.textContent='部分組字';return true})()`);
  for (const action of ['copy-style', 'paste-style']) { await press(action); assert.match(await rejected(action), /IME|組字/); }
  assert.deepEqual(await spec(), preIme);
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector())});e.textContent='完整組字標題';e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));return true})()`);
  assert.equal((await spec()).slides[0].content.title, '完整組字標題');
  // 真實 text 輸入後移焦到 copy，確認不吞字且取得當下 explicit 72。
  await open(); await cdp.send('Input.insertText', { text: '同步文字' });
  const fullText = await evaluate(`document.querySelector(${JSON.stringify(selector())}).textContent.trim()`);
  await press('copy-style'); assert.equal((await spec()).slides[0].content.title, fullText);
  await open('subtitle'); await cdp.send('Input.insertText', { text: '副標同步' });
  const subtitle = await evaluate(`document.querySelector(${JSON.stringify(selector('subtitle'))}).textContent.trim()`);
  await press('paste-style'); assert.equal((await spec()).slides[0].content.subtitle, subtitle); await checkFont('subtitle', 'portable', 72);
  run.checks.push({ wp2s3: 'ime-ui-api-atomic-and-focus-sync', syntheticCompositionEvent: true, nativeOsIme: false });

  for (const action of ['layout', 'edit']) {
    await open(); const snapshot = await spec(); await press(action);
    assert.equal(await evaluate('document.querySelector("[data-pptskill-typography-toolbar]").hidden'), true);
    for (const operation of ['copy-style', 'paste-style']) {
      assert.equal(await disabled(operation), true); await rejected(operation);
      await evaluate(`document.querySelector(${JSON.stringify(control(operation))}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    }
    assert.deepEqual(await spec(), snapshot);
  }
  await open(); const beforeSwitch = await spec();
  await evaluate(`document.querySelector('.slide[data-slide-id="typography-other"]').scrollIntoView({block:'center'})`); await settle();
  const blank = await position('.slide[data-slide-id="typography-other"]', 0.02, 0.5);
  for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: blank.x, y: blank.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  await settle(); assert.equal(await evaluate('document.querySelector("[data-pptskill-typography-toolbar]").hidden'), true);
  for (const operation of ['copy-style', 'paste-style']) await rejected(operation);
  assert.deepEqual(await spec(), beforeSwitch);
  await open('subtitle', 'typography-other'); await press('paste-style'); await checkFont('subtitle', 'typography-other', 72);
  const committed = await spec();
  const expected = structuredClone(before);
  expected.slides[0].content.title = fullText; expected.slides[0].content.subtitle = subtitle;
  expected.slides[0].composition.typographyOverrides = { 'role-title': { fontSize: 72 }, 'role-subtitle': { fontSize: 72 } };
  expected.slides[1].composition.typographyOverrides = { 'role-title': { fontSize: 64 }, 'role-subtitle': { fontSize: 72 } };
  assert.deepEqual(committed, expected);
  const exported = await assertExport('wp2-s3-style-copy-export', committed);
  assert.equal(await evaluate(`(()=>{const d=new DOMParser().parseFromString(window.PPTSKILLEditor.exportHtml(),'text/html');return d.querySelectorAll('[data-pptskill-typography-toolbar],[contenteditable],[data-editor-selected]').length})()`), 0);
  // 匯出後仍用 live clipboard；source 刪除後 snapshot 也必須保持。
  await open();
  const layoutPoint = await visible(control('layout'));
  await cdp.send('Input.dispatchMouseEvent', {type:'mousePressed',x:layoutPoint.x,y:layoutPoint.y,button:'left',buttons:1,clickCount:1});
  const transition = await evaluate(`(()=>{const b=document.querySelector('[data-action="layout"]'),r=b.getBoundingClientRect(),hit=document.elementFromPoint(${layoutPoint.x},${layoutPoint.y});return {mode:document.body.dataset.editorMode,toolbarHidden:document.querySelector('[data-pptskill-typography-toolbar]').hidden,focused:document.activeElement===b,hit:hit===b||b.contains(hit),rect:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`);
  run.checks.push({wp2s3:'title-layout-pointer-transition',afterMouseDown:transition});
  assert.equal(transition.mode, 'edit'); assert.equal(transition.toolbarHidden, false); assert.equal(transition.focused, true); assert.equal(transition.hit, true);
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseReleased',x:layoutPoint.x,y:layoutPoint.y,button:'left',buttons:0,clickCount:1}); await settle();
  assert.equal(await evaluate('document.body.dataset.editorMode'), 'layout');
  assert.equal(await evaluate('document.querySelector("[data-pptskill-typography-toolbar]").hidden'), true);
  await press('delete'); await open('title', 'typography-other'); await press('paste-style'); await checkFont('title', 'typography-other', 72);
  assert.equal((await spec()).slides.length, 1);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await navigate(exported); assert.deepEqual(await spec(), committed);
  await open(); assert.equal(await disabled('paste-style'), true); await rejected('paste-style'); assert.deepEqual(await spec(), committed);
  await checkFont('title', 'portable', 72); await checkFont('subtitle', 'portable', 72); await checkFont('title', 'typography-other', 64);
  run.checks.push({ wp2s3: 'export-live-clipboard-source-delete-offline-empty', canonicalPreserved: true, chrome: 0, staleTargetsRejected: true });
}
