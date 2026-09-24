import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDeckEditor, OPERATION_DESCRIPTORS } from '../runtime/deck-editor.js';
import { sanitizeDeckSpec, extractDeckSpec } from '../runtime/deck-spec.js';
import { fixture, mountedEditor } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const ids = ['component-group-text', 'component-perf-image'];
const target = { slideId: 'portable', elementIds: ids };
const request = (operation, value = {}, elementIds = ids) => ({ operation, target: { ...target, elementIds: [...elementIds] }, value });
const input = () => {
  const spec = fixture(0), slide = spec.slides[0];
  slide.content.components.push({ id: 'group-text', type: 'text', text: '群組文字' }, { id: 'other-text', type: 'text', text: '群組外文字' });
  Object.assign(slide.composition.geometryOverrides, {
    'group-text': { x: 120, y: 120, width: 200, height: 160 },
    'perf-image': { x: 420, y: 320, width: 300, height: 200 },
    'other-text': { x: 1050, y: 120, width: 200, height: 160 },
  });
  return spec;
};
const setup = portable => {
  const h = portable ? mountedEditor(input()) : null;
  const api = h?.api || createDeckEditor(input());
  // Node editor沒有revision公開API；revision斷言只對既有portable runtime取證。
  return { h, api, read: () => h ? h.getSpec() : api.getSpec(), revision: expected => { if (h) assert.equal(h.getRevision(), expected); } };
};
const composition = spec => spec.slides[0].composition;

for (const portable of [false, true]) {
  const lane = portable ? 'portable VM（synthetic）' : 'Node';
  test(`Core2 ${lane} group／ungroup 只改 metadata，clone 與 atomic revision`, () => {
    const { api, read, revision } = setup(portable), before = read();
    const result = api.executeOperation(request('group-elements'));
    assert.deepEqual(composition(read()).elementGroups, [ids]);
    assert.deepEqual(read().slides[0].content, before.slides[0].content);
    assert.deepEqual(composition(read()).geometryOverrides, composition(before).geometryOverrides);
    revision(1);
    result.slides[0].composition.elementGroups[0].push('bad');
    assert.deepEqual(composition(read()).elementGroups, [ids]);
    api.executeOperation(request('group-elements'));
    revision(1);
    api.executeOperation(request('ungroup-elements'));
    assert.deepEqual(read(), before);
    revision(2);
  });

  test(`Core2 ${lane} group move／resize 比例、單次提交與整批拒絕`, () => {
    const { api, read, revision } = setup(portable);
    api.executeOperation(request('group-elements'));
    api.executeOperation(request('move-group', { x: 160, y: 160 }));
    revision(2);
    assert.deepEqual(composition(read()).geometryOverrides['group-text'], { x: 160, y: 160, width: 200, height: 160 });
    assert.deepEqual(composition(read()).geometryOverrides['perf-image'], { x: 460, y: 360, width: 300, height: 200 });
    api.executeOperation(request('resize-group', { width: 900, height: 600 }));
    revision(3);
    assert.deepEqual(composition(read()).geometryOverrides['group-text'], { x: 160, y: 160, width: 300, height: 240 });
    assert.deepEqual(composition(read()).geometryOverrides['perf-image'], { x: 610, y: 460, width: 450, height: 300 });
    const before = read();
    for (const bad of [request('move-group', { x: 1000, y: 160 }), request('resize-group', { width: 100, height: 100 }), request('move-group', { x: 160, y: 160 }, [ids[0]])]) {
      assert.throws(() => api.executeOperation(bad));
      assert.deepEqual(read(), before);
      revision(3);
    }
    api.executeOperation(request('resize-group', { width: 900, height: 600 }));
    revision(3);
  });

  test(`Core2 ${lane} lock 擋 patch／edit／transform／delete／部分 group，unlock 可續編`, () => {
    const { api, read, revision } = setup(portable);
    api.executeOperation(request('group-elements'));
    api.executeOperation(request('lock-elements'));
    assert.deepEqual(composition(read()).lockedElementIds, ids);
    revision(2);
    api.executeOperation(request('lock-elements'));
    revision(2);
    const before = read(), elementTarget = { slideId: 'portable', elementId: ids[0] };
    const blocked = [
      () => api.executeOperation(request('ungroup-elements')),
      () => api.executeOperation(request('unlock-elements', {}, [ids[0]])),
      () => api.executeOperation(request('move-group', { x: 160, y: 160 })),
      () => api.executeOperation({ operation: 'edit-text', target: elementTarget, value: '不可寫入' }),
      () => api.executeOperation({ operation: 'move-element', target: elementTarget, value: { x: 160, y: 160 } }),
      () => api.executeOperation({ operation: 'delete-element', target: elementTarget, value: { confirm: true } }),
      () => api.applyLocalPatch({ slideId: 'portable', region: 'content.components.group-text', value: { text: '不可旁路' } }),
    ];
    for (const [index, mutate] of blocked.entries()) { assert.throws(mutate, `locked mutation ${index} 必須拒絕`); assert.deepEqual(read(), before); revision(2); }
    api.executeOperation(request('unlock-elements'));
    api.executeOperation({ operation: 'edit-text', target: elementTarget, value: '解鎖後可編輯' });
    assert.deepEqual(composition(read()).elementGroups, [ids]);
    api.executeOperation(request('ungroup-elements'));
    api.executeOperation({ operation: 'delete-element', target: elementTarget, value: { confirm: true } });
    assert.equal(read().slides[0].content.components.some(c => c.id === 'group-text'), false);
  });

  test(`Core2 ${lane} exact own-data payload 不呼叫 getter`, () => {
    const { api, read } = setup(portable), before = read();
    let getters = 0;
    for (const part of ['request', 'target', 'value', 'ids']) for (const fault of ['getter', 'hidden', 'symbol', 'prototype']) {
      const bad = request('group-elements'), obj = part === 'request' ? bad : part === 'ids' ? bad.target.elementIds : bad[part];
      if (fault === 'getter') Object.defineProperty(obj, part === 'ids' ? '0' : part === 'request' ? 'operation' : part === 'target' ? 'slideId' : 'extra', { enumerable: true, get() { getters++; throw Error('getter 被執行'); } });
      if (fault === 'hidden') Object.defineProperty(obj, 'extra', { value: 1 });
      if (fault === 'symbol') obj[Symbol('extra')] = 1;
      if (fault === 'prototype') Object.setPrototypeOf(obj, { extra: 1 });
      assert.throws(() => api.executeOperation(bad));
      assert.deepEqual(read(), before);
    }
    assert.equal(getters, 0);
  });
}

