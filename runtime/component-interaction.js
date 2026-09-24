import { COMPONENT_GEOMETRY, getComponentGeometry } from './component-geometry.js';
import { createMultiSelectionState } from './multi-selection.js';

// 只保存未提交的 gesture；geometry authority 仍為 executeOperation 的 DeckSpec。
export function createComponentInteraction({ readTarget, executeOperation, preview, restore, notify = () => {}, onCancel = () => {}, beforeFinish = () => {}, capturePreview = () => [], transactFinish = work => work() }) {
  let enabled = false, target = null, gesture = null, selectedToken = null, finishing = false;
  const cancel = () => { const active = Boolean(gesture); gesture = null; if (active) onCancel(); restore(); };
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
    return current && current.token === g.token && current.revision === g.revision && (!g.tokens || current.tokens?.every((token, i) => token === g.tokens[i]));
  };
  return {
    setMode, select, initialize, cancel,
    getState: () => ({ enabled, target: target && { ...target, ...(target.elementIds ? { elementIds: [...target.elementIds] } : {}) }, gesturing: Boolean(gesture), finishing }),
    // 回傳是否已處理按鍵；越界拒絕與gesture互斥亦須阻止外層翻頁。
    nudge(key, shift = false) {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
      if (!enabled || !target || !Array.isArray(delta)) return false;
      const current = readTarget(target);
      if (!current?.rect || current.token !== selectedToken) return false;
      if (gesture) return true;
      const step = shift ? 10 : 1;
      try {
        executeOperation({ operation: target.elementIds ? 'move-group' : 'move-element', target: { ...target },
          value: { x: current.rect.x + delta[0] * step, y: current.rect.y + delta[1] * step } });
        notify('手動版面已更新');
      } catch (error) { notify('未套用：' + error.message); }
      finally { restore(); }
      return true;
    },
    begin(kind, point, scale) {
      if (finishing) return false;
      cancel();
      const current = target && readTarget(target);
      if (!enabled || !current?.rect || !['drag', 'resize'].includes(kind) || !Number.isFinite(scale) || scale <= 0
        || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
      gesture = { kind, target: { ...target }, token: current.token, tokens: current.tokens, revision: current.revision,
        checkpoint: capturePreview(target), base: { ...current.rect }, next: { ...current.rect }, point: { ...point }, scale };
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
      if (!g || finishing) return false;
      gesture = null;
      finishing = true;
      try {
        return transactFinish(() => {
          beforeFinish();
          if (!enabled || !fresh(g)) { onCancel(); restore(); notify('元件已變更，已取消拖曳'); return false; }
          const fields = g.kind === 'drag' ? ['x', 'y'] : ['width', 'height'];
          if (fields.every(key => g.next[key] === g.base[key])) { restore(); return false; }
          notify('手動版面已更新');
          restore();
          executeOperation({ operation: g.target.elementIds ? (g.kind === 'drag' ? 'move-group' : 'resize-group') : (g.kind === 'drag' ? 'move-element' : 'resize-element'), target: g.target,
            value: Object.fromEntries(fields.map(key => [key, g.next[key]])) }, () => { restore(); beforeFinish(); });
          return true;
        }, g.checkpoint);
      } catch (error) {
        if (/rollback failed/.test(error.message) || error.componentProjection) throw error;
        return false;
      } finally { finishing = false; }
    },
  };
}

export const buildComponentInteractionRuntime = () => createComponentInteraction.toString();

