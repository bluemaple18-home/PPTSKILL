import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { buildMotionFixture, motionTreatments } from './edx-wp1-s3-motion-browser-cases.mjs';

// 只在首個 drag/Escape case 觀測；capture 是 handler 前狀態，完成狀態由明確 checkpoint 記錄。
export function installSnapCancelDiagnostic(window) {
  const document = window.document, entries = [];
  const describe = node => node ? {
    tag: node.tagName, elementId: node.closest?.('[data-pptskill-element-id]')?.dataset.pptskillElementId ?? null,
    action: node.closest?.('[data-action]')?.dataset.action ?? null,
    chrome: Boolean(node.closest?.('.pptskill-editor,[data-pptskill-editor-chrome]')),
    editable: Boolean(node.isContentEditable), contenteditable: node.getAttribute?.('contenteditable') ?? null,
    role: node.getAttribute?.('role') ?? null,
  } : null;
  const snapshot = (phase, event) => {
    entries.push({ phase, state: window.PPTSKILLEditor.layout.getState(),
      proxies: document.querySelectorAll('[data-pptskill-editor-chrome="geometry-target"]').length,
      controls: document.querySelectorAll('.moveable-control-box').length, active: describe(document.activeElement),
      ...(event ? { event: { type: event.type, trusted: event.isTrusted, target: describe(event.target),
        key: event.key, keyCode: event.keyCode, composing: event.isComposing,
        ctrl: event.ctrlKey, meta: event.metaKey, alt: event.altKey, shift: event.shiftKey,
        buttons: event.buttons, detail: event.detail, pointerId: event.pointerId,
        x: event.clientX, y: event.clientY, defaultPreventedAtCapture: event.defaultPrevented } } : {}),
    });
  };
  const types = ['keydown', 'keyup', 'pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click'];
  const capture = event => snapshot('capture', event);
  for (const type of types) window.addEventListener(type, capture, true);
  snapshot('installed');
  return { snapshot, read: () => entries, dispose() { for (const type of types) window.removeEventListener(type, capture, true); } };
}

