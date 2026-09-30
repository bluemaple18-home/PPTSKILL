import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalDraft, buildDeckEditorCss, buildDeckEditorMarkup, buildDeckEditorRuntimeScript } from '../runtime/deck-editor.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';

const source = JSON.stringify({ schemaVersion: '1.0', deckId: 'deck-a', slides: [] });
const spec = title => ({ schemaVersion: '1.0', deckId: 'deck-a', title, slides: [] });
function memory() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function draft(storage, sourceText = source) {
  let revision = 0, canonical = spec('原始');
  const jobs = [], notices = [];
  const client = createLocalDraft({ storage, source: sourceText, deckId: 'deck-a', getRevision: () => revision,
    getSpec: () => canonical, validate: value => value?.schemaVersion === '1.0' && value.deckId === 'deck-a' && typeof value.title === 'string',
    schedule: job => jobs.push(job), notify: (...args) => notices.push(args) });
  return { client, jobs, notices, edit: value => { canonical = spec(value); revision++; client.commit(); }, setRevision: value => { revision = value; client.commit(); } };
}

test('Core4 自動合併成功提交；no-op 不排程且只保存最新 canonical', () => {
  const storage = memory(), h = draft(storage);
  h.client.commit(); assert.equal(h.jobs.length, 0);
  h.edit('甲'); h.edit('乙');
  assert.equal(h.jobs.length, 1);
  assert.equal(h.client.state(), 'pending');
  h.jobs.shift()();
  assert.equal(h.client.state(), 'saved');
  assert.equal(JSON.parse(storage.getItem(h.client.key)).spec.title, '乙');
  h.client.commit(); assert.equal(h.jobs.length, 0);
});

test('Core4 同來源重開可讀；其他初始來源隔離；損壞資料不覆寫', () => {
  const storage = memory(), first = draft(storage);
  first.edit('可恢復'); first.jobs.shift()();
  const reopened = draft(storage);
  assert.equal(reopened.client.read().title, '可恢復');
  const other = draft(storage, source + ' ');
  assert.equal(other.client.read(), null);
  storage.setItem(first.client.key, '{broken');
  const corrupted = draft(storage);
  assert.equal(corrupted.client.read(), null);
  corrupted.edit('不得覆寫'); corrupted.jobs.splice(0).forEach(job => job());
  assert.equal(storage.getItem(first.client.key), '{broken');
  assert.equal(corrupted.client.state(), 'failed');
});

test('Core4 quota、禁用、讀回失敗如實降級；舊草稿保留', () => {
  const storage = memory(), first = draft(storage);
  first.edit('舊稿'); first.jobs.shift()();
  const old = storage.getItem(first.client.key);
  storage.setItem = () => { throw Error('QuotaExceededError'); };
  first.edit('新稿'); first.jobs.shift()();
  assert.equal(first.client.state(), 'failed'); assert.equal(storage.getItem(first.client.key), old);
  const disabled = draft(null); assert.equal(disabled.client.state(), 'unavailable');
  disabled.edit('無法存'); assert.equal(disabled.jobs.length, 0);
});

test('Core4 草稿 UI 由 runtime 補建；匯出清除本機草稿控制', () => {
  assert.match(buildDeckEditorMarkup(), /data-action="restore-draft" hidden/);
  assert.match(buildDeckEditorMarkup(), /data-action="replace-draft" hidden>捨棄舊草稿，改存目前編輯/);
  const css = buildDeckEditorCss();
  assert.match(css, /\.pptskill-editor>:not\(\[data-action="edit"\]\):not\(\[data-action="layout"\]\)\{display:none\}/);
  assert.match(css, /body \.pptskill-editor>\[data-action="restore-draft"\]:not\(\[hidden\]\),body \.pptskill-editor>\[data-action="replace-draft"\]:not\(\[hidden\]\)\{display:inline-flex\}/);
  assert.doesNotMatch(css, /:not\(\[data-local-draft\]\)/);
  assert.match(css, /\[data-local-draft\]\[hidden\]\{display:none!important\}/);
  const runtime = buildDeckEditorRuntimeScript();
  assert.match(runtime, /cleanupEditorChromeFromExportClone/);
  assert.match(runtime, /\[data-local-draft\]/);
});

