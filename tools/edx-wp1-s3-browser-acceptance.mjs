import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

// 僅 attach Mainline 已擁有的受管 browser；每輪只建立／清理自己的 target。
const outputDir = resolve(process.argv[2] || 'evidence/edx-wp1-s3/browser');
const fixtureOnly = process.argv.includes('--fixture-only');
const portFile = process.env.PPTSKILL_DEVTOOLS_ACTIVE_PORT;
if (!fixtureOnly && !portFile) throw new Error('必須提供 PPTSKILL_DEVTOOLS_ACTIVE_PORT；本工具不啟動 browser。');
await mkdir(outputDir, { recursive: true });
const input = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
const portable = input.slides.find(slide => slide.id === 'portable');
portable.content.components[0].text = '座標保持一致';
// 未套用 geometry 的 legacy component 用來驗證 style 污染清除。
const legacy = structuredClone(portable);
legacy.id = 'legacy-component';
legacy.content.components[0].text = '傳統排版保持';
input.slides.push(legacy);
const source = renderFullDeck(input);
assert.equal(source.status, 'pass');
const sourcePath = resolve(outputDir, 'source.html');
await writeFile(sourcePath, source.html);
const target = { slideId: 'portable', elementId: 'component-portable-quote' };
const nodeEditor = createDeckEditor(input);
nodeEditor.executeOperation({ operation: 'resize-element', target, value: { width: 600, height: 400 } });
nodeEditor.executeOperation({ operation: 'move-element', target, value: { x: 820, y: 300 } });
const canonical = nodeEditor.getSpec();
const canonicalPath = resolve(outputDir, 'canonical.html');
await writeFile(canonicalPath, renderFullDeck(canonical).html);
if (fixtureOnly) { console.log(JSON.stringify({ sourcePath, canonicalPath })); process.exit(0); }

class CdpClient {
  constructor(url) { this.socket = new WebSocket(url); this.nextId = 1; this.pending = new Map(); this.listeners = new Map(); }
  async open() {
    await new Promise((ok, fail) => { this.socket.addEventListener('open', ok, { once: true }); this.socket.addEventListener('error', fail, { once: true }); });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method) { for (const listener of this.listeners.get(message.method) || []) listener(message.params || {}); return; }
      const pending = this.pending.get(message.id); if (!pending) return; this.pending.delete(message.id);
      if (message.error) pending.fail(new Error(message.error.message)); else pending.ok(message.result);
    });
  }
  send(method, params = {}) { const id = this.nextId++; return new Promise((ok, fail) => { this.pending.set(id, { ok, fail }); this.socket.send(JSON.stringify({ id, method, params })); }); }
  on(method, listener) { this.listeners.set(method, [...(this.listeners.get(method) || []), listener]); }
  close() { this.socket.close(); }
}

