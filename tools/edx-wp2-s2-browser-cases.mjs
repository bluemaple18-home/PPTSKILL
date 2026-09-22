import assert from 'node:assert/strict';

// 共用 attach-only runner 的雙 viewport、error listeners 與 owned target cleanup。
export async function runTypographyBrowserCases({ cdp, evaluate, navigate, sourcePath, width, run, click, position, settle, assertExport }) {
  await navigate(sourcePath);
  const selector = role => `.slide[data-slide-id="portable"] [data-pptskill-element-id="role-${role}"]`;
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const read = role => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector(role))});return {font:getComputedStyle(e).fontSize,canonical:window.PPTSKILLEditor.getDeckSpec().slides[0].composition.typographyOverrides?.['role-${role}']?.fontSize??null,delay:e.style.getPropertyValue('--pptskill-text-delay')}})()`);
  const open = async role => {
    await evaluate(`document.querySelector(${JSON.stringify(selector(role))}).scrollIntoView({block:'center'})`);
    await settle();
    const p = await position(selector(role), 0.1, 0.5);
    for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 2 });
    await settle();
    assert.equal(await evaluate('document.body.dataset.editorMode'), 'edit');
    assert.equal(await evaluate('document.querySelector("[data-pptskill-typography-toolbar]").hidden'), false);
    const button = await position('[data-action="apply-typography"]');
    assert.ok(button.width > 0 && button.height > 0, '字級控制項必須真實可見與可點擊');
  };
  const fill = async value => {
    await click('[data-typography-size]');
    await evaluate(`(()=>{const input=document.querySelector('[data-typography-size]');input.value=${JSON.stringify(String(value))};input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  };
  const apply = async value => { await fill(value); await click('[data-action="apply-typography"]'); };
  const before = await spec(), defaults = {};
  for (const role of ['title', 'subtitle']) {
    defaults[role] = await read(role);
    await open(role);
    for (const size of [16, 160]) {
      await apply(size); const state = await read(role);
      if (state.font !== size + 'px' || state.canonical !== size) {
        const diagnostic = await evaluate(`(()=>{const b=document.querySelector('[data-action="apply-typography"]'),r=b.getBoundingClientRect();return {status:document.querySelector('[data-editor-status]')?.textContent,input:document.querySelector('[data-typography-size]')?.value,active:document.activeElement?.tagName,toolbarHidden:document.querySelector('[data-pptskill-typography-toolbar]')?.hidden,buttonRect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.tagName}})()`);
        run.checks.push({wp2s2:'font-size-failure-diagnostic',role,size,state,diagnostic});
      }
      assert.equal(state.font, size + 'px', JSON.stringify({role,size,state})); assert.equal(state.canonical, size);
      assert.equal(state.delay, defaults[role].delay);
    }
    const snapshot = await spec();
    for (const value of ['', '15', '161', '20.5', 'not-a-number']) {
      await apply(value); assert.deepEqual(await spec(), snapshot);
      assert.equal((await read(role)).font, '160px');
    }
    await click('[data-action="reset-typography"]');
    assert.deepEqual(await read(role), defaults[role]);
    await apply(role === 'title' ? 64 : 32);
    run.checks.push({ wp2s2: 'true-double-click-boundaries-invalid-reset', role, viewport: width, bounds: [16, 160], invalid: ['', 15, 161, 20.5, 'not-a-number'] });
  }

  // 焦點由待編輯文字移至 number input，必須先同步完整文字。
  await open('title');
  await evaluate(`document.querySelector(${JSON.stringify(selector('title'))}).textContent='焦點移轉後完整標題'`);
  await apply(72);
  assert.equal((await spec()).slides[0].content.title, '焦點移轉後完整標題');
  await open('title');
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector('title'))});e.textContent='修改文字保留字級';e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'修改文字保留字級'}));return true})()`);
  await fill(80);
  assert.equal((await spec()).slides[0].content.title, '修改文字保留字級');
  assert.equal((await read('title')).canonical, 72);
  run.checks.push({ wp2s2: 'toolbar-focus-sync-text-preserves-font', fontSize: 72 });

  await open('title');
  const preComposition = await spec();
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector('title'))});e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));e.textContent='組字部分';return true})()`);
  await apply(80); await click('[data-action="reset-typography"]');
  assert.deepEqual(await spec(), preComposition);
  assert.equal((await read('title')).font, '72px');
  const error = await evaluate(`(()=>{try{window.PPTSKILLEditor.executeOperation({operation:'set-typography',target:{slideId:'portable',elementId:'role-title'},value:{fontSize:80}});return ''}catch(e){return e.message}})()`);
  assert.match(error, /IME|組字/);
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector('title'))});e.textContent='組字完成標題';e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'組字完成標題'}));return true})()`);
  assert.equal((await spec()).slides[0].content.title, '組字完成標題');
  assert.equal((await read('title')).canonical, 72);
  run.checks.push({ wp2s2: 'composition-guard', syntheticCompositionEvent: true, nativeOsIme: false });

  // toolbar target 必須清除，包含重新進入 edit mode 但尚未選文字的情況。
  for (const mode of ['layout', 'edit']) {
    await open('title'); const snapshot = await spec();
    await click(`[data-action="${mode}"]`);
    assert.equal(await evaluate('document.querySelector("[data-pptskill-typography-toolbar]").hidden'), true);
    await evaluate(`document.querySelector('[data-action="apply-typography"]').click()`);
    assert.deepEqual(await spec(), snapshot);
  }
  await open('title'); const beforeSwitch = await spec();
  await evaluate(`(()=>{const slide=document.querySelector('.slide[data-slide-id="typography-other"]');slide.scrollIntoView({block:'center'});return true})()`);
  await settle();
  const blank = await position('.slide[data-slide-id="typography-other"]', 0.02, 0.5);
  for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: blank.x, y: blank.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  await settle();
  assert.equal(await evaluate('document.querySelector("[data-pptskill-typography-toolbar]").hidden'), true);
  await evaluate(`document.querySelector('[data-action="apply-typography"]').click()`);
  assert.deepEqual(await spec(), beforeSwitch);
  run.checks.push({ wp2s2: 'slide-mode-clears-target', modes: ['layout', 'play'], wrongSlideMutation: false });

  const committed = await spec();
  assert.deepEqual(committed.style, before.style);
  assert.deepEqual(committed.slides[1], before.slides[1]);
  const composition = structuredClone(committed.slides[0].composition); delete composition.typographyOverrides;
  assert.deepEqual(composition, before.slides[0].composition);
  assert.deepEqual(committed.slides[0].content.components, before.slides[0].content.components);
  const exported = await assertExport('wp2-s2-typography-export', committed);
  const exportedChrome = await evaluate(`(()=>{const d=new DOMParser().parseFromString(window.PPTSKILLEditor.exportHtml(),'text/html');return d.querySelectorAll('[data-pptskill-typography-toolbar],[contenteditable],[data-editor-selected]').length})()`);
  assert.equal(exportedChrome, 0);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await navigate(exported); assert.deepEqual(await spec(), committed);
  for (const [role, size] of [['title', 72], ['subtitle', 32]]) {
    assert.equal((await read(role)).font, size + 'px');
    await open(role); await click('[data-action="reset-typography"]');
    assert.deepEqual(await read(role), defaults[role]);
  }
  assert.equal((await spec()).slides[0].composition.typographyOverrides, undefined);
  run.checks.push({ wp2s2: 'export-offline-reopen-reset', preserved: ['content', 'geometry', 'motion', 'background', 'style', 'otherSlides'], chrome: 0 });
}
