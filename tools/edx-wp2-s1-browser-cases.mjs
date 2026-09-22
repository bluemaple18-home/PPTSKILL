import assert from 'node:assert/strict';

const titleSelector = '.slide[data-slide-id="portable"] [data-pptskill-element-id="role-title"]';
const componentTextSelector = '.slide[data-slide-id="portable"] [data-pptskill-element-id="component-portable-quote"]';

export async function runDirectTextBrowserCases({ cdp, evaluate, navigate, sourcePath, width, run, position, settle, assertExport }) {
  await navigate(sourcePath);
  const before = await evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const originalTitle = before.slides[0].content.title;

  const point = await position(titleSelector);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, button: 'none', buttons: 0, clickCount: 0 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', buttons: 1, clickCount: 2 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', buttons: 0, clickCount: 2 });
  await settle();
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(titleSelector)}).contentEditable`), 'true');
  assert.equal(await evaluate('document.body.dataset.editorMode'), 'edit');
  assert.notEqual(await evaluate(`document.querySelector(${JSON.stringify(componentTextSelector)}).contentEditable`), 'true');
  run.checks.push({ wp2s1: 'double-click-direct-target', viewport: width, componentDirectEdit: false });

  const composing = await evaluate(`(()=>{
    const node=document.querySelector(${JSON.stringify(titleSelector)});
    node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));
    node.textContent='中文組字中';
    let exportError='';try{window.PPTSKILLEditor.exportHtml()}catch(error){exportError=error.message}
    return{canonical:window.PPTSKILLEditor.getDeckSpec().slides[0].content.title,exportError};
  })()`);
  assert.equal(composing.canonical, originalTitle);
  assert.match(composing.exportError, /IME|組字|composition/u);
  await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(titleSelector)});node.textContent='中文完整提交';node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'中文完整提交'}));return true})()`);
  await settle();
  assert.equal(await evaluate('window.PPTSKILLEditor.getDeckSpec().slides[0].content.title'), '中文完整提交');
  run.checks.push({ wp2s1: 'composition-boundary', partialCanonical: originalTitle, committed: '中文完整提交' });

  await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(titleSelector)});node.focus();node.textContent='Escape 應取消';return document.activeElement===node})()`);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await settle();
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(titleSelector)}).textContent`), '中文完整提交');
  assert.equal(await evaluate('window.PPTSKILLEditor.getDeckSpec().slides[0].content.title'), '中文完整提交');
  run.checks.push({ wp2s1: 'escape-rollback', canonical: '中文完整提交' });

  const committed = await evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const exported = await assertExport('wp2-s1-direct-text-export', committed);
  await navigate(exported);
  assert.equal(await evaluate('window.PPTSKILLEditor.getDeckSpec().slides[0].content.title'), '中文完整提交');
  assert.equal(await evaluate('document.querySelectorAll("[contenteditable=true]").length'), 0);
  assert.equal(await evaluate('document.body.dataset.editorMode'), 'play');
  run.checks.push({ wp2s1: 'export-offline-reopen', title: '中文完整提交', contenteditable: 0 });
}