const port = Number((await readFile(portFile, 'utf8')).trim().split('\n')[0]);
assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, '受管 port 無效');
const receipt = { status: 'running', sourcePath, canonicalPath, runs: [] };
const measure = String.raw`(()=>{
  const slide=document.querySelector('.slide[data-slide-id="portable"]');
  const element=slide.querySelector('[data-pptskill-element-id="component-portable-quote"]');
  const s=slide.getBoundingClientRect(),e=element.getBoundingClientRect(),scale=s.width/1600;
  return {x:(e.x-s.x)/scale,y:(e.y-s.y)/scale,width:e.width/scale,height:e.height/scale,
    slideWidth:s.width/scale,slideHeight:s.height/scale,scale,
    directChild:element.parentElement===slide,containingBlock:element.offsetParent===slide,
    boxSizing:getComputedStyle(element).boxSizing,overflow:element.scrollHeight>element.clientHeight+1||element.scrollWidth>element.clientWidth+1};
})()`;
const checkBox = (value, width) => {
  for (const [key, expected] of Object.entries({ x: 820, y: 300, width: 600, height: 400, slideWidth: 1600, slideHeight: 900 })) assert.ok(Math.abs(value[key] - expected) < 0.6, `${key}: ${value[key]} ≠ ${expected}`);
  assert.ok(Math.abs(value.scale - width / 1600) < 0.001);
  assert.equal(value.directChild, true); assert.equal(value.containingBlock, true);
  assert.equal(value.boxSizing, 'border-box'); assert.equal(value.overflow, false);
};
try {
  for (const mode of ['static', 'normal']) for (const width of [1280, 1600]) {
    const height = width * 9 / 16;
    const run = { mode, viewport: { width, height }, console: [], pageErrors: [], networkFailures: [], httpErrors: [], targetClosed: false };
    receipt.runs.push(run);
    let cdp, targetId;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
      assert.ok(response.ok);
      const page = await response.json(); targetId = page.id;
      cdp = new CdpClient(page.webSocketDebuggerUrl); await cdp.open();
      // 所有 listener 均早於首次 navigation。
      cdp.on('Runtime.consoleAPICalled', ({ type, args = [] }) => run.console.push({ type, text: args.map(a => a.value ?? a.description).join(' ') }));
      cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => run.pageErrors.push(exceptionDetails));
      cdp.on('Network.loadingFailed', value => run.networkFailures.push(value));
      cdp.on('Network.responseReceived', ({ response: value }) => { if (value.status >= 400) run.httpErrors.push(value); });
      await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
      if (mode === 'static') await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__PPTSKILL_FORCE_STATIC__=true' });
      const evaluate = async expression => {
        const value = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);
        return value.result.value;
      };
      // 沿用 authority gate 的 transient-only 正規化，不能略過 style 或 attribute 順序。
      const assertCanonicalDom = async state => {
        const canonicalHtml = renderFullDeck(state).html;
        const mismatches = await evaluate(`(()=>{
          const expected=new DOMParser().parseFromString(${JSON.stringify(canonicalHtml)},'text/html');
          const normalize=slide=>{const clone=slide.cloneNode(true);clone.classList.remove('is-visible','motion-resetting');for(const node of [clone,...clone.querySelectorAll('*')]){for(const attr of [...node.attributes]){if(attr.name==='contenteditable'||attr.name==='data-editor-selected'||/^data-(motion-state|animation-starts|animation-finishes|replay-count)$/.test(attr.name))node.removeAttribute(attr.name)}if(node.matches('[data-pptskill-background-layer]')){node.replaceChildren();node.removeAttribute('style');node.dataset.backgroundState='static'}if(node.matches('number-flow[data-pptskill-odometer]')){node.replaceChildren(document.createTextNode(node.dataset.finalDisplay||''));node.removeAttribute('aria-label')}}return clone.outerHTML};
          return [...document.querySelectorAll('.slide')].filter(slide=>normalize(slide)!==normalize(expected.querySelector('[data-slide-id="'+CSS.escape(slide.dataset.slideId)+'"]'))).map(slide=>slide.dataset.slideId);
        })()`);
        assert.deepEqual(mismatches, [], 'renderer/browser canonical authority mismatch');
      };
      const navigate = async path => {
        let timeout;
        try {
          const loaded = new Promise(ok => cdp.on('Page.loadEventFired', ok));
          const navigation = await cdp.send('Page.navigate', { url: pathToFileURL(path).href });
          if (navigation.errorText) throw new Error(navigation.errorText);
          await Promise.race([loaded, new Promise((_, fail) => { timeout = setTimeout(() => fail(new Error('載入逾時')), 10000); })]);
        } finally { clearTimeout(timeout); }
        await evaluate(`(async()=>{await document.fonts.ready;document.querySelector('[data-slide-id="portable"]').scrollIntoView();${mode === 'static' ? 'window.PPTSKILLMotion?.forceStatic();window.PPTSKILLBackground?.forceStatic();' : ''}await new Promise(ok=>setTimeout(ok,1400));return true})()`);
      };
      await navigate(sourcePath);
      assert.deepEqual(await evaluate('window.PPTSKILLEditor.getDeckSpec()'), source.spec);
      const legacyExport = await evaluate('window.PPTSKILLEditor.exportHtml()');
      assert.deepEqual(extractDeckSpec(legacyExport), source.spec);
      const legacyPath = resolve(outputDir, `${mode}-${width}-legacy.html`);
      await writeFile(legacyPath, legacyExport); await navigate(legacyPath);
      assert.deepEqual(await evaluate('window.PPTSKILLEditor.getDeckSpec()'), source.spec);
      run.legacyRoundTrip = true;
      run.interaction = await evaluate(String.raw`(()=>{
        const api=window.PPTSKILLEditor, target={slideId:'portable',elementId:'component-portable-quote'};
        const check=(value,message)=>{if(!value)throw new Error(message)};
        const descriptors=api.operationDescriptors;
        const frozen=value=>!value||typeof value!=='object'||(Object.isFrozen(value)&&Object.values(value).every(frozen));
        check(frozen(descriptors),'descriptor snapshot 非深度 immutable');
        let rejected=false;try{descriptors['move-element'].allowedTargetRoles.push('title')}catch{rejected=true}check(rejected,'descriptor 可被擴權');
        Reflect.set(descriptors['move-element'].inputSchema.properties.value.properties.x,'minimum',0);
        check(descriptors['move-element'].inputSchema.properties.value.properties.x.minimum===80,'descriptor metadata 可變');
        api.executeOperation({operation:'resize-element',target,value:{width:600,height:400}});
        api.executeOperation({operation:'move-element',target,value:{x:820,y:300}});
        const before=JSON.stringify(api.getDeckSpec()),domBefore=document.querySelector('.deck').outerHTML;
        const bad=[
          {operation:'unknown-operation',target,value:{}},
          ...[NaN,Infinity,-1,79,80.5,1500,'80',null].map(x=>({operation:'move-element',target,value:{x,y:300}})),
          ...[-1,0,79,1000,NaN,Infinity].map(width=>({operation:'resize-element',target,value:{width,height:400}})),
          {operation:'move-element',target,value:{x:80,y:850}},
          {operation:'move-element',target,value:{x:80,y:80,transform:'none'}},
          {operation:'move-element',target:{...target,extra:true},value:{x:80,y:80}},
          {operation:'move-element',target,value:{x:80,y:80},extra:true},
          ...['role-title','role-subtitle','point-key-point-01','component-missing'].map(elementId=>({operation:'move-element',target:{...target,elementId},value:{x:80,y:80}})),
          {operation:'move-element',target:{...target,slideId:'missing'},value:{x:80,y:80}}
        ];
        for(const request of bad){let failed=false;try{api.executeOperation(request)}catch{failed=true}check(failed,'invalid request 未拒絕');check(JSON.stringify(api.getDeckSpec())===before,'失敗寫入 canonical');check(document.querySelector('.deck').outerHTML===domBefore,'失敗改動 DOM')}
        api.executeOperation({operation:'edit-text',target:{...target,elementId:'role-title'},value:'文字修改保留位置'});
        const box=api.getDeckSpec().slides.find(s=>s.id==='portable').composition.geometryOverrides['portable-quote'];
        check(JSON.stringify(box)===JSON.stringify({x:820,y:300,width:600,height:400}),'content edit 清除 geometry');
        return {immutable:true,invalidCases:bad.length,atomicity:true,contentEditPreserved:true};
      })()`);
      run.geometry = await evaluate(measure); checkBox(run.geometry, width);
      const edited = await evaluate('window.PPTSKILLEditor.getDeckSpec()');
      const expected = structuredClone(canonical); expected.slides.find(s => s.id === 'portable').content.title = '文字修改保留位置';
      assert.deepEqual(edited, expected);
      await assertCanonicalDom(expected);
      run.operationCanonicalAuthority = true;
      // 可攜輸出必須捨棄 live positioning；包含未帶 geometry 的 legacy component。
      await evaluate(String.raw`(()=>{for(const id of ['portable','legacy-component']){const root=document.querySelector('[data-slide-id="'+id+'"]'),el=root.querySelector('[data-pptskill-element-id="component-portable-quote"]');el.style.cssText='position:fixed;left:7px;top:9px;width:13px;height:17px;transform:translate(333px,444px)';}return true})()`);
      const exported = await evaluate('window.PPTSKILLEditor.exportHtml()');
      assert.deepEqual(extractDeckSpec(exported), expected);
      assert.ok(!exported.includes('translate(333px,444px)') && !exported.includes('translate(333px, 444px)'));
      const exportPath = resolve(outputDir, `${mode}-${width}-export.html`);
      await writeFile(exportPath, exported);
      await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await navigate(exportPath);
      assert.deepEqual(await evaluate('window.PPTSKILLEditor.getDeckSpec()'), expected);
      run.reopenedGeometry = await evaluate(measure); checkBox(run.reopenedGeometry, width);
      assert.equal(await evaluate(`document.querySelector('[data-slide-id="legacy-component"] [data-pptskill-element-id="component-portable-quote"]').getAttribute('style')`), null);
      await assertCanonicalDom(expected);
      run.reopenCanonicalAuthority = true;
      run.recipientRoundTrip = true;
      run.traceback = await evaluate(`/Traceback|Uncaught [A-Za-z]+Error/.test(document.body.innerText)`);
      assert.equal(run.traceback, false);
      // 透過既有 UI adapters 驗證 slide-local duplicate／remove，沒有新增 interaction UI。
      run.cleanup = await evaluate(String.raw`(()=>{
        const api=window.PPTSKILLEditor,root=document.querySelector('[data-slide-id="portable"]');root.click();
        document.querySelector('[data-action="duplicate"]').click();
        const copy=api.getDeckSpec().slides.find(s=>s.id==='portable-copy-1');if(!copy?.composition.geometryOverrides)throw new Error('duplicate 遺失 geometry');
        api.executeOperation({operation:'move-element',target:{slideId:copy.id,elementId:'component-portable-quote'},value:{x:840,y:320}});
        if(api.getDeckSpec().slides.find(s=>s.id==='portable').composition.geometryOverrides['portable-quote'].x!==820)throw new Error('duplicate 共享 override');
        document.querySelector('[data-action="delete"]').click();
        if(api.getDeckSpec().slides.some(s=>s.id===copy.id)||document.querySelector('[data-slide-id="'+copy.id+'"]'))throw new Error('delete ghost');
        return {duplicate:true,independent:true,removed:true};
      })()`);
      // constructor 是合法 ID；既有 override map 不得從 prototype 找到 box。
      const prototypeInput = structuredClone(input);
      prototypeInput.slides.find(s => s.id === 'portable').content.components.push({ id: 'constructor', type: 'text', text: '合法 component ID' });
      const prototypePath = resolve(outputDir, `${mode}-${width}-prototype.html`);
      await writeFile(prototypePath, renderFullDeck(prototypeInput).html); await navigate(prototypePath);
      run.prototypeId = await evaluate(`(()=>{const api=window.PPTSKILLEditor;for(const elementId of ['component-portable-quote','component-constructor'])api.executeOperation({operation:'move-element',target:{slideId:'portable',elementId},value:{x:820,y:300}});const slide=api.getDeckSpec().slides.find(s=>s.id==='portable');const root=document.querySelector('[data-slide-id="portable"] [data-pptskill-element-id="component-constructor"]');return {own:Object.hasOwn(slide.composition.geometryOverrides,'constructor'),rendered:!!root,directChild:root?.parentElement.dataset.slideId==='portable'}})()`);
      assert.deepEqual(run.prototypeId, { own: true, rendered: true, directChild: true });
      await assertCanonicalDom(await evaluate('window.PPTSKILLEditor.getDeckSpec()'));
      run.prototypeCanonicalAuthority = true;
      assert.equal(run.console.length, 0); assert.equal(run.pageErrors.length, 0);
      assert.equal(run.networkFailures.length, 0); assert.equal(run.httpErrors.length, 0);
      run.status = 'pass';
    } finally {
      cdp?.close();
      if (targetId) { const closed = await fetch(`http://127.0.0.1:${port}/json/close/${targetId}`); assert.ok(closed.ok, 'owned target cleanup 失敗'); run.targetClosed = true; }
    }
  }
  receipt.status = 'pass';
} catch (error) {
  receipt.status = 'fail'; receipt.error = error.stack; process.exitCode = 1;
} finally {
  await writeFile(resolve(outputDir, 'acceptance.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ status: receipt.status, runs: receipt.runs.map(({ mode, viewport, status, targetClosed }) => ({ mode, viewport, status, targetClosed })), error: receipt.error }));
}