test('Core2 metadata sanitizer 持久化與非法引用不得靜默清除', () => {
  const spec = input();
  Object.assign(composition(spec), { elementGroups: [ids], lockedElementIds: ids });
  assert.deepEqual(composition(sanitizeDeckSpec(spec)).elementGroups, [ids]);
  assert.deepEqual(composition(sanitizeDeckSpec(spec)).lockedElementIds, ids);
  for (const metadata of [
    { elementGroups: [[ids[0]]] }, { elementGroups: [ids, ids] }, { elementGroups: [[ids[0], 'role-title']] },
    { elementGroups: [[ids[0], 'component-missing']] }, { lockedElementIds: [ids[0], ids[0]] },
    { lockedElementIds: ['role-title'] }, { lockedElementIds: null }, { elementGroups: 'bad' },
  ]) {
    const bad = input(); Object.assign(composition(bad), metadata);
    assert.throws(() => sanitizeDeckSpec(bad));
  }
});

test('Core2 schema／operationDescriptors 與 portable export 保留 authority', () => {
  const schema = JSON.parse(readFileSync(new URL('../schemas/deck-spec.schema.json', import.meta.url), 'utf8')).$defs.compositionSpec;
  assert.ok(schema.properties.elementGroups);
  assert.ok(schema.properties.lockedElementIds);
  for (const operation of ['group-elements', 'ungroup-elements', 'lock-elements', 'unlock-elements', 'move-group', 'resize-group']) assert.ok(OPERATION_DESCRIPTORS[operation]);
  const { api, read } = setup(true);
  api.executeOperation(request('group-elements')); api.executeOperation(request('lock-elements'));
  assert.deepEqual(extractDeckSpec(api.exportHtml()), read());
});

const nodeFor = (h, id) => h.document.querySelector('[data-pptskill-element-id="' + id + '"]');
const selectedIds = h => Array.from(h.api.layout.getSelectionState().selected);
const groupedUi = () => {
  const h = mountedEditor(input()); h.api.layout.setMode(true);
  h.click(nodeFor(h, ids[0])); h.click(nodeFor(h, ids[1]), { shiftKey: true }); h.action('group-elements');
  assert.deepEqual(new Set(composition(h.getSpec()).elementGroups[0]), new Set(ids));
  return h;
};
const key = (h, value, extra = {}) => {
  const e = { target: h.document.body, key: value, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra };
  for (const fn of h.document.listeners.keydown || []) { fn(e); if (e.stopped) break; } return e;
};