test('Core4 mounted 自動保存→重開→明示恢復；恢復後匯出一致', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '已保存標題' });
    await Promise.resolve();
    assert.equal(first.document.querySelector('[data-local-draft][role="status"]').textContent, '本機草稿已保存');
    const second = mountedEditor(fixture(0));
    assert.notEqual(second.getSpec().slides[0].content.title, '已保存標題');
    const deck = second.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    second.action('restore-draft');
    assert.equal(second.getSpec().slides[0].content.title, '已保存標題', second.document.querySelector('[data-local-draft][role="status"]').textContent);
    assert.equal(second.getRevision(), 1);
    assert.equal(second.api.getHistoryState().entries, 0);
    const html = second.api.exportHtml();
    assert.equal(extractDeckSpec(html).slides[0].content.title, '已保存標題');
    assert.doesNotMatch(html, /本機草稿已保存/);
    const offline = mountedEditor(extractDeckSpec(html));
    assert.equal(offline.getSpec().slides[0].content.title, '已保存標題');
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 mounted 未提交文字不被覆蓋；Undo／Redo 僅成功交易更新草稿', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.layout.setMode(true);
    const edit = value => first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value });
    edit('第一版'); await Promise.resolve();
    const key = [...storage.values.keys()].find(item => item.startsWith('pptskill:draft:v1:') && !item.endsWith(':probe'));
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, '第一版');
    first.api.undo(); await Promise.resolve();
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, fixture(0).slides[0].content.title);
    first.api.redo(); await Promise.resolve();
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, '第一版');
    assert.throws(() => edit(null)); await Promise.resolve();
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, '第一版');
    const second = mountedEditor(fixture(0)), node = second.document.querySelector('[data-pptskill-element-id="role-title"]');
    node.textContent = '未提交文字';
    second.action('restore-draft');
    assert.notEqual(second.getSpec().slides[0].content.title, '第一版');
    assert.equal(node.textContent, '未提交文字');
    assert.match(second.document.querySelector('[data-local-draft][role="status"]').textContent, /未完成|編輯/);
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 mounted 結構性複製恢復 DOM 與 export 同步', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.action('duplicate'); await Promise.resolve();
    assert.equal(first.getSpec().slides.length, 2);
    const second = mountedEditor(fixture(0)), deck = second.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    second.action('restore-draft');
    assert.equal(second.getSpec().slides.length, 2, second.document.querySelector('[data-local-draft][role="status"]').textContent);
    assert.deepEqual(deck.children.map(node => node.dataset.slideId), second.getSpec().slides.map(slide => slide.id));
    assert.deepEqual(extractDeckSpec(second.api.exportHtml()).slides.map(slide => slide.id), second.getSpec().slides.map(slide => slide.id));
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 mounted gesture preview 不保存；完成後才保存且 storage 故障不回退編輯', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const h = mountedEditor(fixture(0)); h.ready();
    const count = () => [...storage.values.keys()].filter(key => key.startsWith('pptskill:draft:v1:') && !key.endsWith(':probe')).length;
    h.resetCounts(); h.begin(); h.update(8, 0); await Promise.resolve();
    assert.equal(count(), 0);
    assert.equal(h.counts.wholeSpecSerializations, 0);
    h.finish(); await Promise.resolve();
    assert.equal(count(), 1);
    storage.setItem = () => { throw Error('quota'); };
    h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '交易仍完成' });
    await Promise.resolve();
    assert.equal(h.getSpec().slides[0].content.title, '交易仍完成');
    assert.equal(h.document.querySelector('[data-local-draft][role="status"]').textContent, '本機草稿未保存；請另存 HTML。');
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 mounted 新增元件恢復唯一 DOM，後續仍可編輯', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'insert-element', target: { slideId: 'portable' }, value: {
      component: { id: 'new-text', type: 'text', text: '本機新增' }, geometry: { x: 300, y: 300, width: 240, height: 160 },
    } });
    await Promise.resolve();
    const second = mountedEditor(fixture(0)), deck = second.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    second.action('restore-draft');
    const nodes = deck.querySelectorAll('[data-pptskill-element-id="component-new-text"]');
    assert.equal(nodes.length, 1, second.document.querySelector('[data-local-draft][role="status"]').textContent);
    assert.equal(nodes[0].textContent, '本機新增');
    second.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'component-new-text' }, value: '恢復後編輯' });
    assert.equal(second.getSpec().slides[0].content.components.find(item => item.id === 'new-text').text, '恢復後編輯');
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 Repair1 P1-A：待恢復舊稿時新編輯不得靜默覆寫', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '舊草稿' });
    await Promise.resolve();
    const key = [...storage.values.keys()].find(item => item.startsWith('pptskill:draft:v1:') && !item.endsWith(':probe'));
    const original = storage.getItem(key), second = mountedEditor(fixture(0));
    assert.equal(second.document.querySelector('[data-action="restore-draft"]').hidden, false);
    second.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '本次新編輯' });
    await Promise.resolve();
    assert.equal(second.getSpec().slides[0].content.title, '本次新編輯');
    assert.equal(storage.getItem(key), original);
    assert.match(second.document.querySelector('[data-local-draft][role="status"]').textContent, /舊稿|待恢復/);
    assert.equal(second.document.querySelector('[data-action="restore-draft"]').hidden, false);
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 Repair1 P1-B：quota 探針失敗仍可讀舊稿並明示恢復', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '滿額前舊稿' });
    await Promise.resolve();
    const key = [...storage.values.keys()].find(item => item.startsWith('pptskill:draft:v1:') && !item.endsWith(':probe'));
    storage.setItem = () => { throw Error('QuotaExceededError'); };
    const second = mountedEditor(fixture(0)), deck = second.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    assert.equal(second.document.querySelector('[data-action="restore-draft"]').hidden, false);
    assert.match(second.document.querySelector('[data-local-draft][role="status"]').textContent, /無法儲存|不可用/);
    second.action('restore-draft');
    assert.equal(second.getSpec().slides[0].content.title, '滿額前舊稿');
    second.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '滿額後編輯' });
    await Promise.resolve();
    assert.equal(second.getSpec().slides[0].content.title, '滿額後編輯');
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, '滿額前舊稿');
    assert.match(second.document.querySelector('[data-local-draft][role="status"]').textContent, /無法儲存|不可用/);
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 Repair1 P2-A：setItem 後真正讀回異常標示結果不明', () => {
  const storage = memory(), first = draft(storage);
  first.edit('舊稿'); first.jobs.shift()();
  const old = storage.getItem(first.client.key);
  let failRead = false;
  const getItem = storage.getItem;
  storage.getItem = key => { if (key === first.client.key && failRead) { failRead = false; throw Error('readback unavailable'); } return getItem(key); };
  const setItem = storage.setItem;
  storage.setItem = (key, value) => { setItem(key, value); if (key === first.client.key) failRead = true; };
  first.edit('新稿'); first.jobs.shift()();
  assert.notEqual(storage.getItem(first.client.key), old);
  assert.equal(first.client.state(), 'unknown');
  assert.match(first.notices.at(-1)[1], /無法確認|結果不明/);
  first.edit('後續編輯');
  assert.equal(first.jobs.length, 0, '不明結果不得繼續覆寫');
});