// 僅由 S4 attach-only harness 呼叫；真 pointer/control 與 synthetic cancel 分別記錄。
export async function runSnapBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, selector, run,
  click, position, mouse, settle, startGesture, endGesture, assertExport, assertRect }) {
  const base = { x: 803, y: 283, width: 637, height: 477 };
  const target = { slideId: 'portable', elementId: 'component-portable-quote' };
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const rect = s => s.slides[0].composition.geometryOverrides['portable-quote'];
  const operate = (operation, value) => evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation, target, value })})`);
  const snapOn = () => evaluate('document.querySelector("[data-action=snap-layout]").getAttribute("aria-pressed")==="true"');
  const proxyCount = () => evaluate('document.querySelectorAll("[data-pptskill-editor-chrome=geometry-target]").length');
  const key = async (name, modifiers = 0) => {
    const code = { Enter: 13, Escape: 27, ArrowRight: 39, ArrowDown: 40 }[name];
    for (const type of ['keyDown', 'keyUp']) await cdp.send('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: code, modifiers, ...(name === 'Enter' && type === 'keyDown' ? { text: '\r', unmodifiedText: '\r' } : {}) });
  };
  const ready = async (enabled = true) => {
    await operate('resize-element', { width: base.width, height: base.height });
    await operate('move-element', { x: base.x, y: base.y });
    if (!await evaluate('window.PPTSKILLEditor.layout.getState().enabled')) await click('[data-action=layout]');
    if (await snapOn() !== enabled) await click('[data-action=snap-layout]');
    await click(selector); await settle();
    assert.equal(await proxyCount(), enabled ? 1 : 0);
  };
  const route = async (kind, deltas, preview) => {
    const p = await position(kind === 'resize' ? '.moveable-se' : selector, kind === 'resize' ? 0.5 : 0.04);
    if (kind === 'resize') {
      const handle = await evaluate(`(()=>{const e=document.querySelector('.moveable-se'),c=getComputedStyle(e),hit=document.elementFromPoint(${p.x},${p.y});return{visibility:c.visibility,pointerEvents:c.pointerEvents,hitHandle:!!hit?.closest('.moveable-se'),hitClass:hit?.className,gesturing:window.PPTSKILLEditor.layout.getState().gesturing}})()`);
      (run.snapHandleChecks ||= []).push({ enabled: await snapOn(), point: p, ...handle });
      assert.equal(handle.visibility, 'visible', '首次 SE handle 必須可見；harness 不代呼叫 updateRect');
      assert.equal(handle.hitHandle, true, '真 pointer 必須命中 SE handle');
    }
    await mouse('mouseMoved', p); await mouse('mousePressed', p, true);
    let last = p;
    for (const delta of deltas) {
      last = { x: p.x + delta * width / 1600, y: p.y + delta * width / 1600 };
      await mouse('mouseMoved', last, true); await settle();
    }
    if (preview) await preview();
    await endGesture(last);
  };
  await navigate(sourcePath);
  assert.equal(await snapOn(), false, '初始 off');
  await click('[data-action=layout]'); await click(selector);
  await click('[data-action=snap-layout]'); assert.equal(await proxyCount(), 0, 'legacy 不偷初始化');
  await click('[data-action=initialize-layout]');
  for (const enabled of [false, true]) for (const kind of ['drag', 'resize']) {
    for (const [name, deltas, positive] of [['positive', [10], true], ['negative', [-10], false], ['multi', [10, 20, -10], false], ['zero', [], null], ['return', [10, 20, 0], null]]) {
      await ready(enabled); const before = await spec();
      await route(kind, deltas, async () => {
        assert.deepEqual(await spec(), before);
        if (name === 'multi') await assertExport(`snap-${enabled}-${kind}-preview`, before);
      });
      let expected = base;
      if (positive !== null) {
        const delta = positive ? 10 : -10;
        expected = kind === 'drag'
          ? { ...base, x: enabled ? (positive ? 816 : 792) : base.x + delta, y: enabled ? (positive ? 296 : 272) : base.y + delta }
          : { ...base, width: enabled ? (positive ? 645 : 629) : base.width + delta, height: enabled ? (positive ? 485 : 469) : base.height + delta };
      }
      assert.deepEqual(rect(await spec()), expected); await assertRect(expected);
      run.checks.push({ s7: name, enabled, kind, expected });
    }
  }
  for (const kind of ['drag', 'resize']) for (const reason of ['escape', 'pointercancel', 'toggle', 'blur', 'resize', 'scroll', 'text', 'selection', 'stale']) {
    await ready(); const before = await spec(), diagnostic = kind === 'drag' && ['escape', 'toggle'].includes(reason);
    if (diagnostic) await evaluate(`window.__s7CancelDiagnostic=(${installSnapCancelDiagnostic.toString()})(window);true`);
    try {
      const p = await startGesture(kind, 10, 10);
      if (diagnostic) await evaluate('window.__s7CancelDiagnostic.snapshot("after-start")');
      if (reason === 'escape') await key('Escape');
      if (reason === 'pointercancel') await evaluate('document.dispatchEvent(new PointerEvent("pointercancel",{bubbles:true}))');
      if (['blur', 'resize', 'scroll'].includes(reason)) await evaluate(`window.dispatchEvent(new Event(${JSON.stringify(reason)}))`);
      // pointer 已按下時由 DOM click 觸發真 control handler；一般開關另以上方真 mouse click 驗證。
      if (reason === 'toggle') await evaluate('document.querySelector("[data-action=snap-layout]").click()');
      if (reason === 'text') await evaluate('document.querySelector("[data-action=edit]").click()');
      if (reason === 'selection') await evaluate('document.querySelector(".slide h1,.slide h2").click()');
      if (reason === 'stale') await evaluate(`window.PPTSKILLEditor.executeOperation({operation:"edit-text",target:{slideId:"portable",elementId:"role-title"},value:${JSON.stringify('版本更新-' + kind)}})`);
      if (diagnostic) await evaluate('window.__s7CancelDiagnostic.snapshot("after-cancel-before-release")');
      await endGesture(p);
      if (diagnostic) await evaluate('window.__s7CancelDiagnostic.snapshot("after-release")');
    } finally {
      if (diagnostic) run.snapCancelDiagnostic = await evaluate('(()=>{const d=window.__s7CancelDiagnostic;try{return d.read()}finally{d.dispose();delete window.__s7CancelDiagnostic}})()');
    }
    assert.deepEqual(rect(await spec()), base);
    if (reason !== 'stale') assert.deepEqual(await spec(), before);
    assert.equal(await proxyCount(), 0);
    run.checks.push({ s7: 'cancel', kind, reason, synthetic: reason !== 'escape' });
  }
  // 單一滑鼠按住時無法再左鍵點第二個按鈕；另驗可達的鍵盤 Enter activation，保留上方 synthetic 契約。
  for (const kind of ['drag', 'resize']) for (const action of ['snap-layout', 'edit']) {
    await ready(); const before = await spec(), p = await startGesture(kind, 10, 10);
    await evaluate(`(()=>{window.__s7ControlClick=null;window.__s7ObserveControl=e=>{window.__s7ControlClick={trusted:e.isTrusted,detail:e.detail,action:e.target.closest?.('[data-action]')?.dataset.action}};window.addEventListener('click',window.__s7ObserveControl,true);document.querySelector('[data-action="${action}"]').focus()})()`);
    const focus = await evaluate(`(()=>{const b=document.querySelector('[data-action="${action}"]');return{focused:document.activeElement===b,disabled:b.disabled,documentFocus:document.hasFocus()}})()`);
    (run.snapControlFocus ||= []).push({kind,action,...focus});
    assert.equal(focus.focused,true); assert.equal(focus.disabled,false);
    let activation;
    try {
      await key('Enter');
      activation = await evaluate('window.__s7ControlClick');
      assert.deepEqual(activation, { trusted: true, detail: 0, action }, '必須是 browser 原生 Enter click');
      assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), false);
      if (action === 'snap-layout') assert.equal(await snapOn(), false);
      else assert.equal(await evaluate('document.body.dataset.editorMode'), 'edit');
      await endGesture(p); assert.deepEqual(await spec(), before); assert.equal(await proxyCount(), 0);
      run.checks.push({ s7: 'gesture-control', kind, activation, focus: 'programmatic；啟用使用真 Enter' });
    } finally {
      await evaluate('window.removeEventListener("click",window.__s7ObserveControl,true);delete window.__s7ObserveControl;delete window.__s7ControlClick');
    }
  }
  for (const kind of ['drag', 'resize']) {
    await ready(); const before = await spec(); const p = await startGesture(kind, kind === 'drag' ? -740 : -600, 0);
    await endGesture(p); assert.deepEqual(await spec(), before); assert.equal(await proxyCount(), 0);
    assert.match(await evaluate('document.querySelector("[data-editor-status]").textContent'), /未套用/);
    run.checks.push({ s7: 'bounds/minimum 原子拒絕', kind });
  }
  await ready(); await key('ArrowRight'); await key('ArrowDown', 8);
  assert.deepEqual(rect(await spec()), { ...base, x: 804, y: 293 });
  for (const tag of ['input', 'textarea']) {
    const before = await spec(), selection = await evaluate('window.PPTSKILLEditor.layout.getState()');
    await evaluate(`(()=>{const e=document.createElement(${JSON.stringify(tag)});e.id='s7-input';document.body.append(e);e.focus()})()`);
    await key('ArrowRight'); await key('Escape'); assert.deepEqual(await spec(), before);
    assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getState()'), selection);
    await evaluate('document.getElementById("s7-input").remove()');
  }
  const guarded = await spec(), p = await startGesture('drag', 10, 10);
  for (const modifiers of [1, 2, 4]) { await key('Escape', modifiers); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true); }
  await evaluate('document.dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true}))');
  await key('Escape'); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true);
  await evaluate('document.dispatchEvent(new CompositionEvent("compositionend",{bubbles:true}))');
  await key('Escape'); await endGesture(p); assert.deepEqual(await spec(), guarded);
  assert.equal(await proxyCount(), 0); run.checks.push('S7 keyboard 1/10px；modifier/IME guardedEscape');
  await ready(); const committed = await spec();
  const preview = await startGesture('drag', 10, 10);
  const exported = await assertExport('snap-offline-preview', committed);
  await key('Escape'); await endGesture(preview);
  await navigate(exported); assert.deepEqual(await spec(), committed); assert.equal(await snapOn(), false);
  assert.equal(await proxyCount(), 0); await ready();
  const drag = await startGesture('drag', 10, 10); await endGesture(drag);
  assert.deepEqual(rect(await spec()), { ...base, x: 816, y: 296 });
  run.checks.push('S7 preview export/offline reopen，snap 重設 off 且重新啟用可拖曳');

  // 使用正式 motion runtime／三個既有 treatment，不用 synthetic transform 假裝 motion PASS。
  for (const treatment of motionTreatments) for (const mode of ['normal', 'reduced', 'static']) {
    const fixture = await buildMotionFixture(treatment), path = resolve(outputDir, `${width}-snap-${treatment}-${mode}.html`);
    await writeFile(path, fixture.html); let staticScript;
    try {
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: mode === 'reduced' ? 'reduce' : 'no-preference' }] });
      if (mode === 'static') staticScript = (await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__PPTSKILL_FORCE_STATIC__=true;' })).identifier;
      await navigate(path); await ready();
      const measureMotion = () => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),c=getComputedStyle(e);return{transform:c.transform,opacity:c.opacity,treatment:e.dataset.effectTreatment,inline:e.style.transform,animations:e.getAnimations().map(a=>({state:a.playState,time:a.currentTime}))}})()`);
      const pause = () => evaluate('new Promise(ok=>setTimeout(()=>ok(true),1500))');
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).closest('.slide').classList.remove('is-visible')`); await pause();
      const start = await measureMotion();
      const identity = v => v === 'none' || v === 'matrix(1, 0, 0, 1, 0, 0)';
      assert.equal(identity(start.transform), mode !== 'normal');
      await evaluate('window.PPTSKILLMotion.replaySlide("portable")');
      // 動效進行中仍由 canonical proxy 計算，presentation transform 不清除。
      const move = await startGesture('drag', 10, 10); const during = await measureMotion(); await endGesture(move);
      assert.deepEqual(rect(await spec()), { ...base, x: 816, y: 296 });
      await pause();
      const handleState = () => evaluate(`(()=>{const e=document.querySelector('.moveable-se'),r=e?.getBoundingClientRect(),hit=r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{state:window.PPTSKILLEditor.layout.getState(),rect:r?.toJSON(),visibility:e&&getComputedStyle(e).visibility,hit:hit?.className,focus:document.activeElement?.outerHTML.slice(0,180)}})()`);
      const diagnostic = {treatment,mode,before:await handleState()}; (run.snapMotionResize ||= []).push(diagnostic);
      const size = await startGesture('resize', -10, -10); diagnostic.preview = await handleState(); await endGesture(size); diagnostic.after = await handleState();
      const expected = { x: 816, y: 296, width: 624, height: 464 };
      assert.deepEqual(rect(await spec()), expected); await assertRect(expected);
      const end = await measureMotion(); assert.ok(identity(end.transform)); assert.equal(end.opacity, '1'); assert.equal(end.inline, '');
      assert.equal(end.treatment, treatment);
      const html = await evaluate('window.PPTSKILLEditor.exportHtml()'); assert.deepEqual(extractDeckSpec(html), await spec());
      assert.equal(await evaluate(`(()=>{const d=new DOMParser().parseFromString(${JSON.stringify(html)},'text/html');return d.querySelectorAll('[data-pptskill-editor-chrome],.moveable-control-box,[data-editor-selected]').length})()`), 0);
      const reopened = resolve(outputDir, `${width}-snap-${treatment}-${mode}-export.html`); await writeFile(reopened, html);
      await navigate(reopened); assert.deepEqual(rect(await spec()), expected); await assertRect(expected);
      assert.equal(await snapOn(), false); assert.equal(await proxyCount(), 0);
      run.checks.push({ s7: 'motion', treatment, mode, start, during, end, expected }); run.artifacts.push(reopened);
    } finally {
      if (staticScript) await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: staticScript });
      await cdp.send('Emulation.setEmulatedMedia', { features: [] });
    }
  }
  await ready(); await evaluate('window.PPTSKILLEditor.layout.destroy();window.PPTSKILLEditor.layout.destroy()');
  assert.equal(await evaluate('document.querySelectorAll("[data-pptskill-editor-chrome],.moveable-control-box").length'), 0);
  run.checks.push('S7 重複 destroy 清理 proxy/control/overlay；owned target 由 S4 finally 關閉');
}
