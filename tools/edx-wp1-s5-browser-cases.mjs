import assert from 'node:assert/strict';

// 沿既有受管 CDP harness；真按鍵與 synthetic composition lifecycle 分別記錄。
export async function runKeyboardBrowserCases({ cdp, evaluate, navigate, sourcePath, selector, run, click, startGesture, endGesture, assertExport, assertRect }) {
  const target = { slideId: 'portable', elementId: 'component-portable-quote' };
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const rect = s => s.slides[0].composition.geometryOverrides?.['portable-quote'];
  const move = value => evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'move-element', target, value })})`);
  const key = async (name, modifiers = 0, extra = {}) => {
    const code = { Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[name];
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code, modifiers, ...extra });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code, modifiers });
  };
  await navigate(sourcePath);
  let before = await spec(); await key('ArrowRight'); assert.deepEqual(await spec(), before);
  await click('[data-action="layout"]'); await key('ArrowRight'); assert.deepEqual(await spec(), before);
  await click(selector); await key('ArrowRight'); assert.deepEqual(await spec(), before);
  run.checks.push('S5 play／無selection／legacy無geometry不提交');
  await click('[data-action="initialize-layout"]'); await click(selector);
  before = await spec(); let box = { ...rect(before) };
  for (const [name, modifiers, dx, dy, extra] of [
    ['ArrowRight', 0, 1, 0, {}], ['ArrowDown', 8, 0, 10, {}], ['ArrowLeft', 8, -10, 0, {}],
    ['ArrowUp', 0, 0, -1, {}], ['ArrowRight', 0, 1, 0, { autoRepeat: true }],
  ]) {
    await key(name, modifiers, extra); box.x += dx; box.y += dy;
    assert.deepEqual(rect(await spec()), box); await assertRect(box);
  }
  const expected = structuredClone(before); expected.slides[0].composition.geometryOverrides['portable-quote'] = box;
  assert.deepEqual(await spec(), expected);
  run.checks.push('S5 真方向／Shift／repeat為1px或10px，尺寸與非geometry不變');
  for (const modifiers of [1, 2, 4]) { await key('ArrowUp', modifiers); assert.deepEqual(await spec(), expected); }
  await key('ArrowRight', 0, { windowsVirtualKeyCode: 229 }); assert.deepEqual(await spec(), expected);
  await evaluate('document.dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true}))');
  await key('ArrowRight'); assert.deepEqual(await spec(), expected);
  await evaluate('document.dispatchEvent(new CompositionEvent("compositionend",{bubbles:true}))');
  run.checks.push('S5 真修飾鍵／229及synthetic composition lifecycle避讓');
  for (const [tag, attribute, value] of [['input', '', ''], ['textarea', '', ''], ['select', '', ''], ['div', 'contenteditable', 'true'], ['div', 'contenteditable', 'plaintext-only'], ['div', 'role', 'textbox']]) {
    await evaluate(`(()=>{const e=document.createElement(${JSON.stringify(tag)});e.id='s5-input';e.tabIndex=0;${attribute ? `e.setAttribute(${JSON.stringify(attribute)},${JSON.stringify(value)});` : ''}document.body.append(e);e.focus()})()`);
    await key('ArrowRight'); assert.deepEqual(await spec(), expected);
    const selected = await evaluate('window.PPTSKILLEditor.layout.getState()');
    await key('Escape'); assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getState()'), selected);
    await evaluate('document.getElementById("s5-input").remove()');
  }
  await evaluate('document.querySelector("[data-action=layout]").focus()');
  await key('ArrowRight'); assert.deepEqual(await spec(), expected); await click(selector);
  run.checks.push('S5 真input／textarea／select／contenteditable／textbox／chrome focus不挪動');
  await move({ x: 80, y: 80 }); const edge = await spec();
  await evaluate('window.__s5keys=[];document.addEventListener("keydown",e=>window.__s5keys.push({key:e.key,active:document.activeElement.outerHTML,state:window.PPTSKILLEditor.layout.getState(),defaultPrevented:e.defaultPrevented}),true)');
  for (const name of ['ArrowLeft', 'ArrowUp']) { await key(name, 8); assert.deepEqual(await spec(), edge); }
  await assertRect(rect(edge));
  run.keyboardDiagnostic = await evaluate('({keys:window.__s5keys,status:document.querySelector("[data-editor-status]").textContent})');
  assert.match(run.keyboardDiagnostic.status, /未套用/);
  run.checks.push('S5 safe-area越界拒絕、不clamp');
  await move({ x: 820, y: 300 });
  for (const kind of ['drag', 'resize']) {
    const committed = await spec(), p = await startGesture(kind, 10, 10);
    const selected = await evaluate('window.PPTSKILLEditor.layout.getState()');
    for (const modifiers of [1, 2, 4]) { await key('Escape', modifiers); assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getState()'), selected); }
    await key('Escape', 0, { windowsVirtualKeyCode: 229 });
    assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getState()'), selected);
    await evaluate('document.dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true}))');
    await key('Escape'); assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getState()'), selected);
    await evaluate('document.dispatchEvent(new CompositionEvent("compositionend",{bubbles:true}))');
    await key('ArrowRight'); assert.deepEqual(await spec(), committed);
    assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true);
    await endGesture(p);
    const wanted = { ...rect(committed) }; wanted[kind === 'drag' ? 'x' : 'width'] += 10; wanted[kind === 'drag' ? 'y' : 'height'] += 10;
    assert.deepEqual(rect(await spec()), wanted); await assertRect(wanted);
  }
  run.checks.push('S5 真drag／resize途中按鍵不提交、release仍只提交pointer結果');
  run.checks.push('S5 guarded Escape保留selection與drag/resize；普通Escape沿既有pointer cancel驗收');
  const saved = await spec(), path = await assertExport('keyboard-export', saved);
  await navigate(path); assert.deepEqual(await spec(), saved); await assertRect(rect(saved));
  await click('[data-action="layout"]'); await click(selector); await key('ArrowRight');
  const after = await spec(); assert.deepEqual(rect(after), { ...rect(saved), x: rect(saved).x + 1 });
  await assertExport('keyboard-reopen', after);
  run.checks.push('S5 離線export/reopen保留geometry且可繼續微調');
  await click('[data-action="edit"]'); const text = await spec(); await key('ArrowRight'); assert.deepEqual(await spec(), text);
  run.checks.push('S5 文字模式不微調');
  await click('[data-action="layout"]'); await click(selector);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).remove()`);
  const deleted = await spec(); await key('ArrowRight'); assert.deepEqual(await spec(), deleted);
  run.checks.push('S5 已刪DOM target不提交');
}