test('Core4 Repair1 P2-B：恢復後段 fault 回退後入口仍可重試', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '可重試舊稿' });
    await Promise.resolve();
    const second = mountedEditor(fixture(0)), deck = second.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    const button = second.document.querySelector('[data-action="restore-draft"]');
    const undo = second.document.querySelector('[data-action="undo"]');
    const status = second.document.querySelector('[data-editor-status]');
    let disabled = undo.disabled, once = true;
    Object.defineProperty(undo, 'disabled', { configurable: true,
      get() { return disabled; },
      set(value) { disabled = value; if (once && second.getRevision() === 1) { once = false; throw Error('late restore fault'); } },
    });
    second.action('restore-draft');
    assert.notEqual(second.getSpec().slides[0].content.title, '可重試舊稿');
    assert.equal(second.getRevision(), 0);
    assert.equal(button.hidden, false, 'rollback 後仍須顯示恢復入口');
    second.action('restore-draft');
    assert.equal(second.getSpec().slides[0].content.title, '可重試舊稿');
    assert.equal(button.hidden, true);
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 Repair2 P1：明示取代前保留舊稿，取代後保存目前 canonical 並可重開恢復', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '待恢復舊稿' });
    await Promise.resolve();
    const key = [...storage.values.keys()].find(item => item.startsWith('pptskill:draft:v1:') && !item.endsWith(':probe'));
    const oldRaw = storage.getItem(key), second = mountedEditor(fixture(0));
    const restore = second.document.querySelector('[data-action="restore-draft"]');
    const replace = second.document.querySelector('[data-action="replace-draft"]');
    assert.equal(restore.hidden, false);
    assert.equal(replace.hidden, false);
    second.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '目前新編輯' });
    await Promise.resolve();
    assert.equal(storage.getItem(key), oldRaw, '未明示取代前舊稿 bytes 必須不變');
    second.action('replace-draft');
    assert.equal(storage.getItem(key), oldRaw, '排程完成前不得先刪除舊稿');
    await Promise.resolve();
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, '目前新編輯');
    assert.equal(restore.hidden, true);
    assert.equal(replace.hidden, true);
    const reopened = mountedEditor(fixture(0)), deck = reopened.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    reopened.action('restore-draft');
    assert.equal(reopened.getSpec().slides[0].content.title, '目前新編輯');
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 Repair2 P1：明示取代寫入失敗時保留舊稿，恢復後可由原按鈕重試', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '失敗前舊稿' });
    await Promise.resolve();
    const key = [...storage.values.keys()].find(item => item.startsWith('pptskill:draft:v1:') && !item.endsWith(':probe'));
    const oldRaw = storage.getItem(key), second = mountedEditor(fixture(0));
    second.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '不可假稱已保存' });
    await Promise.resolve();
    const setItem = storage.setItem;
    storage.setItem = () => { throw Error('QuotaExceededError'); };
    second.action('replace-draft');
    await Promise.resolve();
    assert.equal(storage.getItem(key), oldRaw);
    assert.equal(second.document.querySelector('[data-action="restore-draft"]').hidden, false);
    assert.equal(second.document.querySelector('[data-action="replace-draft"]').hidden, false);
    assert.match(second.document.querySelector('[data-local-draft][role="status"]').textContent, /未保存|另存 HTML/);
    storage.setItem = setItem;
    second.action('replace-draft');
    await Promise.resolve();
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, '不可假稱已保存');
    assert.equal(second.document.querySelector('[data-action="restore-draft"]').hidden, true);
    assert.equal(second.document.querySelector('[data-action="replace-draft"]').hidden, true);
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 Repair2 P2：舊稿確定消失才解鎖保存，讀取故障仍封閉覆寫', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '外部刪除前舊稿' });
    await Promise.resolve();
    const key = [...storage.values.keys()].find(item => item.startsWith('pptskill:draft:v1:') && !item.endsWith(':probe'));
    const second = mountedEditor(fixture(0));
    storage.removeItem(key);
    second.action('restore-draft');
    assert.equal(second.document.querySelector('[data-action="restore-draft"]').hidden, true);
    assert.equal(second.document.querySelector('[data-action="replace-draft"]').hidden, true);
    second.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '刪除後新稿' });
    await Promise.resolve();
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, '刪除後新稿');

    const third = mountedEditor(fixture(0)), getItem = storage.getItem;
    const preserved = getItem(key);
    storage.getItem = item => { if (item === key) throw Error('read unavailable'); return getItem(item); };
    third.action('restore-draft');
    assert.equal(third.document.querySelector('[data-action="restore-draft"]').hidden, false);
    third.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '讀取故障後編輯' });
    await Promise.resolve();
    storage.getItem = getItem;
    assert.equal(storage.getItem(key), preserved, '讀取結果不明不得覆寫');
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 讀取暫時失敗後重試恢復，後續編輯仍須自動保存', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '重試前舊稿' });
    await Promise.resolve();
    const key = [...storage.values.keys()].find(item => item.startsWith('pptskill:draft:v1:') && !item.endsWith(':probe'));
    const second = mountedEditor(fixture(0)), deck = second.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    const getItem = storage.getItem;
    storage.getItem = item => { if (item === key) throw Error('temporary read fault'); return getItem(item); };
    second.action('restore-draft');
    assert.equal(second.document.querySelector('[data-action="restore-draft"]').hidden, false);
    storage.getItem = getItem;
    second.action('restore-draft');
    assert.equal(second.getSpec().slides[0].content.title, '重試前舊稿');
    second.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '重試後新稿' });
    assert.match(second.document.querySelector('[data-local-draft][role="status"]').textContent, /待保存/);
    await Promise.resolve();
    assert.equal(second.document.querySelector('[data-local-draft][role="status"]').textContent, '本機草稿已保存');
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, '重試後新稿');
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 無效草稿與寫入結果不明不得由後續合法讀取解鎖', () => {
  const storage = memory(), first = draft(storage);
  first.edit('舊稿'); first.jobs.shift()();
  const key = first.client.key, valid = storage.getItem(key);

  storage.setItem(key, '{broken');
  const invalid = draft(storage);
  assert.equal(invalid.client.read(), null);
  storage.setItem(key, valid);
  assert.equal(invalid.client.read().title, '舊稿');
  invalid.client.markRestored();
  assert.notEqual(invalid.client.state(), 'saved');
  invalid.edit('不可解鎖無效紀錄');
  assert.equal(invalid.jobs.length, 0);
  assert.equal(storage.getItem(key), valid);

  const uncertain = draft(storage), getItem = storage.getItem, setItem = storage.setItem;
  let failReadback = false;
  storage.setItem = (item, value) => { setItem(item, value); if (item === key) failReadback = true; };
  storage.getItem = item => { if (item === key && failReadback) { failReadback = false; throw Error('readback unknown'); } return getItem(item); };
  uncertain.edit('結果不明'); uncertain.jobs.shift()();
  assert.equal(uncertain.client.state(), 'unknown');
  assert.equal(uncertain.client.read().title, '結果不明');
  uncertain.client.markRestored();
  assert.equal(uncertain.client.state(), 'unknown');
  uncertain.edit('不可解鎖不明結果');
  assert.equal(uncertain.jobs.length, 0);
  assert.equal(JSON.parse(storage.getItem(key)).spec.title, '結果不明');
});

