import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

// 僅 attach 受管 Chrome；輸出目錄由本輪呼叫者明示，腳本不啟動或清理 host。
if (process.argv.length !== 3 || !process.argv[2] || process.argv[2].startsWith('--')) {
  throw new Error('用法：node tools/edx-core-4-local-draft-browser-acceptance.mjs <本輪專用輸出目錄>');
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
fixture.deckId = 'edx-core-4-browser-' + randomBytes(8).toString('hex');
fixture.slides = fixture.slides.filter(slide => slide.id === 'portable');
const rendered = renderFullDeck(fixture);
assert.equal(rendered.status, 'pass', JSON.stringify(rendered.errors));
const alternateInput = structuredClone(fixture);
alternateInput.title += '：不同初始來源';
const alternate = renderFullDeck(alternateInput);
assert.equal(alternate.status, 'pass', JSON.stringify(alternate.errors));
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
  alternateSourceSha256: sha256(alternate.html),
  deckId: rendered.spec.deckId,
  runs: [],
};
const receiptPath = resolve(outputDir, 'acceptance.json');
const editedTitle = 'Core4 已保存的本機草稿';
const nextTitle = 'Core4 恢復後仍可編輯';
let failed = false;

for (const [width, height] of [[1280, 720], [1600, 900]]) {
  const run = {
    viewport: { width, height }, status: 'running', targetClosed: false,
    checks: [], artifacts: [], console: [], pageErrors: [], networkFailures: [], httpErrors: [], remoteRequests: [],
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
    assert.equal(initial.draftVisible, false, 'play mode 不得放寬本機草稿狀態文字');
    assert.equal(initial.restoreVisible, false);
    assert.equal(initial.replaceVisible, false);
    assert.equal(initial.title, rendered.spec.slides[0].content.title);
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: editedTitle })})`);
    const saved = await waitDraft('本機草稿已保存');
    assert.equal(saved.spec.slides[0].content.title, editedTitle);
    const savedRaw = await storageValue();
    assert.equal(JSON.parse(savedRaw).spec.slides[0].content.title, editedTitle);
    run.checks.push('真 public API 提交後自動保存，storage 讀回與 UI 一致');

    // 同一路徑換入不同 seed，排除 file: 每路徑 storage 隔離造成的假陽性。
    await writeFile(sourcePath, alternate.html); sourceModified = true;
    await navigate(sourcePath, seedOf(alternate.html));
    const different = await inspect();
    assert.equal(different.restoreVisible, false);
    assert.equal(different.spec.title, alternate.spec.title);
    assert.equal(await storageValue(), savedRaw, '不同來源仍須可讀同一 profile 的原草稿 key');
    run.checks.push('相同 file 路徑、不同初始來源不顯示恢復入口');
    await writeFile(sourcePath, rendered.html); sourceModified = false;

    await navigate(sourcePath, sourceSeed);
    const offered = await inspect();
    const offeredRaw = await storageValue();
    let offeredRecord = null;
    try { offeredRecord = JSON.parse(offeredRaw); } catch {}
    run.offeredDiagnostics = {
      draft: offered.draft,
      draftVisible: offered.draftVisible,
      restoreHidden: offered.restoreHidden,
      replaceHidden: offered.replaceHidden,
      restoreVisible: offered.restoreVisible,
      replaceVisible: offered.replaceVisible,
      storagePresent: offeredRaw !== null,
      storageMatchesSaved: offeredRaw === savedRaw,
      recordSource: offeredRecord?.source,
      recordDeckId: offeredRecord?.deckId,
      recordTitle: offeredRecord?.spec?.slides?.[0]?.content?.title,
      expectedDeckId: rendered.spec.deckId,
      expectedTitle: editedTitle,
      key,
    };
    assert.equal(offered.draftVisible, false, 'play mode 的草稿狀態文字仍須維持隱藏');
    assert.equal(offered.restoreVisible, true, '重開同來源應顯示恢復入口：' + JSON.stringify(run.offeredDiagnostics));
    assert.equal(offered.replaceVisible, true, '重開同來源應顯示明示取代入口：' + JSON.stringify(run.offeredDiagnostics));
    assert.deepEqual(offered.spec, rendered.spec, '明示選擇前不得改 canonical');
    assert.equal(offered.title, rendered.spec.slides[0].content.title);
    await screenshot('restore-offered');
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: nextTitle })})`);
    const protectedDraft = await waitDraft('待恢復舊稿未覆寫；目前編輯請另存 HTML，重新開啟來源後再選擇恢復。');
    assert.equal(protectedDraft.spec.slides[0].content.title, nextTitle);
    assert.equal(await storageValue(), savedRaw, '未選恢復前的直接編輯不得覆寫舊草稿');
    assert.equal(protectedDraft.restoreVisible, true);
    assert.equal(protectedDraft.replaceVisible, true);
    run.checks.push('待恢復舊稿由直接編輯保護，顯示目前編輯未保存');

    await click('[data-action="replace-draft"]');
    const replaced = await waitDraft('本機草稿已保存');
    const replacedRaw = await storageValue();
    assert.equal(JSON.parse(replacedRaw).spec.slides[0].content.title, nextTitle);
    assert.equal(replaced.restoreVisible, false);
    assert.equal(replaced.replaceVisible, false);
    await navigate(sourcePath, sourceSeed);
    const replacedOffered = await inspect();
    assert.equal(replacedOffered.restoreVisible, true);
    assert.equal(replacedOffered.replaceVisible, true);
    await click('[data-action="restore-draft"]');
    assert.equal((await inspect()).spec.slides[0].content.title, nextTitle, '明示取代後重開須恢復目前編輯');
    run.checks.push('明示取代前舊稿 bytes 不變；取代後 current canonical 自動保存並可重開恢復');

    // 後續既有恢復／Undo／export 驗收仍以第一版舊稿為基線。
    await evaluate(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(savedRaw)})`);
    await navigate(sourcePath, sourceSeed);
    const restoredOffer = await inspect();
    assert.equal(restoredOffer.restoreVisible, true, '重開後舊稿仍應可恢復');
    assert.equal(restoredOffer.replaceVisible, true);
    await click('[data-action="restore-draft"]');
    const restored = await inspect();
    assert.equal(restored.title, editedTitle, '恢復後 DOM 必須等於 canonical');
    assert.equal(restored.spec.slides[0].content.title, editedTitle);
    assert.equal(restored.history.entries, 0);
    assert.equal(restored.restoreVisible, false);
    assert.equal(restored.replaceVisible, false);
    await screenshot('restored');
    run.checks.push('同來源重開須 click；恢復後 canonical、DOM、history 一致');

    await evaluate(`window.PPTSKILLEditor.layout.setMode(true)`);
    const layoutControls = await inspect();
    assert.equal(layoutControls.saveVisible, true, 'layout mode 的 save 控制不可被預設隱藏 selector 壓回');
    assert.equal(layoutControls.snapVisible, true, 'layout mode 的 snap 控制不可被預設隱藏 selector 壓回');
    assert.equal(layoutControls.undoVisible, true, 'layout mode 的 undo 控制不可被預設隱藏 selector 壓回');
    assert.equal(layoutControls.redoVisible, true, 'layout mode 的 redo 控制不可被預設隱藏 selector 壓回');
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: nextTitle })})`);
    assert.equal(await evaluate('window.PPTSKILLEditor.undo()'), true, '恢復後 Undo 應可用');
    assert.deepEqual((await inspect()).spec, restored.spec);
    for (let i = 0; i < 100; i++) {
      const raw = await storageValue();
      if (raw && JSON.parse(raw).spec.slides[0].content.title === editedTitle
        && (await inspect()).draft === '本機草稿已保存') break;
      if (i === 99) throw new Error('Undo 後草稿未保存恢復後 canonical');
      await new Promise(ok => setTimeout(ok, 25));
    }
    const exportedHtml = await evaluate('window.PPTSKILLEditor.exportHtml()');
    assert.deepEqual(extractDeckSpec(exportedHtml), restored.spec, '匯出嵌入的 DeckSpec 必須等於恢復後 canonical');
    assert.ok(!exportedHtml.includes(await storageValue()), '匯出不得夾帶本機草稿記錄');
    const exportPath = resolve(outputDir, `${width}-export.html`);
    await writeFile(exportPath, exportedHtml);
    run.artifacts.push({ label: 'export', path: exportPath, sha256: sha256(exportedHtml), bytes: Buffer.byteLength(exportedHtml) });
    run.checks.push('恢復後可再編輯／Undo；匯出 DeckSpec 一致且無本機草稿記錄');

    await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await navigate(exportPath, seedOf(exportedHtml));
    const offline = await inspect();
    assert.deepEqual(offline.spec, restored.spec);
    assert.equal(offline.title, editedTitle);
    await screenshot('offline-reopen');
    run.checks.push('匯出 HTML 離線重開可讀 canonical 與 DOM');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

    await navigate(sourcePath, sourceSeed);
    const oldDraft = await storageValue();
    assert.ok(oldDraft && JSON.parse(oldDraft).spec.slides[0].content.title === editedTitle);

    // 另一頁確定刪除 key 後，本頁按恢復必須解除 pending lock，下一次提交可重新保存。
    assert.equal((await inspect()).restoreVisible, true);
    await evaluate(`localStorage.removeItem(${JSON.stringify(key)})`);
    await click('[data-action="restore-draft"]');
    const cleared = await inspect();
    assert.equal(cleared.restoreVisible, false);
    assert.equal(cleared.replaceVisible, false);
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'Core4 外部刪除後的新草稿' })})`);
    const savedAfterClear = await waitDraft('本機草稿已保存');
    assert.equal(JSON.parse(await storageValue()).spec.slides[0].content.title, 'Core4 外部刪除後的新草稿');
    assert.equal(savedAfterClear.restoreVisible, false);
    run.checks.push('另一頁清除 key 後按恢復解除待恢復鎖，後續提交重新保存');

    // 讀取結果不明不得誤判成已刪除，也不得覆寫舊稿。
    await evaluate(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(oldDraft)})`);
    await navigate(sourcePath, sourceSeed);
    await evaluate(`(()=>{window.__core4GetItem=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k===${JSON.stringify(key)})throw new DOMException('read unavailable','UnknownError');return window.__core4GetItem.call(this,k)};return true})()`);
    await click('[data-action="restore-draft"]');
    const readFault = await inspect();
    assert.equal(readFault.restoreVisible, true);
    assert.equal(readFault.replaceVisible, true);
    assert.match(readFault.draft, /草稿無效|未覆寫/);
    await evaluate(`Storage.prototype.getItem=window.__core4GetItem;delete window.__core4GetItem`);
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'Core4 讀取故障後編輯' })})`);
    assert.equal(await storageValue(), oldDraft, '讀取結果不明不得覆寫舊稿');
    run.checks.push('getItem 拋錯仍 fail-closed，恢復／取代入口保留且舊稿 bytes 不變');

    await evaluate(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(oldDraft)})`);
    const probeFault = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(key + ':probe')})throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v)}})()`,
    });
    assert.ok(probeFault.identifier, '無法建立滿額啟動故障注入');
    try {
      await navigate(sourcePath, sourceSeed);
      const readable = await inspect();
      assert.equal(readable.restoreVisible, true, '寫探針失敗仍須顯示可讀舊稿');
      assert.equal(readable.replaceVisible, true, '寫探針失敗仍須保留明示取代入口');
      assert.match(readable.draft, /舊草稿可恢復；本機目前無法儲存新編輯/);
      await click('[data-action="restore-draft"]');
      const recovered = await inspect();
      assert.equal(recovered.spec.slides[0].content.title, editedTitle);
      assert.match(recovered.draft, /舊稿已恢復；本機目前無法儲存新編輯/);
      assert.equal(await storageValue(), oldDraft);
      run.checks.push('啟動時 quota 寫探針失敗，舊草稿仍能明示恢復');
    } finally {
      await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: probeFault.identifier });
    }
    await navigate(sourcePath, sourceSeed);
    await evaluate(`localStorage.setItem(${JSON.stringify(key)},'{broken')`);
    await navigate(sourcePath, sourceSeed);
    const corrupt = await inspect();
    assert.equal(corrupt.restoreVisible, false);
    assert.equal(corrupt.replaceVisible, false);
    assert.match(corrupt.draft, /草稿無效/);
    assert.deepEqual(corrupt.spec, rendered.spec);
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: nextTitle })})`);
    assert.equal(await storageValue(), '{broken', '損壞草稿不可被靜默覆寫');
    run.checks.push('損壞草稿拒絕恢復，後續提交不覆寫原 key');

    await evaluate(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(oldDraft)})`);
    await navigate(sourcePath, sourceSeed);
    assert.equal((await inspect()).restoreVisible, true);
    await click('[data-action="restore-draft"]');
    await evaluate(`(()=>{const original=Storage.prototype.setItem,blocked=${JSON.stringify(key)};
      Storage.prototype.setItem=function(k,v){if(k===blocked)throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v)};return true})()`);
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: nextTitle })})`);
    const quota = await waitDraft('本機草稿未保存；請另存 HTML。');
    assert.equal(quota.spec.slides[0].content.title, nextTitle, 'quota 不可回退成功交易');
    assert.equal(await storageValue(), oldDraft, 'quota 不可覆寫舊草稿');
    run.checks.push('quota truthful degrade；交易仍完成，舊草稿保留');

    await navigate(sourcePath, sourceSeed);
    assert.equal((await inspect()).restoreVisible, true);
    await evaluate(`(()=>{const original=Storage.prototype.getItem,blocked=${JSON.stringify(key)};
      Storage.prototype.getItem=function(item){if(item===blocked){Storage.prototype.getItem=original;throw new Error('temporary read fault')}return original.call(this,item)};return true})()`);
    await click('[data-action="restore-draft"]');
    const retryReadFault = await inspect();
    assert.equal(retryReadFault.restoreVisible, true, '暫時讀取失敗仍須保留恢復入口');
    assert.match(retryReadFault.draft, /讀取失敗/);
    await click('[data-action="restore-draft"]');
    const retryRestored = await inspect();
    assert.equal(retryRestored.spec.slides[0].content.title, editedTitle);
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: nextTitle })})`);
    await waitDraft('本機草稿已保存');
    assert.equal(JSON.parse(await storageValue()).spec.slides[0].content.title, nextTitle,
      '讀取故障解除並恢復後，新編輯仍須自動保存');
    run.checks.push('一次讀取故障後重試恢復，後續新編輯如實自動保存');

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
