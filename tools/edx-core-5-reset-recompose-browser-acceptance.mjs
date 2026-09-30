import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

// 僅 attach 受管 Chrome；輸出目錄由本輪呼叫者明示，腳本不啟動或清理 host。
if (process.argv.length !== 3 || !process.argv[2] || process.argv[2].startsWith('--')) {
  throw new Error('用法：node tools/edx-core-5-reset-recompose-browser-acceptance.mjs <本輪專用輸出目錄>');
}
const portFile = process.env.PPTSKILL_DEVTOOLS_ACTIVE_PORT;
if (!portFile) throw new Error('必須提供 PPTSKILL_DEVTOOLS_ACTIVE_PORT；本工具只 attach browser。');
const outputDir = resolve(process.argv[2]);
await mkdir(outputDir);
const port = Number((await readFile(portFile, 'utf8')).trim().split('\n')[0]);
assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, '受管 CDP port 無效');

const sha256 = value => createHash('sha256').update(value).digest('hex');
const seedOf = html => {
  const match = html.match(/<script[^>]*id=["']deck-spec["'][^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(match, '來源缺少 DeckSpec seed');
  return match[1];
};
const draftKey = (seed, deckId) => {
  let a = 2166136261, b = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619);
    b = Math.imul(b ^ c, 2246822519);
  }
  return 'pptskill:draft:v1:' + encodeURIComponent(deckId) + ':'
    + (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16) + '-' + seed.length;
};

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
fixture.deckId = 'edx-core-5-browser-' + randomBytes(8).toString('hex');
fixture.slides = fixture.slides.filter(slide => ['portable', 'problem'].includes(slide.id));
fixture.slides.sort((left, right) => Number(left.id !== 'portable') - Number(right.id !== 'portable'));
fixture.slides.find(slide => slide.id === 'portable').composition.geometryOverrides = {
  'portable-quote': { x: 830, y: 330, width: 600, height: 380 },
};
fixture.slides.find(slide => slide.id === 'portable').composition.typographyOverrides = {
  'role-title': { fontSize: 72 },
};
const rendered = renderFullDeck(fixture);
assert.equal(rendered.status, 'pass', JSON.stringify(rendered.errors));
const sourcePath = resolve(outputDir, 'source.html');
const sourceSeed = seedOf(rendered.html);
const key = draftKey(sourceSeed, rendered.spec.deckId);
await writeFile(sourcePath, rendered.html);

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }
  async open() {
    await new Promise((ok, fail) => {
      this.socket.addEventListener('open', ok, { once: true });
      this.socket.addEventListener('error', fail, { once: true });
    });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method) {
        for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.fail(new Error(message.error.message));
      else pending.ok(message.result);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((ok, fail) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        fail(new Error('CDP 逾時：' + method));
      }, 15000);
      this.pending.set(id, { ok, fail, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, listener) {
    const listeners = this.listeners.get(method) || new Set();
    listeners.add(listener);
    this.listeners.set(method, listeners);
    return () => listeners.delete(listener);
  }
  once(method) {
    let remove, timer;
    const promise = new Promise((ok, fail) => {
      remove = this.on(method, value => { clearTimeout(timer); remove(); ok(value); });
      timer = setTimeout(() => { remove(); fail(new Error('CDP event 逾時：' + method)); }, 15000);
    });
    return { promise, cancel: () => { clearTimeout(timer); remove(); } };
  }
  close() {
    for (const pending of this.pending.values()) clearTimeout(pending.timer);
    this.socket.close();
  }
}

const receipt = {
  schemaVersion: 1,
  status: 'running',
  sourcePath,
  sourceSha256: sha256(rendered.html),
  deckId: rendered.spec.deckId,
  runs: [],
};
const receiptPath = resolve(outputDir, 'acceptance.json');
let failed = false;