test('Core4 Repair2 P2：恢復提交後通知 fault 不得回報原稿未動', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '通知故障仍須恢復' });
    await Promise.resolve();
    const key = [...storage.values.keys()].find(item => item.startsWith('pptskill:draft:v1:') && !item.endsWith(':probe'));
    const second = mountedEditor(fixture(0)), deck = second.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    const draftStatus = second.document.querySelector('[data-local-draft][role="status"]');
    let value = draftStatus.textContent, once = true;
    Object.defineProperty(draftStatus, 'textContent', { configurable: true,
      get() { return value; },
      set(next) { if (once && next === '本機草稿已保存') { once = false; throw Error('draft status fault'); } value = String(next); },
    });
    second.action('restore-draft');
    assert.equal(second.getSpec().slides[0].content.title, '通知故障仍須恢復');
    assert.equal(second.getRevision(), 1);
    assert.equal(second.document.querySelector('[data-action="restore-draft"]').hidden, true);
    assert.equal(second.document.querySelector('[data-action="replace-draft"]').hidden, true);
    assert.match(second.document.querySelector('[data-editor-status]').textContent, /已恢復本機草稿/);
    assert.doesNotMatch(second.document.querySelector('[data-editor-status]').textContent, /原稿未改動/);
    assert.match(draftStatus.textContent, /舊稿已恢復/);
    second.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '通知 fault 後仍可保存' });
    await Promise.resolve();
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, '通知 fault 後仍可保存');
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});