test('Core2 mounted toolbar、原生group事件mapping、單次revision與clone', () => {
  const h = groupedUi(), before = h.getSpec();
  assert.equal(h.vendor.options.target.length, 2);
  assert.equal(h.vendor.options.hideChildMoveableDefaultLines, true, '群組須隱藏子 Moveable 預設邊線');
  assert.equal(typeof h.vendor.handlers.dragGroupStart, 'function');
  assert.equal(typeof h.vendor.handlers.resizeGroupStart, 'function');
  h.resetCounts(); h.begin('dragGroup'); h.update(40, 40, 'dragGroup');
  assert.deepEqual(h.getSpec(), before, 'preview不提交');
  h.finish('dragGroup'); assert.equal(h.getRevision(), 2);
  assert.equal(composition(h.getSpec()).geometryOverrides['group-text'].x, 160);
  assert.equal(composition(h.getSpec()).geometryOverrides['perf-image'].x, 460);
  h.begin('resizeGroup'); h.update(300, 200, 'resizeGroup');
  h.vendor.handlers.resizeGroupEnd({ inputEvent: { clientX: 300, clientY: 200, isTrusted: true } });
  assert.equal(h.getRevision(), 3);
  assert.deepEqual(composition(h.getSpec()).geometryOverrides['group-text'], { x: 160, y: 160, width: 300, height: 240 });
  const clone = h.api.layout.getState(); clone.target.elementIds.push('corrupt');
  assert.equal(h.api.layout.getState().target.elementIds.length, 2);
});

test('Core2 portable group resize 最後 update 有效、release 越過 minimum 時整組不提交', () => {
  const h = groupedUi(), before = h.getSpec(), revision = h.getRevision();
  const nodes = ids.map(id => nodeFor(h, id)), styles = nodes.map(node => node.getAttribute('style'));
  h.begin('resizeGroup');
  h.update(-100, -30, 'resizeGroup');
  assert.deepEqual(h.getSpec(), before, '中途 preview 不提交');
  h.vendor.handlers.resizeGroupEnd({ inputEvent: { clientX: -700, clientY: -200, isTrusted: true } });
  assert.deepEqual(h.getSpec(), before);
  assert.equal(h.getRevision(), revision);
  assert.deepEqual(nodes.map(node => node.getAttribute('style')), styles);
  assert.deepEqual(Array.from(h.api.layout.getState().target.elementIds), selectedIds(h));
  assert.equal(h.api.layout.getState().gesturing, false);
});

test('Core2 portable refresh 已生效後拋錯仍恢復群組互動投影與原始錯誤', () => {
  const h = groupedUi(), before = h.getSpec(), revision = h.getRevision();
  const selection = selectedIds(h), target = h.api.layout.getState().target;
  const originalVendor = h.vendor, status = h.document.querySelector('[data-editor-status]');
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(status), 'textContent');
  const failure = new Error('injected AFTER refresh'); let faults = 0;
  Object.defineProperty(status, 'textContent', { configurable: true, get() { return descriptor.get.call(this); }, set(value) {
    descriptor.set.call(this, value);
    if (value === '已鎖定；選取後可解鎖') { faults++; throw failure; }
  } });
  assert.throws(() => h.api.executeOperation(request('lock-elements')), error => error === failure);
  assert.equal(faults, 1);
  assert.deepEqual(h.getSpec(), before);
  assert.equal(h.getRevision(), revision);
  assert.deepEqual(selectedIds(h), selection);
  assert.deepEqual(h.api.layout.getState().target, target);
  assert.equal(h.vendor.destroyed, false);
  assert.equal(originalVendor.destroyed, true, '失敗的 refresh 已移除舊 handle，rollback 須重建');
  assert.equal(typeof h.vendor.handlers.resizeGroupStart, 'function');
});