for (const [width, height] of [[1280, 720], [1600, 900]]) {
  const run = {
    viewport: { width, height }, status: 'running', targetClosed: false,
    checks: [], artifacts: [], visuals: [], console: [], pageErrors: [], networkFailures: [], httpErrors: [], remoteRequests: [],
  };
  receipt.runs.push(run);
  let cdp, targetId, ownsKey = false, sourceModified = false;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
    assert.ok(response.ok, '建立受管 Chrome target 失敗');
    const page = await response.json();
    targetId = page.id;
    assert.ok(targetId && page.webSocketDebuggerUrl, 'CDP target 資訊不足');
    cdp = new CdpClient(page.webSocketDebuggerUrl);
    await cdp.open();

    // 所有診斷監聽器先於第一次 navigation 註冊。
    cdp.on('Runtime.consoleAPICalled', ({ type, args = [] }) => run.console.push({ type, text: args.map(arg => arg.value ?? arg.description).join(' ') }));
    cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => run.pageErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text));
    cdp.on('Network.loadingFailed', event => run.networkFailures.push({ requestId: event.requestId, errorText: event.errorText, canceled: Boolean(event.canceled) }));
    cdp.on('Network.responseReceived', ({ response: item }) => { if (item.status >= 400) run.httpErrors.push({ url: item.url, status: item.status }); });
    cdp.on('Network.requestWillBeSent', ({ request }) => { if (/^https?:/i.test(request.url)) run.remoteRequests.push(request.url); });
    await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

    const evaluate = async expression => {
      const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const navigate = async (path, expectedSeed) => {
      const loaded = cdp.once('Page.loadEventFired');
      try {
        const navigation = await cdp.send('Page.navigate', { url: pathToFileURL(path).href });
        if (navigation.errorText) throw new Error(navigation.errorText);
        await loaded.promise;
      } catch (error) { loaded.cancel(); throw error; }
      for (let i = 0; i < 100; i++) {
        const ready = await evaluate('document.readyState==="complete" && !!window.PPTSKILLEditor');
        if (ready) break;
        if (i === 99) throw new Error('編輯器載入逾時');
        await new Promise(ok => setTimeout(ok, 50));
      }
      assert.equal(await evaluate('document.querySelector("#deck-spec")?.textContent'), expectedSeed, '載入的來源 seed 不符');
    };
    const inspect = () => evaluate(`(()=>{
      const api=window.PPTSKILLEditor,draftNode=document.querySelector('[data-local-draft][role="status"]'),restore=document.querySelector('[data-action="restore-draft"]'),replace=document.querySelector('[data-action="replace-draft"]'),save=document.querySelector('[data-action="save"]'),snap=document.querySelector('[data-action="snap-layout"]'),undo=document.querySelector('[data-action="undo"]'),redo=document.querySelector('[data-action="redo"]');
      return {spec:api.getDeckSpec(),title:document.querySelector('.slide [data-pptskill-element-id="role-title"]')?.textContent,
        draft:draftNode?.textContent,
        editorStatus:document.querySelector('[data-editor-status]')?.textContent,
        mode:document.body.dataset.editorMode,
        restoreHidden:restore?.hidden,replaceHidden:replace?.hidden,
        draftVisible:!!draftNode&&!draftNode.hidden&&getComputedStyle(draftNode).display!=='none',
        restoreVisible:!!restore&&!restore.hidden&&getComputedStyle(restore).display!=='none',
        replaceVisible:!!replace&&!replace.hidden&&getComputedStyle(replace).display!=='none',
        saveVisible:!!save&&!save.hidden&&getComputedStyle(save).display!=='none',
        snapVisible:!!snap&&!snap.hidden&&getComputedStyle(snap).display!=='none',
        undoVisible:!!undo&&!undo.hidden&&getComputedStyle(undo).display!=='none',
        redoVisible:!!redo&&!redo.hidden&&getComputedStyle(redo).display!=='none',
        history:api.getHistoryState()};
    })()`);
    const storageValue = () => evaluate(`localStorage.getItem(${JSON.stringify(key)})`);
    const click = async selector => {
      const point = await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});
        if(!node||node.hidden||getComputedStyle(node).display==='none')throw new Error('UI 控制不可見');
        const box=node.getBoundingClientRect();if(!(box.width>0&&box.height>0))throw new Error('UI 控制尺寸無效');
        const x=box.x+box.width/2,y=box.y+box.height/2;if(x<0||y<0||x>innerWidth||y>innerHeight)throw new Error('UI 控制超出 viewport');
        const hit=document.elementFromPoint(x,y);if(!hit||!(hit===node||node.contains(hit)))throw new Error('UI 控制被遮擋');
        return{x,y};})()`);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', buttons: 1, clickCount: 1 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', buttons: 0, clickCount: 1 });
    };
    const waitDraft = async expected => {
      for (let i = 0; i < 100; i++) {
        const value = await inspect();
        if (value.draft === expected) return value;
        if (i === 99) throw new Error('本機草稿狀態逾時：' + JSON.stringify(value));
        await new Promise(ok => setTimeout(ok, 25));
      }
    };
    const screenshot = async label => {
      // 截圖前固定既有動效，量測可見文字；瞬間動畫畫面不能充當視覺驗收。
      assert.equal(await evaluate('typeof window.PPTSKILLMotion?.forceStatic'), 'function', '缺少既有靜態動效入口');
      await evaluate('window.PPTSKILLMotion.forceStatic()');
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');
      const visual = await evaluate(`(()=>{
        const root=document.querySelector('.slide[data-slide-id="portable"]');
        const selectors={title:'[data-pptskill-element-id="role-title"]',subtitle:'[data-pptskill-element-id="role-subtitle"]',quote:'[data-pptskill-element-id="component-portable-quote"]'};
        const measured={};
        for(const [name,selector] of Object.entries(selectors)){
          const node=root?.querySelector(selector),style=node?getComputedStyle(node):null,range=node?document.createRange():null;
          if(range)range.selectNodeContents(node);
          const box=node?.getBoundingClientRect();
          measured[name]={text:node?.textContent||'',display:style?.display,visibility:style?.visibility,
            opacity:style?.opacity,clipPath:style?.clipPath,
            box:box?{left:box.left,top:box.top,right:box.right,bottom:box.bottom}:null,
            rects:range?[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0).map(rect=>({left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom})):[]};
        }
        return{motionStatic:document.documentElement.classList.contains('motion-static'),
          variant:[...(root?.classList||[])].find(value=>value.startsWith('variant-'))?.slice(8)||null,measured};
      })()`);
      run.visuals.push({ label, ...visual });
      assert.equal(visual.motionStatic, true, `${label} 動效未固定`);
      assert.equal(visual.variant, label === 'recomposed' ? 'evidence-axis' : 'quote-monument',
        `${label} 視覺版型與驗收階段不符`);
      for (const [name, item] of Object.entries(visual.measured)) {
        assert.ok(item.text && item.display !== 'none' && item.visibility === 'visible'
          && item.opacity === '1' && item.clipPath === 'none' && item.rects.length > 0,
        `${label} ${name} 文字不可見：${JSON.stringify(item)}`);
        assert.ok(item.rects.every(rect => rect.left >= 0 && rect.top >= 0
          && rect.right <= width && rect.bottom <= height), `${label} ${name} 文字出界`);
      }
      for (const [left, right] of [['title', 'subtitle'], ['title', 'quote'], ['subtitle', 'quote']]) {
        assert.ok(!visual.measured[left].rects.some(a => visual.measured[right].rects.some(b =>
          Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1
          && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1)),
        `${label} ${left} 與 ${right} 文字相交`);
      }
      // 只有 evidence-axis 有卡片背景；quote-monument 的字型行框可與元素邊緣齊平。
      if (visual.variant === 'evidence-axis') {
        const quote = visual.measured.quote;
        assert.ok(quote.box && quote.rects.every(rect => rect.left >= quote.box.left + 2
          && rect.top >= quote.box.top + 2 && rect.right <= quote.box.right - 2
          && rect.bottom <= quote.box.bottom - 2), `${label} 引用文字超出卡片邊界`);
      }
      const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const bytes = Buffer.from(result.data, 'base64');
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(bytes.readUInt32BE(16), width);
      assert.equal(bytes.readUInt32BE(20), height);
      const path = resolve(outputDir, `${width}-${label}.png`);
      await writeFile(path, bytes);
      run.artifacts.push({ label, path, sha256: sha256(bytes), bytes: bytes.length });
    };

    await navigate(sourcePath, sourceSeed);
    assert.equal(await storageValue(), null, '本輪 key 已有資料；拒絕覆寫使用者草稿');
    ownsKey = true;
    const initial = await inspect();
    assert.deepEqual(initial.spec, rendered.spec, '開啟時 canonical 不符');
    assert.equal(initial.spec.slides.length, 2, '雙頁 preservation fixture 不完整');
    await click('[data-action="edit"]');
    const editReady = await inspect();
    assert.equal(editReady.mode, 'edit', '編輯模式入口未啟用：' + JSON.stringify({ mode: editReady.mode, status: editReady.editorStatus }));
    const controls = await evaluate(`(()=>['save','undo','redo','reset-slide','recompose-slide'].map(action=>{
      const node=document.querySelector('[data-action="'+action+'"]'),box=node?.getBoundingClientRect();
      return {action,visible:!!node&&!node.hidden&&getComputedStyle(node).display!=='none'
        &&box.width>0&&box.height>0&&box.x>=0&&box.y>=0&&box.right<=innerWidth&&box.bottom<=innerHeight};
    }))()`);
    assert.deepEqual(controls.filter(item => !item.visible), [], '編輯模式必要控制未全部可見');
    await screenshot('initial');
    run.checks.push('受管真瀏覽器載入雙頁、進入編輯模式');

    await evaluate("(()=>{window.__core5Dialogs=[];window.__core5Queue=['evidence-axis','3'];window.__core5Accept=false;window.prompt=m=>{window.__core5Dialogs.push(m);return window.__core5Queue.shift()??null};window.confirm=m=>{window.__core5Dialogs.push(m);return window.__core5Accept};return true})()");
    await click('[data-action="recompose-slide"]');
    const canceled = await inspect();
    assert.deepEqual(canceled.spec, initial.spec, '取消 Recompose 改了 canonical');
    assert.equal(canceled.history.entries, 0, '取消 Recompose 建立 history');
    const cancelDialogs = await evaluate('window.__core5Dialogs');
    assert.equal(cancelDialogs.length, 3, 'Recompose 需呈現 variant、scope、confirm 三步');
    assert.match(cancelDialogs[2], /人工字級/);
    run.checks.push('真滑鼠 Recompose 取消，不改 canonical/history');

    await evaluate("(()=>{window.__core5Dialogs=[];window.__core5Queue=['evidence-axis','3'];window.__core5Accept=true;return true})()");
    await click('[data-action="recompose-slide"]');
    const recomposed = await inspect();
    const changed = recomposed.spec.slides.find(slide => slide.id === 'portable');
    const baseline = initial.spec.slides.find(slide => slide.id === 'portable');
    assert.equal(changed.composition.variant, 'evidence-axis');
    assert.equal(changed.composition.typographyOverrides, undefined, '明示字級未清除');
    assert.deepEqual(changed.composition.geometryOverrides, baseline.composition.geometryOverrides, '未列 geometry 被清除');
    assert.deepEqual(changed.content, baseline.content, 'Recompose 改了內容');
    assert.deepEqual(recomposed.spec.slides.find(slide => slide.id === 'problem'), initial.spec.slides.find(slide => slide.id === 'problem'), '其他 slide 被改');
    const visual = await evaluate("(()=>{const slide=document.querySelector('.slide[data-slide-id=\"portable\"]');const node=slide?.querySelector('[data-type-visual]');return {variant:slide?.className,word:node?.getAttribute('data-word')??null}})()");
    assert.match(visual.variant, /variant-evidence-axis/);
    assert.ok(visual.word, 'live type visual 缺失');
    const fresh = renderFullDeck(recomposed.spec);
    assert.equal(fresh.status, 'pass');
    assert.match(fresh.html, new RegExp('data-word="' + visual.word + '"'));
    await screenshot('recomposed');
    run.checks.push('真滑鼠 Recompose 明示清字級，未列 geometry／content／其他頁保留；live visual 與 fresh 一致');

    await click('[data-action="undo"]');
    const undone = await inspect();
    assert.deepEqual(undone.spec, initial.spec, 'Recompose Undo 未回 baseline');
    await click('[data-action="redo"]');
    assert.deepEqual((await inspect()).spec, recomposed.spec, 'Recompose Redo 未回 candidate');
    run.checks.push('真滑鼠 Undo／Redo 還原 Recompose canonical 與 DOM');

    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'Core5 重設前標題' })})`);
    const beforeReset = await inspect();
    assert.equal(beforeReset.spec.slides.find(slide => slide.id === 'portable').content.title, 'Core5 重設前標題');
    await waitDraft('本機草稿已保存');
    await evaluate("(()=>{window.__core5Dialogs=[];window.__core5Accept=false;return true})()");
    await click('[data-action="reset-slide"]');
    assert.deepEqual((await inspect()).spec, beforeReset.spec, '取消 Reset 改了 canonical');
    assert.match((await evaluate('window.__core5Dialogs'))[0], /文字、元件與人工版面/);
    run.checks.push('真滑鼠 Reset 影響範圍確認與取消保留');

    await evaluate("(()=>{window.__core5Dialogs=[];window.__core5Accept=true;return true})()");
    await click('[data-action="reset-slide"]');
    const reset = await inspect();
    assert.deepEqual(reset.spec.slides.find(slide => slide.id === 'portable'), baseline, 'Reset 未回 edit-start slide');
    assert.deepEqual(reset.spec.slides.find(slide => slide.id === 'problem'), initial.spec.slides.find(slide => slide.id === 'problem'), 'Reset 影響其他 slide');
    assert.equal(reset.title, baseline.content.title, 'Reset DOM 標題未回基準');
    await screenshot('reset');
    run.checks.push('真滑鼠 Reset 僅還原指定 slide，DOM／canonical 一致');

    await click('[data-action="undo"]');
    assert.deepEqual((await inspect()).spec, beforeReset.spec, 'Reset Undo 未恢復先前編輯');
    await click('[data-action="redo"]');
    assert.deepEqual((await inspect()).spec, initial.spec, 'Reset Redo 未回 edit-start deck');
    await waitDraft('本機草稿已保存');
    const savedRaw = await storageValue();
    assert.deepEqual(JSON.parse(savedRaw).spec, initial.spec, 'Reset 後草稿未保存 baseline');
    run.checks.push('真滑鼠 Reset Undo／Redo 與草稿 canonical 一致');

    const exportedHtml = await evaluate('window.PPTSKILLEditor.exportHtml()');
    assert.deepEqual(extractDeckSpec(exportedHtml), initial.spec, '匯出 DeckSpec 與 Reset 不符');
    const exportPath = resolve(outputDir, `${width}-export.html`);
    await writeFile(exportPath, exportedHtml);
    run.artifacts.push({ label: 'export', path: exportPath, sha256: sha256(exportedHtml), bytes: Buffer.byteLength(exportedHtml) });
    await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await navigate(exportPath, seedOf(exportedHtml));
    const offline = await inspect();
    assert.deepEqual(offline.spec, initial.spec, '離線重開 canonical 不符');
    assert.equal(offline.title, baseline.content.title, '離線重開 DOM 不符');
    await screenshot('offline-reopen');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    run.checks.push('匯出 HTML 離線重開仍是 Reset 後同一 canonical／DOM');

    assert.deepEqual(run.pageErrors, [], 'pageerror');
    assert.deepEqual(run.console.filter(item => item.type === 'error'), [], 'console error');
    assert.deepEqual(run.networkFailures.filter(item => !item.canceled), [], 'network failure');
    assert.deepEqual(run.httpErrors, [], 'HTTP error');
    assert.deepEqual(run.remoteRequests, [], 'remote request');
    run.status = 'pass';
  } catch (error) {
    run.status = 'fail';
    run.error = error.stack;
    failed = true;
  } finally {
    // 僅清除已確認原本不存在的本輪 key；保留其他 profile 資料與受管 root。
    try {
      if (sourceModified) await writeFile(sourcePath, rendered.html);
      if (ownsKey && cdp) {
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        const loaded = cdp.once('Page.loadEventFired');
        try {
          const navigation = await cdp.send('Page.navigate', { url: pathToFileURL(sourcePath).href });
          if (navigation.errorText) throw new Error(navigation.errorText);
          await loaded.promise;
        } catch (error) { loaded.cancel(); throw error; }
        const result = await cdp.send('Runtime.evaluate', {
          expression: `(()=>{localStorage.removeItem(${JSON.stringify(key)});return localStorage.getItem(${JSON.stringify(key)})===null})()`,
          returnByValue: true,
        });
        assert.ok(!result.exceptionDetails && result.result.value === true, '本輪 key 清理未驗證');
        run.draftKeyRemoved = true;
      }
    } catch (error) {
      run.cleanupError = error.stack;
      run.status = 'fail';
      failed = true;
    }
    if (run.status === 'pass' && (run.pageErrors.length || run.console.some(item => item.type === 'error')
      || run.networkFailures.some(item => !item.canceled) || run.httpErrors.length || run.remoteRequests.length)) {
      run.status = 'fail';
      run.error = '清理 navigation 發現新的 console/pageerror/network/http/remote 錯誤';
      failed = true;
    }
    cdp?.close();
    if (targetId) {
      try {
        const closed = await fetch(`http://127.0.0.1:${port}/json/close/${targetId}`);
        assert.ok(closed.ok, '只關閉本腳本 target 失敗');
        run.targetClosed = true;
      } catch (error) {
        run.targetCloseError = error.stack;
        run.status = 'fail';
        failed = true;
      }
    }
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  }
}
receipt.status = failed ? 'fail' : 'pass';
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
if (failed) process.exitCode = 1;
console.log(JSON.stringify({ status: receipt.status, receipt: receiptPath, runs: receipt.runs.map(run => ({ viewport: run.viewport, status: run.status, targetClosed: run.targetClosed, draftKeyRemoved: run.draftKeyRemoved })) }));
