import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mountedEditor, fixture, geometry } from '../tools/edx-wp1-s4-perf-mounted.mjs';

// 重播 pinned vendor 的真 render/mount/updateRect 分支；DOM、矩陣與 hit test 為替身。
// 不用手寫「需要 updateRect」的假規則，也不宣稱這是 fresh browser PASS。
const metadata = JSON.parse(readFileSync(new URL('../runtime/vendor/moveable-vendor.json', import.meta.url)));
const input = metadata.inputs.find(entry => /croact-moveable\/dist\/moveable\.esm\.js$/.test(entry.path));
const source = readFileSync(new URL('../' + input.path, import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), input.sha256);
const context = {
  React: { createElement: (type, props, ...children) => ({ type, props, children }) },
  __assign: Object.assign, __read: value => value,
  ref: (owner, key) => value => { owner[key] = value; }, prefix: (...names) => names.join(' '),
  setStoreCache() {}, getMoveableTargetInfo: (_control, target) => ({ target }),
};
function pinnedMethod(name) {
  const start = source.indexOf('MoveableManager.prototype.' + name + ' = ');
  assert.ok(start >= 0, name);
  const expression = source.slice(start, source.indexOf('\n    };', start) + 7).split(' = ').slice(1).join(' = ').trim();
  return vm.runInNewContext('(' + expression.replace(/;$/, '') + ')', context);
}
const render = pinnedMethod('render'), mount = pinnedMethod('componentDidMount');
const updateRect = pinnedMethod('updateRect'), updateState = pinnedMethod('updateState');

class FirstHandleVendor {
  constructor(_overlay, options) {
    this.options = options; this.handlers = {}; this.destroyed = false; this.measurements = 0;
    const manager = this.manager = {
      props: options, state: { left: 0, top: 0, direction: 1, offsetDelta: [0, 0] },
      getState() { return this.state; }, getEnabledAbles: () => [], isDragging: () => false,
      _getAbleClassName: () => '', renderAbles: () => [], _renderLines: () => [],
      getContainer: () => options.container, _getRequestStyles: () => [],
      _checkUpdateRootContainer() {}, checkUpdate() {}, updateRenderPoses() {},
      _checkUpdateViewContainer() {}, _updateTargets() {}, _updateNativeEvents() {},
      _updateEvents() {}, updateCheckInput() {}, _updateObserver() {},
      updateState,
      setState: next => { this.pending = () => { Object.assign(manager.state, next); this.paint(); }; },
      forceUpdate: () => this.paint(),
      updateRect: (...args) => { this.measurements++; updateRect.apply(manager, args); },
    };
    this.paint();
    // croact renderSelf 在 constructor 返回前套用 ref 及 componentDidMount hooks。
    this.tree.props.ref({}); mount.call(manager);
  }
  paint() { this.tree = render.call(this.manager); }
  settle() { const pending = this.pending; this.pending = null; pending?.(); }
  on(name, handler) { this.handlers[name] = handler; }
  updateRect() { assert.equal(this.destroyed, false); this.manager.updateRect(); }
  stopDrag() {}
  destroy() { assert.equal(this.destroyed, false); this.destroyed = true; this.pending = null; }
  resize() {
    // hidden 控制點不會收到真 pointer；未啟動時不偽造 resizeStart。
    if (this.tree.props.style.visibility !== 'visible') return;
    this.handlers.resizeStart({ inputEvent: { clientX: 100, clientY: 100 }, setFixedDirection() {}, stop() { assert.fail('resizeStart 被拒絕'); } });
    this.handlers.resize({ inputEvent: { clientX: 108, clientY: 108 }, width: 645, height: 485 });
    this.handlers.resizeEnd();
  }
}

test('S7 首次 snap SE handle：pinned mount/render 重播，尚未 drag 即提交645×485', () => {
  const spec = fixture(0), base = { x: 803, y: 283, width: 637, height: 477 };
  spec.slides[0].composition.geometryOverrides['portable-quote'] = base;
  const h = mountedEditor(spec); let vendor;
  h.window.PPTSKILLMoveable.default = class extends FirstHandleVendor {
    constructor(...args) { super(...args); vendor = this; }
  };
  h.ready(); vendor.settle();
  assert.equal(vendor.tree.props.style.visibility, 'visible', '無 explicit container 沿 vendor 原有 mount 路徑');
  h.action('snap-layout'); vendor.settle();
  assert.equal(vendor.options.dragTarget, h.component());
  vendor.resize();
  assert.deepEqual(geometry(h.getSpec()), { ...base, width: 645, height: 485 });
  assert.equal(vendor.tree.props.style.visibility, 'visible');
  // 重新選取也是新的短生命 vendor，不能靠上一輪 dragEnd 的 updateRect 解鎖。
  const previous = vendor; h.click(h.component()); vendor.settle();
  assert.equal(previous.destroyed, true); assert.notEqual(vendor, previous);
  assert.equal(vendor.tree.props.style.visibility, 'visible');
  h.api.layout.destroy(); h.api.layout.destroy();
});