test('Core4 Repair2 P1：主要 editor status fault 不得回滾已提交恢復', async () => {
  const { mountedEditor, fixture } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const storage = memory(), old = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const first = mountedEditor(fixture(0));
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'editor status fault 仍須恢復' });
    await Promise.resolve();
    const key = [...storage.values.keys()].find(item => item.startsWith('pptskill:draft:v1:') && !item.endsWith(':probe'));
    const second = mountedEditor(fixture(0)), deck = second.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    const editorStatus = second.document.querySelector('[data-editor-status]');
    let value = editorStatus.textContent, once = true;
    Object.defineProperty(editorStatus, 'textContent', { configurable: true,
      get() { return value; },
      set(next) { if (once && next === '已恢復本機草稿') { once = false; throw Error('editor status fault'); } value = String(next); },
    });
    second.action('restore-draft');
    assert.equal(second.getSpec().slides[0].content.title, 'editor status fault 仍須恢復');
    assert.equal(second.getRevision(), 1);
    assert.equal(second.api.getHistoryState().entries, 0);
    assert.equal(second.document.querySelector('[data-action="restore-draft"]').hidden, true);
    assert.equal(second.document.querySelector('[data-action="replace-draft"]').hidden, true);
    assert.match(editorStatus.textContent, /已恢復本機草稿/);
    assert.doesNotMatch(editorStatus.textContent, /原稿未改動/);

    second.api.layout.setMode(true);
    second.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'status fault 後續編輯' });
    await Promise.resolve();
    assert.equal(JSON.parse(storage.getItem(key)).spec.slides[0].content.title, 'status fault 後續編輯');
    assert.equal(second.api.undo(), true);
    await Promise.resolve();
    assert.equal(second.api.redo(), true);
    await Promise.resolve();
    assert.equal(extractDeckSpec(second.api.exportHtml()).slides[0].content.title, 'status fault 後續編輯');
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'localStorage', old);
    else delete Object.prototype.localStorage;
  }
});