// Moveable 用 data-styled-id，Selecto 用同名 class；只清除可對應 editor control 的樣式。
export function cleanupComponentInteractionClone(root) {
  const controls = [...root.querySelectorAll('.moveable-control-box,.selecto-selection')];
  const ids = new Set(controls.map(node => node.getAttribute('data-styled-id')).filter(Boolean));
  for (const node of root.querySelectorAll('style[data-styled-id]')) {
    const id = node.getAttribute('data-styled-id');
    if (ids.has(id) || (id && controls.some(control => (control.getAttribute('class') || '').split(/\s+/).includes(id)))) node.remove();
  }
  root.querySelectorAll('[data-editor-selected]').forEach(node => node.removeAttribute('data-editor-selected'));
  const mode = root.querySelector('[data-action="layout"]');
  if (mode) { mode.textContent = '編輯版面'; mode.setAttribute('aria-pressed', 'false'); }
  const initialize = root.querySelector('[data-action="initialize-layout"]');
  if (initialize) initialize.hidden = true;
  root.querySelector('[data-action="snap-layout"]')?.setAttribute('aria-pressed', 'false');
}

// DOM 與 vendor 只負責呈現；關閉吸附沿用原始 pointer，開啟時橋接 vendor canonical 候選。
export function mountComponentInteraction({ document, window, getSpec, getRevision, resolveIdentities, executeOperation,
  project, notify, setTextMode, selectSlide, groupLock = null, onSelectionChange = () => {}, onGestureChange = () => {}, runMutation = work => work(), mutate = work => work(), mutationBlocked = () => false, previewEvent = handler => handler }) {
  let moveable = null, selecto = null, overlay = null, observer = null, composing = false, snap = false, geometryTarget = null;
  let suppressPointerClick = false;
  let routedControlClick = null;
  const button = document.querySelector('[data-action="layout"]');
  const initializeButton = document.querySelector('[data-action="initialize-layout"]');
  const snapButton = document.querySelector('[data-action="snap-layout"]');
  const alignToolbar = document.querySelector('[data-pptskill-context-toolbar]');
  const distributeButtons = [...document.querySelectorAll('[data-distribute-control]')];
  if (!button || !initializeButton) return null;
  const groupToolbar = document.querySelector('[data-pptskill-group-toolbar]');
  const groupControls = [...document.querySelectorAll('[data-group-control]')];
  const resolve = target => {
    if (target.elementIds) {
      const slide = getSpec().slides.find(s => s.id === target.slideId);
      const group = slide && groupLock?.groupFor(slide, target.elementIds[0]);
      if (!group || group.length !== target.elementIds.length || !group.every(id => target.elementIds.includes(id))
        || group.some(id => groupLock.isLocked(slide, id))) return null;
      const members = group.map(elementId => resolve({ slideId: target.slideId, elementId }));
      if (members.some(item => !item?.rect)) return null;
      return { ...members[0], nodes: members.map(item => item.node), tokens: members.map(item => item.node),
        rect: groupLock.bounds(slide, target.elementIds) };
    }
    const spec = getSpec(), slide = spec.slides.find(s => s.id === target.slideId);
    if (!slide || groupLock?.isLocked(slide, target.elementId)) return null;
    const index = resolveIdentities(slide).components.indexOf(target.elementId);
    if (index < 0) return null;
    const slideNode = document.querySelector('.slide[data-slide-id="' + CSS.escape(target.slideId) + '"]');
    const node = slideNode?.querySelector('[data-pptskill-element-id="' + CSS.escape(target.elementId) + '"]');
    if (!node?.isConnected) return null;
    return { node, slideNode, token: node, revision: getRevision(), rect: getComponentGeometry(slide.composition, slide.content.components[index].id) };
  };
  const projectBox = (node, rect) => {
    for (const key of ['x', 'y', 'width', 'height']) node.style[key === 'x' ? 'left' : key === 'y' ? 'top' : key] = rect[key] + 'px';
  };
  const restore = () => {
    project();
    const target = interaction.getState().target, rect = geometryTarget && target && resolve(target)?.rect;
    if (rect) projectBox(geometryTarget, rect);
  };
  const finishView = () => { if (snap) clearSelection(); else moveable?.updateRect(); };
  const interaction = createComponentInteraction({ readTarget: resolve, executeOperation, restore, notify,
    beforeFinish: () => { try { moveable?.updateRect(); } catch (error) { error.componentProjection = true; throw error; } onGestureChange(); },
    capturePreview(target) {
      const current = resolve(target);
      return { revision: getRevision(), nodes: [...new Set([...(current?.nodes || [current?.node]), geometryTarget].filter(Boolean))]
        .map(node => [node, ['style', 'data-pptskill-geometry'].map(key => [key, node.getAttribute(key)])]),
        controls: ['undo', 'redo'].map(direction => { const button = document.querySelector('[data-action="' + direction + '"]'); return button && [button, button.disabled, button.title]; }) };
    },
    transactFinish: (work, checkpoint) => runMutation(() => { const committed = work(); if (!committed) finishView(); return committed; }, checkpoint, error => { suppressPointerClick = true; finishView(); notify('未套用：' + error.message); }),
    onCancel: () => { suppressPointerClick = true; onGestureChange(); },
    preview(target, rect) {
      const current = resolve(target);
      if (!current) return;
      // 預览允許超界，release 才由既有 validator 拒絕；不 secret clamp。
      if (target.elementIds) {
        const slide = getSpec().slides.find(s => s.id === target.slideId);
        try {
          const next = groupLock.transform(slide, target.elementIds, 'resize-group', { width: rect.width, height: rect.height });
          const base = groupLock.bounds(slide, target.elementIds);
          for (const node of current.nodes) {
            const component = groupLock.component(slide, node.dataset.pptskillElementId), box = next[component.id];
            projectBox(node, { ...box, x: box.x + rect.x - base.x, y: box.y + rect.y - base.y });
          }
        } catch { project(); }
      } else projectBox(current.node, rect);
      if (geometryTarget) projectBox(geometryTarget, rect);
    },
  });
  const currentSlideNode = () => document.querySelector('.slide[data-editor-selected="true"]');
  const eligibleNodes = () => {
    const slideNode = currentSlideNode();
    if (!slideNode) return [];
    return [...slideNode.querySelectorAll('[data-pptskill-element-id]')].filter(node => {
      const target = { slideId: slideNode.dataset.slideId, elementId: node.dataset.pptskillElementId };
      const slide = getSpec().slides.find(s => s.id === target.slideId);
      return Boolean(slide && resolveIdentities(slide).components.includes(target.elementId) && node.isConnected);
    });
  };
  const eligibleIds = () => eligibleNodes().map(node => node.dataset.pptskillElementId);
  const destroyVendor = () => {
    if (moveable) { moveable.destroy(); moveable = null; }
    geometryTarget?.remove(); geometryTarget = null;
    overlay?.remove(); overlay = null;
    observer?.disconnect(); observer = null;
  };
  const clearSelectionView = () => {
    interaction.select(null); destroyVendor();
    document.querySelectorAll('.slide [data-editor-selected]').forEach(node => node.removeAttribute('data-editor-selected'));
    selecto?.setSelectedTargets?.([]);
    initializeButton.hidden = true;
    if (alignToolbar) alignToolbar.hidden = true;
    if (groupToolbar) groupToolbar.hidden = true;
    if (snapButton) { snapButton.disabled = false; snapButton.title = ''; }
    distributeButtons.forEach(control => { control.hidden = true; });
  };
  let selection;
  const applySelection = ids => {
    clearSelectionView();
    onSelectionChange('refresh');
    const slideNode = currentSlideNode();
    if (!slideNode || !ids.length) { selecto?.setSelectedTargets?.([]); return; }
    const selectedNodes = ids.map(id => slideNode.querySelector('[data-pptskill-element-id="' + CSS.escape(id) + '"]')).filter(Boolean);
    selectedNodes.forEach(node => node.setAttribute('data-editor-selected', 'true'));
    selecto?.setSelectedTargets?.(selectedNodes);
    const slide = getSpec().slides.find(s => s.id === slideNode.dataset.slideId);
    const group = groupLock?.groupFor(slide, ids[0]);
    const exactGroup = group && group.length === ids.length && group.every(id => ids.includes(id));
    const grouped = ids.some(id => groupLock?.groupFor(slide, id)), locked = ids.some(id => groupLock?.isLocked(slide, id));
    if (groupToolbar) groupToolbar.hidden = !groupLock;
    for (const control of groupControls) {
      const action = control.dataset.action;
      control.disabled = action === 'group-elements' ? ids.length < 2 || grouped || locked
        : action === 'ungroup-elements' ? !exactGroup || locked
        : action === 'lock-elements' ? ids.every(id => groupLock?.isLocked(slide, id)) : !locked;
    }
    if (alignToolbar) alignToolbar.hidden = ids.length <= 1 || grouped || locked;
    distributeButtons.forEach(control => { control.hidden = ids.length < 3 || grouped || locked; });
    if (snapButton && exactGroup) { snapButton.disabled = true; snapButton.title = '群組使用原始拖曳；8px吸附僅限單一元件'; }
    if (locked) { notify('已鎖定；選取後可解鎖'); return; }
    if (ids.length > 1 && !exactGroup) { notify('已選取 ' + ids.length + ' 個元件'); return; }
    const target = exactGroup ? { slideId: slideNode.dataset.slideId, elementIds: [...ids] }
      : { slideId: slideNode.dataset.slideId, elementId: ids[0] };
    interaction.select(target);
    const current = resolve(target);
    if (!current) return;
    const active = document.activeElement;
    if (active?.closest?.('.pptskill-editor,[data-pptskill-editor-chrome]')) active.blur?.();
    initializeButton.hidden = Boolean(current.rect);
    notify(exactGroup ? '群組拖曳或方向鍵微調；右下角調整大小（不吸附）' : current.rect ? '拖曳或方向鍵微調；Shift＋方向鍵移動10px，右下角調整大小' : '此元件尚未設定手動版面；套用後將使用預設位置與尺寸');
    bindVendor();
  };
  selection = createMultiSelectionState({ listTargets: eligibleIds, onChange: applySelection });
  const clearSelection = (reason = 'clear') => { if (!selection.clear()) clearSelectionView(); onSelectionChange(reason); };
  const restoreSelection = saved => { if (selection.replace(saved.selected)) return; applySelection(saved.selected); };
  const mutateSelection = (ids, mode) => {
    onSelectionChange('selection');
    interaction.cancel(); moveable?.stopDrag();
    const slide = getSpec().slides.find(s => s.id === currentSlideNode()?.dataset.slideId);
    const expanded = slide && groupLock ? groupLock.expand(slide, ids) : ids;
    return mode === 'toggle' ? selection.toggle(expanded) : selection.replace(expanded);
  };
  const destroySelecto = () => { if (selecto) { selecto.destroy(); selecto = null; } };
  const bindSelecto = () => {
    destroySelecto();
    if (!interaction.getState().enabled) return;
    const Selecto = window.PPTSKILLSelecto?.default;
    const deck = document.querySelector('.deck');
    if (!Selecto || !deck) { notify('多選編輯器未載入'); return; }
    selecto = new Selecto({
      container: document.body,
      dragContainer: deck,
      selectableTargets: [eligibleNodes],
      selectByClick: false,
      selectFromInside: false,
      continueSelect: false,
      hitRate: 0,
      checkInput: true,
      preventDefault: false,
      preventClickEventOnDrag: true,
      dragCondition: event => {
        const node = event.inputEvent?.target, slideNode = currentSlideNode();
        return Boolean(node && slideNode && node.closest?.('.slide') === slideNode
          && !node.closest?.('[data-pptskill-element-id],.pptskill-editor,[data-pptskill-editor-chrome],.moveable-control-box,input,textarea,select,[contenteditable],[role="textbox"]'));
      },
    });
    selecto.on('selectEnd', previewEvent(event => {
      const ids = [...new Set((event.selected || []).map(node => node.dataset?.pptskillElementId).filter(Boolean))];
      mutateSelection(ids, event.inputEvent?.shiftKey ? 'toggle' : 'replace');
    }));
    selecto.setSelectedTargets(eligibleNodes().filter(node => selection.getState().selected.includes(node.dataset.pptskillElementId)));
  };
  const cancel = (reason = 'clear') => {
    interaction.cancel(); moveable?.stopDrag();
    if (snap && reason !== 'picker' && reason !== 'image-fit') clearSelection(reason);
    else moveable?.updateRect();
  };
  const point = event => ({ x: event.inputEvent?.clientX ?? event.clientX, y: event.inputEvent?.clientY ?? event.clientY });
  const bindVendor = () => {
    destroyVendor();
    const target = interaction.getState().target, current = target && resolve(target);
    if (!current?.rect) return;
    const isGroup = Boolean(target.elementIds), useSnap = snap && !isGroup;
    const Moveable = window.PPTSKILLMoveable?.default;
    if (!Moveable) { notify('版面編輯器未載入'); return; }
    overlay = document.createElement('div'); overlay.setAttribute('data-pptskill-editor-chrome', 'layout');
    (useSnap ? current.slideNode : document.body).append(overlay);
    if (useSnap) {
      geometryTarget = document.createElement('div');
      geometryTarget.setAttribute('data-pptskill-editor-chrome', 'geometry-target');
      Object.assign(geometryTarget.style, { position: 'absolute', boxSizing: 'border-box', pointerEvents: 'none' });
      projectBox(geometryTarget, current.rect); current.slideNode.append(geometryTarget);
    }
    moveable = new Moveable(overlay, { target: isGroup ? current.nodes : geometryTarget || current.node, draggable: true, resizable: true,
      ...(useSnap ? { dragTarget: current.node, container: current.slideNode, rootContainer: document.body,
        snapContainer: current.slideNode, snapGridWidth: 8, snapGridHeight: 8,
        snapDirections: { left: true, top: true, right: false, bottom: false, center: false, middle: false } } : {}),
      renderDirections: ['se'], origin: false, rotatable: false, scalable: false, snappable: useSnap,
      hideDefaultLines: false, ...(isGroup ? { hideChildMoveableDefaultLines: true } : {}), throttleDrag: 0, throttleResize: 0, checkInput: true,
      preventClickEventOnDrag: true });
    const vendor = moveable;
    for (const [eventName, kind] of [['drag', 'drag'], ['resize', 'resize']]) {
      const vendorEvent = eventName + (isGroup ? 'Group' : '');
      let origin, base, scale;
      moveable.on(vendorEvent + 'Start', previewEvent(event => {
        if (moveable !== vendor) { event.stop(); return; }
        const live = resolve(target);
        scale = live?.slideNode.getBoundingClientRect().width / COMPONENT_GEOMETRY.slideWidth;
        origin = point(event); base = live?.rect;
        if (useSnap) {
          moveable.snapDirections = { left: kind === 'drag', top: kind === 'drag', right: kind === 'resize', bottom: kind === 'resize', center: false, middle: false };
          if (kind === 'resize') event.setFixedDirection([-1, -1]);
        }
        if (!interaction.begin(kind, point(event), scale)) { event.stop(); return; }
        onGestureChange();
        if (kind === 'drag') { event.set?.([0, 0]); event.events?.forEach(child => child.set?.([0, 0])); }
        if (isGroup && kind === 'resize') event.setFixedDirection?.([-1, -1]);
      }));
      moveable.on(vendorEvent, previewEvent(event => {
        if (moveable !== vendor || !interaction.getState().gesturing) return;
        let next = point(event);
        if (useSnap && Number.isFinite(next.x) && Number.isFinite(next.y) && !(next.x === origin.x && next.y === origin.y)) {
          // vendor 已換算父層矩陣；轉成既有 controller 的輸入單位，不能再除 scale。
          const dx = kind === 'drag' ? event.left - base.x : event.width - base.width;
          const dy = kind === 'drag' ? event.top - base.y : event.height - base.height;
          next = { x: origin.x + dx * scale, y: origin.y + dy * scale };
        }
        // 返回起點必須送回 base，不能略過而留下上一個 preview。
        if (!interaction.update(next) && useSnap) clearSelection();
      }));
      moveable.on(vendorEvent + 'End', event => {
        if (mutationBlocked() || moveable !== vendor || !interaction.getState().gesturing) return;
        if (isGroup && kind === 'resize') previewEvent(event => {
          if (Number.isFinite(event?.inputEvent?.clientX) && Number.isFinite(event.inputEvent.clientY)) interaction.update(point(event));
        })(event);
        return interaction.finish();
      });
    }
    observer = new MutationObserver(previewEvent(() => {
      if (resolve(target)?.node !== current.node || current.nodes?.some(node => !node.isConnected)) { clearSelection(); notify('元件已移除，已取消選取'); }
    }));
    observer.observe(document.querySelector('.deck'), { childList: true, subtree: true });
    // explicit container 會略過 vendor mount 的第二次 render；ref 已掛載後量測，才會顯示首次 SE handle。
    if (useSnap) vendor.updateRect();
  };
  const select = (target, toggle = false) => {
    onSelectionChange('selection');
    const currentSlideId = currentSlideNode()?.dataset.slideId;
    if (currentSlideId !== target.slideId) { clearSelection(); selectSlide(target.slideId); toggle = false; }
    const selected = selection.getState().selected;
    if (!toggle && selected.length === 1 && selected[0] === target.elementId) {
      // 單選再次點擊仍須重建短生命 Moveable，維持既有 S5/S7 選取與焦點契約。
      applySelection(selected);
      return;
    }
    mutateSelection([target.elementId], toggle ? 'toggle' : 'replace');
  };
  const setMode = on => {
    composing = false; clearSelection(); interaction.setMode(on); selection.setMode(on);
    if (on) setTextMode(false);
    document.body.dataset.editorMode = on ? 'layout' : 'play';
    button.textContent = on ? '完成版面' : '編輯版面'; button.setAttribute('aria-pressed', String(Boolean(on)));
    if (on) bindSelecto(); else destroySelecto();
    onSelectionChange('mode');
    notify(on ? '點選元件或拖曳空白區框選多個元件' : '可直接播放');
  };
  const alignSelection = alignment => {
    const selected = selection.getState().selected, slideNode = currentSlideNode();
    if (!interaction.getState().enabled || !slideNode || selected.length < 2) {
      notify('至少選取 2 個元件才能對齊');
      return false;
    }
    interaction.cancel(); moveable?.stopDrag();
    try {
      executeOperation({ operation: 'align-selection',
        target: { slideId: slideNode.dataset.slideId, elementIds: [...selected] }, value: { alignment } });
      applySelection(selected);
      notify('已對齊 ' + selected.length + ' 個元件');
      return true;
    } catch (error) {
      applySelection(selected);
      notify('未套用：' + error.message);
      return false;
    }
  };
  const distributeSelection = distribution => {
    const selected = selection.getState().selected, slideNode = currentSlideNode();
    if (!interaction.getState().enabled || !slideNode || selected.length < 3) {
      notify('至少選取 3 個元件才能均分');
      return false;
    }
    interaction.cancel(); moveable?.stopDrag();
    try {
      executeOperation({ operation: 'distribute-selection',
        target: { slideId: slideNode.dataset.slideId, elementIds: [...selected] }, value: { distribution } });
      applySelection(selected);
      notify('已均分 ' + selected.length + ' 個元件');
      return true;
    } catch (error) {
      applySelection(selected);
      notify('未套用：' + error.message);
      return false;
    }
  };
  const click = event => {
    const routed = routedControlClick === event; routedControlClick = null;
    // vendor stop/destroy 會移除 click 防護；只消耗本次取消的 pointer 尾隨事件。
    if (suppressPointerClick && !routed && event.isTrusted && event.detail > 0) {
      suppressPointerClick = false; event.preventDefault(); return;
    }
    const action = event.target.closest?.('[data-action]')?.dataset.action;
    if (action === 'insert-image' || action === 'replace-selected-image' || action === 'set-selected-image-fit') return;
    if (action === 'layout') { setMode(!interaction.getState().enabled); return; }
    if (action?.startsWith('align-')) { alignSelection(action.slice('align-'.length)); return; }
    if (action?.startsWith('distribute-')) { distributeSelection(action.slice('distribute-'.length)); return; }
    if (['group-elements', 'ungroup-elements', 'lock-elements', 'unlock-elements'].includes(action)) {
      const selected = selection.getState().selected, slideNode = currentSlideNode();
      if (!interaction.getState().enabled || !slideNode || !selected.length) return;
      interaction.cancel(); moveable?.stopDrag();
      try {
        executeOperation({ operation: action, target: { slideId: slideNode.dataset.slideId, elementIds: [...selected] }, value: {} });
        applySelection(selection.getState().selected);
        notify(({ 'group-elements': '已群組', 'ungroup-elements': '已解組', 'lock-elements': '已鎖定', 'unlock-elements': '已解鎖' })[action]);
      } catch (error) { notify('未套用：' + error.message); }
      return;
    }
    if (action === 'snap-layout') {
      if (interaction.getState().target?.elementIds) return;
      if (!interaction.getState().enabled) return;
      interaction.cancel(); moveable?.stopDrag(); destroyVendor();
      snap = !snap; snapButton?.setAttribute('aria-pressed', String(snap)); bindVendor();
      return;
    }
    if (action === 'initialize-layout') {
      try { if (interaction.initialize()) { initializeButton.hidden = true; bindVendor(); notify('已套用預設手動位置與尺寸'); } }
      catch (error) { notify(error.message); }
      return;
    }
    if (!interaction.getState().enabled || event.target.closest?.('.pptskill-editor,[data-pptskill-editor-chrome]')) return;
    const element = event.target.closest?.('[data-pptskill-element-id]'), slide = element?.closest('.slide');
    if (slide && element) {
      const target = { slideId: slide.dataset.slideId, elementId: element.dataset.pptskillElementId };
      if (resolve(target) || (target.slideId === currentSlideNode()?.dataset.slideId && eligibleIds().includes(target.elementId))) { event.preventDefault(); select(target, Boolean(event.shiftKey)); return; }
    }
    clearSelection();
  };
  const inputOwnsKey = node => {
    if (node?.closest?.('input,textarea,select,[role="textbox"],.pptskill-editor,[data-pptskill-editor-chrome],[data-pptskill-selected-image-toolbar]')) return true;
    const editable = node?.closest?.('[contenteditable]');
    return Boolean(node?.isContentEditable || (editable && editable.getAttribute('contenteditable') !== 'false'));
  };
  const compositionStart = () => { composing = true; };
  const compositionEnd = () => { composing = false; };
  const keydown = event => {
    if (composing || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey
      || inputOwnsKey(event.target) || inputOwnsKey(document.activeElement)) return;
    if (interaction.getState().enabled && event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); cancel(); clearSelection(); return;
    }
    if (interaction.nudge(event.key, event.shiftKey)) {
      event.preventDefault(); event.stopImmediatePropagation(); moveable?.updateRect();
    }
  };
  const pointerCancel = () => { if (interaction.getState().enabled) cancel(); };
  const viewportChanged = () => { if (interaction.getState().enabled) cancel(); };
  const routeGestureControl = event => {
    if (!interaction.getState().gesturing) return;
    const node = event.target, action = node.closest?.('[data-action]')?.dataset.action;
    const selection = node.closest?.('.slide') && !node.closest?.('.pptskill-editor,[data-pptskill-editor-chrome],.moveable-control-box');
    if (action === 'set-selected-image-fit') { cancel('image-fit'); routedControlClick = event; return; }
    if (!['layout', 'snap-layout', 'edit'].includes(action) && !action?.startsWith('align-') && !action?.startsWith('distribute-') && !['group-elements','ungroup-elements','lock-elements','unlock-elements'].includes(action) && !selection) return;
    // 比 gesture 才註冊的 vendor window capture 更早；stopDrag 解除 blocker，原事件仍走既有 handler。
    cancel(); routedControlClick = event;
  };
  const pointerDown = event => {
    if (event.target.closest?.('[data-action="replace-selected-image"],[data-action="insert-image"]')) cancel('picker');
    else if (event.target.closest?.('[data-action="set-selected-image-fit"]')) cancel('image-fit');
    else if (interaction.getState().enabled && event.target.closest?.('.slide')) onSelectionChange('selection');
    // 沒有尾隨 click（例如 pointercancel）時，新的有效 pointer 仍立即恢復操作。
    if (event.isTrusted && event.isPrimary !== false && event.button === 0) { suppressPointerClick = false; routedControlClick = null; }
  };
  const guarded = new Map();
  // viewport／pointer observation 只持同步排他，不複製 canonical 或全 DOM。
  const entry = handler => { if (!guarded.has(handler)) guarded.set(handler, previewEvent(event => {
    const action = handler === click && event.target.closest?.('[data-action]')?.dataset.action;
    const writes = action && (/^(align-|distribute-)/.test(action) || ['group-elements', 'ungroup-elements', 'lock-elements', 'unlock-elements', 'initialize-layout'].includes(action))
      || handler === keydown && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && !interaction.getState().gesturing;
    if (writes) return mutate(() => handler(event));
    const result = handler(event); onGestureChange(true); return result;
  }, false)); return guarded.get(handler); };
  window.addEventListener('click', entry(routeGestureControl), true);
  document.addEventListener('pointerdown', entry(pointerDown), true);
  document.addEventListener('click', entry(click));
  document.addEventListener('keydown', entry(keydown), true);
  document.addEventListener('compositionstart', entry(compositionStart), true);
  document.addEventListener('compositionend', entry(compositionEnd), true);
  document.addEventListener('pointercancel', entry(pointerCancel), true);
  const blur = () => { composing = false; if (interaction.getState().enabled) cancel('blur'); clearSelection('blur'); };
  window.addEventListener('blur', entry(blur));
  window.addEventListener('resize', entry(viewportChanged));
  window.addEventListener('scroll', entry(viewportChanged), true);
  const refresh = () => { const ids = selection.getState().selected; const slide = getSpec().slides.find(s => s.id === currentSlideNode()?.dataset.slideId); const expanded = slide && groupLock ? groupLock.expand(slide, ids) : ids; if (!selection.replace(expanded)) applySelection(expanded); };
  return { setMode, clearSelection, restoreSelection, cancel, refresh, restoreProjection: refresh, getState: interaction.getState,
    getSelectionState: selection.getState,
    destroy() {
      setMode(false);
      destroySelecto();
      suppressPointerClick = false;
      routedControlClick = null;
      window.removeEventListener('click', entry(routeGestureControl), true);
      document.removeEventListener('pointerdown', entry(pointerDown), true);
      document.removeEventListener('click', entry(click)); document.removeEventListener('keydown', entry(keydown), true);
      document.removeEventListener('compositionstart', entry(compositionStart), true);
      document.removeEventListener('compositionend', entry(compositionEnd), true);
      document.removeEventListener('pointercancel', entry(pointerCancel), true);
      window.removeEventListener('blur', entry(blur)); window.removeEventListener('resize', entry(viewportChanged));
      window.removeEventListener('scroll', entry(viewportChanged), true);
    },
  };
}

export const buildComponentInteractionMount = () => mountComponentInteraction.toString();
