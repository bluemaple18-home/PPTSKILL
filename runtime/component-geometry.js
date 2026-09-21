// Node、browser、sanitizer 與 renderer 共用同一 canonical 契約。
export const COMPONENT_GEOMETRY = Object.freeze({
  slideWidth: 1600, slideHeight: 900, safeInset: 80, minimumSize: 80,
  defaultBox: Object.freeze({ x: 800, y: 280, width: 640, height: 480 }),
});
export const COMPONENT_ALIGNMENT_VALUES = Object.freeze(['left', 'center-x', 'right', 'top', 'center-y', 'bottom']);
export const COMPONENT_DISTRIBUTION_VALUES = Object.freeze(['horizontal-centers', 'vertical-centers']);

export function validateComponentGeometry(value, fields = ['x', 'y', 'width', 'height']) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key))) {
    throw new Error('geometry 欄位必須恰為 ' + fields.join('、') + '。');
  }
  for (const key of fields) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || !Number.isInteger(value[key])) throw new Error('geometry ' + key + ' 必須是 finite integer。');
    if (value[key] < (key === 'x' || key === 'y' ? COMPONENT_GEOMETRY.safeInset : COMPONENT_GEOMETRY.minimumSize)) throw new Error('geometry ' + key + ' 低於 minimum／safe area。');
  }
  if (fields.length === 4 && (value.x + value.width > COMPONENT_GEOMETRY.slideWidth - COMPONENT_GEOMETRY.safeInset
    || value.y + value.height > COMPONENT_GEOMETRY.slideHeight - COMPONENT_GEOMETRY.safeInset)) throw new Error('geometry 超出 safe area。');
  return Object.fromEntries(fields.map(key => [key, value[key]]));
}

export function sanitizeGeometryOverrides(overrides, components) {
  if (overrides === undefined) return undefined;
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw new Error('geometryOverrides 必須是 object。');
  const ids = new Set(components.map(component => component.id));
  const entries = Object.entries(overrides).map(([id, box]) => {
    if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(id)) throw new Error('geometryOverrides component ID 非法。');
    return [id, validateComponentGeometry(box)];
  }).filter(([id]) => ids.has(id));
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function getComponentGeometry(composition, componentId) {
  const overrides = composition?.geometryOverrides;
  return overrides && Object.hasOwn(overrides, componentId) ? overrides[componentId] : undefined;
}

export function alignComponentGeometries(slide, componentIds, alignment) {
  if (!Array.isArray(componentIds) || componentIds.length < 2 || componentIds.some(id => typeof id !== 'string')
    || new Set(componentIds).size !== componentIds.length) throw new Error('align-selection 至少需要兩個唯一 component。');
  if (!COMPONENT_ALIGNMENT_VALUES.includes(alignment)) throw new Error('align-selection alignment 不支援。');
  const available = new Set((slide?.content?.components || []).map(component => component.id));
  const entries = componentIds.map(id => {
    if (!available.has(id)) throw new Error('align-selection 找不到 component：' + id);
    const box = getComponentGeometry(slide.composition, id);
    if (!box) throw new Error('align-selection target 缺少 canonical geometry：' + id);
    return [id, validateComponentGeometry(box)];
  });
  const left = Math.min(...entries.map(([, box]) => box.x));
  const right = Math.max(...entries.map(([, box]) => box.x + box.width));
  const top = Math.min(...entries.map(([, box]) => box.y));
  const bottom = Math.max(...entries.map(([, box]) => box.y + box.height));
  const next = Object.fromEntries(entries.map(([id, box]) => {
    const aligned = { ...box };
    if (alignment === 'left') aligned.x = left;
    if (alignment === 'center-x') aligned.x = Math.round((left + right - box.width) / 2);
    if (alignment === 'right') aligned.x = right - box.width;
    if (alignment === 'top') aligned.y = top;
    if (alignment === 'center-y') aligned.y = Math.round((top + bottom - box.height) / 2);
    if (alignment === 'bottom') aligned.y = bottom - box.height;
    return [id, validateComponentGeometry(aligned)];
  }));
  slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, ...next };
  return next;
}