test('Core2 portable rollback 投影再拋錯仍保留原始 operation error', () => {
  const h = groupedUi(), before = h.getSpec(), revision = h.getRevision();
  const status = h.document.querySelector('[data-editor-status]');
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(status), 'textContent');
  const failure = new Error('injected AFTER refresh'); let faults = 0, rollbackFaults = 0;
  Object.defineProperty(status, 'textContent', { configurable: true, get() { return descriptor.get.call(this); }, set(value) {
    descriptor.set.call(this, value);
    if (value === '已鎖定；選取後可解鎖') { faults++; throw failure; }
  } });
  const Moveable = h.window.PPTSKILLMoveable.default;
  h.window.PPTSKILLMoveable.default = class extends Moveable {
    on(name, handler) {
      super.on(name, handler);
      if (name === 'resizeGroupEnd' && rollbackFaults++ === 0) throw new Error('injected rollback');
    }
  };
  assert.throws(() => h.api.executeOperation(request('lock-elements')), error => error === failure);
  assert.equal(faults, 1); assert.ok(rollbackFaults >= 1);
  assert.deepEqual(h.getSpec(), before);
  assert.equal(h.getRevision(), revision);
  assert.deepEqual(new Set(selectedIds(h)), new Set(ids));
  assert.deepEqual(new Set(h.api.layout.getState().target.elementIds), new Set(ids));
  assert.equal(h.vendor.destroyed, false);
});

test('Core2 mounted click/marquee展開整組、Shift切換不拆散', () => {
  const h = groupedUi(); h.api.layout.clearSelection();
  h.click(nodeFor(h, ids[0])); assert.deepEqual(new Set(selectedIds(h)), new Set(ids));
  h.click(nodeFor(h, ids[1]), { shiftKey: true }); assert.deepEqual(selectedIds(h), []);
  h.selecto.handlers.selectEnd({ selected: [nodeFor(h, ids[1])], inputEvent: {} });
  assert.deepEqual(new Set(selectedIds(h)), new Set(ids));
  h.action('ungroup-elements'); assert.equal(composition(h.getSpec()).elementGroups, undefined);
  h.click(nodeFor(h, ids[0])); assert.deepEqual(selectedIds(h), [ids[0]]);
});

test('Core2 mounted lock可選取解鎖，但沒有transform或image/text入口', () => {
  const h = groupedUi(), vendor = h.vendor; h.action('lock-elements');
  assert.equal(vendor.destroyed, true); assert.equal(h.api.layout.getState().target, null);
  assert.equal(h.document.querySelector('[data-action="initialize-layout"]').hidden, true);
  const before = h.getSpec(); key(h, 'ArrowRight'); assert.deepEqual(h.getSpec(), before);
  h.api.layout.clearSelection(); h.click(nodeFor(h, ids[1])); assert.deepEqual(new Set(selectedIds(h)), new Set(ids));
  h.action('unlock-elements'); assert.ok(h.api.layout.getState().target.elementIds);
  h.action('ungroup-elements'); h.click(nodeFor(h, ids[1])); h.action('lock-elements');
  for (const action of ['replace-selected-image', 'crop-selected-image']) assert.equal(h.document.querySelector('[data-action="' + action + '"]').hidden, true);
  h.action('unlock-elements'); assert.equal(h.document.querySelector('[data-action="replace-selected-image"]').hidden, false);
});

test('Core2 mounted group nudge、IME guard、Escape/pointercancel均不誤提交', () => {
  const h = groupedUi(); assert.equal(key(h, 'ArrowRight', { shiftKey: true }).prevented, true);
  assert.equal(composition(h.getSpec()).geometryOverrides['group-text'].x, 130);
  const before = h.getSpec(); key(h, 'ArrowRight', { isComposing: true }); assert.deepEqual(h.getSpec(), before);
  h.begin('dragGroup'); h.update(50, 50, 'dragGroup'); const old = h.vendor; key(h, 'Escape'); old.handlers.dragGroupEnd();
  assert.deepEqual(h.getSpec(), before); assert.deepEqual(selectedIds(h), []);
  h.click(nodeFor(h, ids[0])); h.begin('resizeGroup'); h.update(200, 100, 'resizeGroup');
  for (const fn of h.document.listeners.pointercancel || []) fn({}); h.finish('resizeGroup'); assert.deepEqual(h.getSpec(), before);
});

test('Core2 mounted stale／bounds／minimum拒絕，移除任一成員取消整组', () => {
  const h = groupedUi(), before = h.getSpec();
  for (const [kind, x, y] of [['dragGroup', -1000, 0], ['resizeGroup', -590, -390]]) {
    h.begin(kind); h.update(x, y, kind); h.finish(kind); assert.deepEqual(h.getSpec(), before);
  }
  h.begin('dragGroup'); h.update(40, 40, 'dragGroup'); nodeFor(h, ids[1]).remove(); h.flushMutations();
  assert.deepEqual(h.getSpec(), before); assert.equal(h.api.layout.getState().gesturing, false);
});

