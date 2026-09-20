import { COMPONENT_GEOMETRY, getComponentGeometry } from './component-geometry.js';

// 只保存未提交的 gesture；geometry authority 仍為 executeOperation 的 DeckSpec。
export function createComponentInteraction({ readTarget, executeOperation, preview, restore, notify = () => {} }) {
  let enabled = false, target = null, gesture = null, selectedToken = null;
  const cancel = () => { gesture = null; restore(); };
  const select = next => {
    cancel();
    const current = enabled && next && readTarget(next);
    target = current ? { ...next } : null;
    selectedToken = current?.token ?? null;
  };
  const setMode = on => { cancel(); enabled = Boolean(on); target = null; selectedToken = null; };
  const initialize = () => {
    const current = target && readTarget(target);
    if (!enabled || !current || current.rect) return false;
    const { x, y } = COMPONENT_GEOMETRY.defaultBox;
    executeOperation({ operation: 'move-element', target: { ...target }, value: { x, y } });
    restore();
    return true;
  };
  const fresh = g => {
    const current = readTarget(g.target);
    return current && current.token === g.token && current.revision === g.revision;
  };
  return {
    setMode, select, initialize, cancel,
    getState: () => ({ enabled, target: target && { ...target }, gesturing: Boolean(gesture) }),
    // 回傳是否已處理按鍵；越界拒絕與gesture互斥亦須阻止外層翻頁。
    nudge(key, shift = false) {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
      if (!enabled || !target || !Array.isArray(delta)) return false;
      const current = readTarget(target);
      if (!current?.rect || current.token !== selectedToken) return false;
      if (gesture) return true;
      const step = shift ? 10 : 1;
      try {
        executeOperation({ operation: 'move-element', target: { ...target },
          value: { x: current.rect.x + delta[0] * step, y: current.rect.y + delta[1] * step } });
        notify('手動版面已更新');
      } catch (error) { notify('未套用：' + error.message); }
      finally { restore(); }
      return true;
    },
    begin(kind, point, scale) {
      cancel();
      const current = target && readTarget(target);
      if (!enabled || !current?.rect || !['drag', 'resize'].includes(kind) || !Number.isFinite(scale) || scale <= 0
        || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
      gesture = { kind, target: { ...target }, token: current.token, revision: current.revision,
        base: { ...current.rect }, next: { ...current.rect }, point: { ...point }, scale };
      return true;
    },
    update(point) {
      const g = gesture;
      if (!g) return false;
      if (!fresh(g)) { cancel(); notify('元件已變更，已取消拖曳'); return false; }
      const dx = (point.x - g.point.x) / g.scale, dy = (point.y - g.point.y) / g.scale;
      g.next = g.kind === 'drag' ? { ...g.base, x: Math.round(g.base.x + dx), y: Math.round(g.base.y + dy) }
        : { ...g.base, width: Math.round(g.base.width + dx), height: Math.round(g.base.height + dy) };
      if (Object.values(g.next).every(Number.isFinite)) preview(g.target, g.next);
      return true;
    },
    finish() {
      const g = gesture;
      gesture = null;
      if (!g) return false;
      try {
        if (!enabled || !fresh(g)) { notify('元件已變更，已取消拖曳'); return false; }
        const fields = g.kind === 'drag' ? ['x', 'y'] : ['width', 'height'];
        if (fields.every(key => g.next[key] === g.base[key])) return false;
        executeOperation({ operation: g.kind === 'drag' ? 'move-element' : 'resize-element', target: g.target,
          value: Object.fromEntries(fields.map(key => [key, g.next[key]])) });
        notify('手動版面已更新');
        return true;
      } catch (error) { notify('未套用：' + error.message); return false; }
      finally { restore(); }
    },
  };
}

export const buildComponentInteractionRuntime = () => createComponentInteraction.toString();

// css-styled@1.0.8 以 control 的 data-styled-id 精確對應注入 style；不能寬刪其他樣式。
export function cleanupComponentInteractionClone(root) {
  const ids = new Set([...root.querySelectorAll('.moveable-control-box[data-styled-id]')].map(node => node.getAttribute('data-styled-id')));
  for (const node of root.querySelectorAll('style[data-styled-id]')) {
    if (ids.has(node.getAttribute('data-styled-id'))) node.remove();
  }
  root.querySelectorAll('[data-editor-selected]').forEach(node => node.removeAttribute('data-editor-selected'));
  const mode = root.querySelector('[data-action="layout"]');
  if (mode) { mode.textContent = '編輯版面'; mode.setAttribute('aria-pressed', 'false'); }
  const initialize = root.querySelector('[data-action="initialize-layout"]');
  if (initialize) initialize.hidden = true;
}

// DOM 與 vendor 只負責呈現；pointer 座標來自 Moveable 原始 input event。
export function mountComponentInteraction({ document, window, getSpec, getRevision, resolveIdentities, executeOperation,
  project, notify, setTextMode, selectSlide }) {
  let moveable = null, overlay = null, observer = null, composing = false;
  const button = document.querySelector('[data-action="layout"]');
  const initializeButton = document.querySelector('[data-action="initialize-layout"]');
  if (!button || !initializeButton) return null;
  const resolve = target => {
    const spec = getSpec(), slide = spec.slides.find(s => s.id === target.slideId);
    if (!slide) return null;
    const index = resolveIdentities(slide).components.indexOf(target.elementId);
    if (index < 0) return null;
    const slideNode = document.querySelector('.slide[data-slide-id="' + CSS.escape(target.slideId) + '"]');
    const node = slideNode?.querySelector('[data-pptskill-element-id="' + CSS.escape(target.elementId) + '"]');
    if (!node?.isConnected) return null;
    return { node, slideNode, token: node, revision: getRevision(), rect: getComponentGeometry(slide.composition, slide.content.components[index].id) };
  };
  const restore = () => { project(); };
  const interaction = createComponentInteraction({ readTarget: resolve, executeOperation, restore, notify,
    preview(target, rect) {
      const current = resolve(target);
      if (!current) return;
      // 預览允許超界，release 才由既有 validator 拒絕；不 secret clamp。
      for (const key of ['x', 'y', 'width', 'height']) current.node.style[key === 'x' ? 'left' : key === 'y' ? 'top' : key] = rect[key] + 'px';
    },
  });
  const destroyVendor = () => {
    if (moveable) { moveable.destroy(); moveable = null; }
    overlay?.remove(); overlay = null;
    observer?.disconnect(); observer = null;
  };
  const clearSelection = () => {
    interaction.select(null); destroyVendor();
    document.querySelectorAll('.slide [data-editor-selected]').forEach(node => node.removeAttribute('data-editor-selected'));
    initializeButton.hidden = true;
  };
  const cancel = () => { interaction.cancel(); moveable?.stopDrag(); moveable?.updateRect(); };
  const point = event => ({ x: event.inputEvent?.clientX ?? event.clientX, y: event.inputEvent?.clientY ?? event.clientY });
  const bindVendor = () => {
    destroyVendor();
    const target = interaction.getState().target, current = target && resolve(target);
    if (!current?.rect) return;
    const Moveable = window.PPTSKILLMoveable?.default;
    if (!Moveable) { notify('版面編輯器未載入'); return; }
    overlay = document.createElement('div'); overlay.setAttribute('data-pptskill-editor-chrome', 'layout');
    document.body.append(overlay);
    moveable = new Moveable(overlay, { target: current.node, draggable: true, resizable: true,
      renderDirections: ['se'], origin: false, rotatable: false, scalable: false, snappable: false,
      hideDefaultLines: false, throttleDrag: 0, throttleResize: 0, checkInput: true,
      preventClickEventOnDrag: true });
    for (const [eventName, kind] of [['drag', 'drag'], ['resize', 'resize']]) {
      moveable.on(eventName + 'Start', event => {
        const live = resolve(target);
        const scale = live?.slideNode.getBoundingClientRect().width / COMPONENT_GEOMETRY.slideWidth;
        if (!interaction.begin(kind, point(event), scale)) { event.stop(); return; }
        if (kind === 'drag') event.set([0, 0]);
      });
      moveable.on(eventName, event => { interaction.update(point(event)); });
      moveable.on(eventName + 'End', () => { interaction.finish(); moveable?.updateRect(); });
    }
    observer = new MutationObserver(() => {
      if (resolve(target)?.node !== current.node) { clearSelection(); notify('元件已移除，已取消選取'); }
    });
    observer.observe(document.querySelector('.deck'), { childList: true, subtree: true });
  };
  const select = target => {
    clearSelection(); interaction.select(target);
    const selected = interaction.getState().target, current = selected && resolve(selected);
    if (!current) return;
    current.node.setAttribute('data-editor-selected', 'true');
    selectSlide(target.slideId);
    initializeButton.hidden = Boolean(current.rect);
    notify(current.rect ? '拖曳或方向鍵微調；Shift＋方向鍵移動10px，右下角調整大小' : '此元件尚未設定手動版面；套用後將使用預設位置與尺寸');
    bindVendor();
  };
  const setMode = on => {
    composing = false; clearSelection(); interaction.setMode(on);
    if (on) setTextMode(false);
    document.body.dataset.editorMode = on ? 'layout' : 'play';
    button.textContent = on ? '完成版面' : '編輯版面'; button.setAttribute('aria-pressed', String(Boolean(on)));
    notify(on ? '點選單一元件以編輯版面' : '可直接播放');
  };
  const click = event => {
    const action = event.target.closest?.('[data-action]')?.dataset.action;
    if (action === 'layout') { setMode(!interaction.getState().enabled); return; }
    if (action === 'initialize-layout') {
      try { if (interaction.initialize()) { initializeButton.hidden = true; bindVendor(); notify('已套用預設手動位置與尺寸'); } }
      catch (error) { notify(error.message); }
      return;
    }
    if (!interaction.getState().enabled || event.target.closest?.('.pptskill-editor,[data-pptskill-editor-chrome]')) return;
    const element = event.target.closest?.('[data-pptskill-element-id]'), slide = element?.closest('.slide');
    if (slide && element) {
      const target = { slideId: slide.dataset.slideId, elementId: element.dataset.pptskillElementId };
      if (resolve(target)) { event.preventDefault(); select(target); return; }
    }
    clearSelection();
  };
  const inputOwnsKey = node => {
    if (node?.closest?.('input,textarea,select,[role="textbox"],.pptskill-editor,[data-pptskill-editor-chrome]')) return true;
    const editable = node?.closest?.('[contenteditable]');
    return Boolean(node?.isContentEditable || (editable && editable.getAttribute('contenteditable') !== 'false'));
  };
  const compositionStart = () => { composing = true; };
  const compositionEnd = () => { composing = false; };
  const keydown = event => {
    if (interaction.getState().enabled && event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); cancel(); clearSelection(); return;
    }
    if (composing || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey
      || inputOwnsKey(event.target) || inputOwnsKey(document.activeElement)) return;
    if (interaction.nudge(event.key, event.shiftKey)) {
      event.preventDefault(); event.stopImmediatePropagation(); moveable?.updateRect();
    }
  };
  const pointerCancel = () => { if (interaction.getState().enabled) cancel(); };
  const viewportChanged = () => { if (interaction.getState().enabled) cancel(); };
  document.addEventListener('click', click);
  document.addEventListener('keydown', keydown, true);
  document.addEventListener('compositionstart', compositionStart, true);
  document.addEventListener('compositionend', compositionEnd, true);
  document.addEventListener('pointercancel', pointerCancel, true);
  const blur = () => { composing = false; pointerCancel(); };
  window.addEventListener('blur', blur);
  window.addEventListener('resize', viewportChanged);
  window.addEventListener('scroll', viewportChanged, true);
  return { setMode, clearSelection, cancel, getState: interaction.getState,
    destroy() {
      setMode(false);
      document.removeEventListener('click', click); document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('compositionstart', compositionStart, true);
      document.removeEventListener('compositionend', compositionEnd, true);
      document.removeEventListener('pointercancel', pointerCancel, true);
      window.removeEventListener('blur', blur); window.removeEventListener('resize', viewportChanged);
      window.removeEventListener('scroll', viewportChanged, true);
    },
  };
}

export const buildComponentInteractionMount = () => mountComponentInteraction.toString();