export function distributeComponentGeometries(slide, componentIds, distribution, stableElementIds = componentIds) {
  if (!Array.isArray(componentIds) || componentIds.length < 3 || componentIds.some(id => typeof id !== 'string')
    || new Set(componentIds).size !== componentIds.length) throw new Error('distribute-selection 至少需要三個唯一 component。');
  if (!Array.isArray(stableElementIds) || stableElementIds.length !== componentIds.length
    || stableElementIds.some(id => typeof id !== 'string') || new Set(stableElementIds).size !== stableElementIds.length) {
    throw new Error('distribute-selection stable element identities 非法。');
  }
  if (!COMPONENT_DISTRIBUTION_VALUES.includes(distribution)) throw new Error('distribute-selection distribution 不支援。');
  const available = new Set((slide?.content?.components || []).map(component => component.id));
  const horizontal = distribution === 'horizontal-centers';
  const entries = componentIds.map((id, index) => {
    if (!available.has(id)) throw new Error('distribute-selection 找不到 component：' + id);
    const box = getComponentGeometry(slide.composition, id);
    if (!box) throw new Error('distribute-selection target 缺少 canonical geometry：' + id);
    const valid = validateComponentGeometry(box);
    return { id, stableElementId: stableElementIds[index], box: valid, center: horizontal ? valid.x + valid.width / 2 : valid.y + valid.height / 2 };
  }).sort((a, b) => a.center - b.center || (a.stableElementId < b.stableElementId ? -1 : a.stableElementId > b.stableElementId ? 1 : 0));
  const first = entries[0].center, last = entries[entries.length - 1].center;
  const step = (last - first) / (entries.length - 1);
  const next = Object.fromEntries(entries.map((entry, index) => {
    if (index === 0 || index === entries.length - 1) return [entry.id, entry.box];
    const targetCenter = first + step * index;
    const distributed = { ...entry.box };
    if (horizontal) distributed.x = Math.round(targetCenter - entry.box.width / 2);
    else distributed.y = Math.round(targetCenter - entry.box.height / 2);
    return [entry.id, validateComponentGeometry(distributed)];
  }));
  slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, ...next };
  return next;
}

export function updateComponentGeometry(slide, componentId, operation, value) {
  const fields = operation === 'move-element' ? ['x', 'y'] : ['width', 'height'];
  const patch = validateComponentGeometry(value, fields);
  const current = getComponentGeometry(slide.composition, componentId) ?? COMPONENT_GEOMETRY.defaultBox;
  const next = validateComponentGeometry({ ...current, ...patch });
  slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, [componentId]: next };
}

export function componentGeometryStyle(box) {
  if (!box) return '';
  const { x, y, width, height } = validateComponentGeometry(box);
  return `position:absolute;inset:auto;left:${x}px;top:${y}px;width:${width}px;height:${height}px;margin:0;min-width:0;max-width:none;min-height:0;max-height:none;box-sizing:border-box`;
}

// 僅退場舊 geometry 寫入的 suppression；保留作者樣式及其 priority。
export function projectComponentGeometryStyle(element, box) {
  const owned = element.getAttribute('data-pptskill-geometry') === 'canonical';
  if (owned) {
    for (const key of ['transform', 'translate', 'rotate', 'scale']) {
      if (element.style.getPropertyValue(key) === 'none' && element.style.getPropertyPriority(key) === 'important') element.style.removeProperty(key);
    }
  }
  if (box) element.setAttribute('data-pptskill-geometry', 'canonical');
  // preview 只暫改這組 position/size；取消與 export clone 均投影 committed box。
  if (box || owned) {
    for (const entry of componentGeometryStyle(box || COMPONENT_GEOMETRY.defaultBox).split(';')) {
      const [key, value] = entry.split(':');
      if (box) element.style.setProperty(key, value);
      else element.style.removeProperty(key);
    }
  }
  if (!box) element.removeAttribute('data-pptskill-geometry');
}

export const buildComponentGeometryRuntime = () => [
  `const COMPONENT_GEOMETRY=${JSON.stringify(COMPONENT_GEOMETRY)};`,
  `const COMPONENT_ALIGNMENT_VALUES=${JSON.stringify(COMPONENT_ALIGNMENT_VALUES)};`,
  `const COMPONENT_DISTRIBUTION_VALUES=${JSON.stringify(COMPONENT_DISTRIBUTION_VALUES)};`,
  validateComponentGeometry.toString(), sanitizeGeometryOverrides.toString(),
  getComponentGeometry.toString(), alignComponentGeometries.toString(), distributeComponentGeometries.toString(), updateComponentGeometry.toString(),
  componentGeometryStyle.toString(), projectComponentGeometryStyle.toString(),
].join('\n');
