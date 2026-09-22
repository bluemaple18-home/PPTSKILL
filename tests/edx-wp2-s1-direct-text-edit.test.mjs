import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const title = h => h.document.querySelector('[data-pptskill-element-id="role-title"]');
const keyPoint = h => h.document.querySelectorAll('[data-edit-target]').find(node => node.dataset.editTarget.endsWith('content.keyPoints.0'));
const dispatch = (h, type, target, fields = {}) => {
  const event = {
    target, key: '', isComposing: false, prevented: false, stopped: false,
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.stopped = true; },
    ...fields,
  };
  for (const listener of h.document.listeners[type] || []) {
    listener(event);
    if (event.stopped) break;
  }
  if (!event.stopped) for (const listener of h.document.body.listeners[type] || []) {
    listener(event);
    if (event.stopped) break;
  }
  return event;
};

test('WP2-S1 text mode 只開放 title/subtitle/keyPoint，component 不取得 direct-edit authority', () => {
  const h = mountedEditor(fixture(0));
  h.action('edit');
  assert.equal(title(h).contentEditable, 'true');
  assert.equal(keyPoint(h).contentEditable, 'true');
  assert.notEqual(h.component().contentEditable, 'true');

  const before = h.getSpec();
  h.component().textContent = 'DOM 不得直寫 component canonical';
  h.action('edit');
  assert.deepEqual(h.getSpec().slides[0].content.components, before.slides[0].content.components);
});

test('WP2-S1 blur / 完成編輯以 edit-text commit，preserve 其他 canonical scopes', () => {
  const h = mountedEditor(fixture(0));
  const before = h.getSpec();
  h.action('edit');
  title(h).textContent = '直接編輯後標題';
  dispatch(h, 'focusout', title(h));
  const after = h.getSpec();
  assert.equal(after.slides[0].content.title, '直接編輯後標題');
  assert.deepEqual(after.slides[0].composition, before.slides[0].composition);
  assert.deepEqual(after.style, before.style);

  keyPoint(h).textContent = '新的第一點';
  h.action('edit');
  assert.equal(h.getSpec().slides[0].content.keyPoints[0], '新的第一點');
});

test('WP2-S1 IME composition 期間 export fail loud，compositionend 才提交完整文字', () => {
  const h = mountedEditor(fixture(0));
  h.action('edit');
  const node = title(h), before = h.getSpec().slides[0].content.title;
  dispatch(h, 'compositionstart', node);
  node.textContent = '中文組字完成';
  assert.equal(h.getSpec().slides[0].content.title, before);
  assert.throws(() => h.api.exportHtml(), /組字|composition|IME/u);
  dispatch(h, 'compositionend', node);
  assert.equal(h.getSpec().slides[0].content.title, '中文組字完成');
  assert.doesNotThrow(() => h.api.exportHtml());
});

test('WP2-S1 IME 未完成時切到 layout 只取消 partial DOM，不提交 canonical', () => {
  const h = mountedEditor(fixture(0));
  h.action('edit');
  const node = title(h), original = h.getSpec().slides[0].content.title;
  dispatch(h, 'compositionstart', node);
  node.textContent = '尚未完成';
  h.api.layout.setMode(true);
  assert.equal(h.getSpec().slides[0].content.title, original);
  assert.equal(node.textContent, original);
  assert.equal(node.contentEditable, 'false');
  assert.equal(h.document.body.dataset.editorMode, 'layout');
});

test('WP2-S1 Escape 還原未提交 DOM，雙擊合法文字直接進 edit mode', () => {
  const h = mountedEditor(fixture(0));
  const node = title(h), original = h.getSpec().slides[0].content.title;
  dispatch(h, 'dblclick', node);
  assert.equal(node.contentEditable, 'true');
  node.textContent = '應被取消';
  const event = dispatch(h, 'keydown', node, { key: 'Escape' });
  assert.equal(event.prevented, true);
  assert.equal(node.textContent, original);
  assert.equal(h.getSpec().slides[0].content.title, original);
});

test('WP2-S1 export/reopen 使用 canonical committed text 且不輸出 contenteditable', () => {
  const h = mountedEditor(fixture(0));
  h.action('edit');
  title(h).textContent = '另存後仍一致';
  const html = h.api.exportHtml();
  assert.doesNotMatch(html, /contenteditable=/u);
  const match = html.match(/<script[^>]*id="deck-spec"[^>]*>([\s\S]*?)<\/script>/u);
  assert.ok(match);
  const spec = JSON.parse(match[1]);
  assert.equal(spec.slides[0].content.title, '另存後仍一致');
});