test('Core2 mounted export/reopen清UI並保留group lock；duplicate不共用metadata引用', () => {
  const h = groupedUi(); h.action('lock-elements'); const before = h.getSpec();
  const html = h.api.exportHtml(), exported = extractDeckSpec(html);
  assert.deepEqual(exported, before); assert.doesNotMatch(html, /data-editor-selected="true"/);
  const reopened = mountedEditor(exported); reopened.api.layout.setMode(true); reopened.click(nodeFor(reopened, ids[0]));
  assert.deepEqual(new Set(selectedIds(reopened)), new Set(ids)); reopened.action('unlock-elements');
  assert.deepEqual(new Set(composition(before).lockedElementIds), new Set(ids));
  h.action('duplicate'); const copy = h.getSpec().slides.find(s => s.id !== 'portable');
  assert.deepEqual(new Set(copy.composition.elementGroups[0]), new Set(ids)); assert.deepEqual(new Set(copy.composition.lockedElementIds), new Set(ids));
});

for (const portable of [false, true]) {
  test(`Core2 ${portable ? 'portable' : 'Node'} locked多目標／圖片mutation入口整批拒絕`, () => {
    const { api, read } = setup(portable);
    api.executeOperation(request('lock-elements', {}, [ids[1]])); const before = read();
    const imageTarget = { slideId: 'portable', elementId: ids[1] };
    const mutations = [
      { operation: 'resize-element', target: imageTarget, value: { width: 320, height: 220 } },
      { operation: 'replace-asset', target: imageTarget, value: { dataUri: before.slides[0].content.components.find(c => c.id === 'perf-image').dataUri, fit: 'cover' } },
      { operation: 'crop-image', target: imageTarget, value: { x: 0, y: 0, width: 1, height: 1, classification: 'decorative', confirm: true } },
      { operation: 'reset-image-crop', target: imageTarget, value: { confirm: true } },
      { operation: 'align-selection', target, value: { alignment: 'left' } },
      { operation: 'distribute-selection', target: { ...target, elementIds: [...ids, 'component-other-text'] }, value: { distribution: 'horizontal-gaps' } },
    ];
    for (const operation of mutations) { assert.throws(() => api.executeOperation(operation), /鎖定/); assert.deepEqual(read(), before); }
    assert.throws(() => api.applyLocalPatch({ slideId: 'portable', region: 'content.components.perf-image', value: { fit: 'cover' } }), /鎖定/);
    assert.deepEqual(read(), before);
  });
}

test('Core2 portable group projection同步throw與重入，canonical/DOM/revision全回退', () => {
  const h = groupedUi(), before = h.getSpec(), revision = h.getRevision(), nodes = ids.map(id => nodeFor(h, id));
  const original = nodes[1].setAttribute.bind(nodes[1]), styles = nodes.map(n => n.getAttribute('style')); let fired = false, rejected = false;
  nodes[1].setAttribute = (key, value) => {
    if (!fired && key === 'data-pptskill-geometry') {
      fired = true;
      try { h.api.executeOperation(request('unlock-elements')); } catch { rejected = true; }
      throw new Error('injected group projection');
    }
    return original(key, value);
  };
  assert.throws(() => h.api.executeOperation(request('move-group', { x: 160, y: 160 })), /injected/);
  assert.equal(fired, true); assert.equal(rejected, true); assert.equal(h.getRevision(), revision);
  assert.deepEqual(h.getSpec(), before); assert.deepEqual(nodes.map(n => n.getAttribute('style')), styles);
});

test('Core2 portable未完成gesture或text dialog期間group metadata拒絕', () => {
  const h = groupedUi(), before = h.getSpec(); h.begin('dragGroup'); h.update(20, 20, 'dragGroup');
  assert.throws(() => h.api.executeOperation(request('lock-elements')), /尚未完成/); assert.deepEqual(h.getSpec(), before);
  h.api.layout.cancel(); h.action('ungroup-elements'); h.click(nodeFor(h, ids[0])); h.action('edit-selected-text');
  const pending = h.getSpec();
  assert.throws(() => h.api.executeOperation(request('lock-elements', {}, [ids[0]])), /尚未完成/); assert.deepEqual(h.getSpec(), pending);
});
