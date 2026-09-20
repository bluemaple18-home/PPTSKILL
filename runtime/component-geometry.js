// Node、browser、sanitizer 與 renderer 共用同一 canonical 契約。
export const COMPONENT_GEOMETRY = Object.freeze({
  slideWidth: 1600, slideHeight: 900, safeInset: 80, minimumSize: 80,
  defaultBox: Object.freeze({ x: 800, y: 280, width: 640, height: 480 }),
});

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
  return `position:absolute;inset:auto;left:${x}px;top:${y}px;width:${width}px;height:${height}px;margin:0;min-width:0;max-width:none;min-height:0;max-height:none;box-sizing:border-box;transform:none!important;translate:none!important;rotate:none!important;scale:none!important`;
}

export const buildComponentGeometryRuntime = () => [
  `const COMPONENT_GEOMETRY=${JSON.stringify(COMPONENT_GEOMETRY)};`,
  validateComponentGeometry.toString(), sanitizeGeometryOverrides.toString(),
  getComponentGeometry.toString(), updateComponentGeometry.toString(), componentGeometryStyle.toString(),
].join('\n');
