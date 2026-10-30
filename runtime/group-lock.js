// 沿既有 composition 與 operation authority；Node／portable 共用，不保存第二份狀態。
export function createGroupLockContract(resolveIdentities, validateGeometry) {
  const names = ['group-elements', 'ungroup-elements', 'lock-elements', 'unlock-elements', 'move-group', 'resize-group'];
  const pattern = /^[a-z0-9][a-z0-9._-]{0,79}$/;
  const nativePrototype = (value, ctor) => {
    const proto = Object.getPrototypeOf(value), own = proto && Object.getOwnPropertyDescriptor(proto, 'constructor');
    return Boolean(proto && typeof own?.value === 'function'
      && Function.prototype.toString.call(own.value) === Function.prototype.toString.call(ctor)
      && Object.getOwnPropertyDescriptor(own.value, 'prototype')?.value === proto);
  };
  const exact = (value, keys) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && !(Object.getPrototypeOf(proto) === null && nativePrototype(value, Object))) return false;
    return Reflect.ownKeys(value).length === keys.length && keys.every(key => {
      const d = Object.getOwnPropertyDescriptor(value, key);
      return d?.enumerable && Object.hasOwn(d, 'value');
    });
  };
  const array = (value, minimum = 0) => {
    if (!Array.isArray(value) || !nativePrototype(value, Array) || value.length < minimum
      || Reflect.ownKeys(value).length !== value.length + 1) throw new Error('group/lock 必須為無額外欄位的 data array。');
    for (let i = 0; i < value.length; i++) {
      const d = Object.getOwnPropertyDescriptor(value, String(i));
      if (!d?.enumerable || !Object.hasOwn(d, 'value')) throw new Error('group/lock 不接受稀疏陣列或 getter。');
    }
    return value;
  };
  const ids = (value, minimum = 1) => {
    array(value, minimum);
    if (value.some(id => typeof id !== 'string' || !pattern.test(id)) || new Set(value).size !== value.length) throw new Error('group/lock elementIds 必須唯一且格式合法。');
    return value;
  };
  const field = (object, key) => {
    if (!(key in object)) return undefined;
    const d = Object.getOwnPropertyDescriptor(object, key);
    if (!d?.enumerable || !Object.hasOwn(d, 'value') || d.value === undefined) throw new Error('group/lock metadata 必須為 own enumerable data。');
    return d.value;
  };
  const sameSet = (a, b) => a.length === b.length && a.every(id => b.includes(id));
  const component = (slide, id) => {
    const identities = resolveIdentities(slide), all = [identities.title, identities.subtitle, ...identities.keyPoints, ...identities.components];
    if (new Set(all).size !== all.length) throw new Error('group/lock canonical identity 不唯一。');
    const index = identities.components.indexOf(id), found = slide.content.components[index];
    if (!found || !['text', 'image'].includes(found.type)) throw new Error('group/lock 僅支援同頁 text/image component。');
    return found;
  };
  const independent = (slide, id) => {
    const found = component(slide, id), ref = 'content.components.' + found.id, c = slide.composition;
    if (Object.values(c.slots || {}).includes(ref) || (c.order || []).some(item => [ref, found.id, id].includes(item))
      || (c.motion?.targets || []).some(item => item.ref === ref)) throw new Error('group/lock target 有 composition 引用。');
    return found;
  };
  const sanitize = (composition, slide) => {
    const rawGroups = field(composition, 'elementGroups'), rawLocked = field(composition, 'lockedElementIds');
    if (rawGroups === undefined && rawLocked === undefined) return {};
    const groups = [], seen = new Set();
    for (const group of rawGroups === undefined ? [] : array(rawGroups)) {
      ids(group, 2);
      for (const id of group) {
        if (seen.has(id)) throw new Error('group 成員不得重疊。');
        seen.add(id);
        const found = independent(slide, id);
        const box = composition.geometryOverrides?.[found.id];
        if (!box) throw new Error('請先為群組成員套用手動版面。');
        validateGeometry(box);
      }
      groups.push([...group]);
    }
    const locked = rawLocked === undefined ? [] : [...ids(rawLocked, 0)];
    locked.forEach(id => independent(slide, id));
    for (const group of groups) if (group.some(id => locked.includes(id)) && !group.every(id => locked.includes(id))) throw new Error('群組必須整組鎖定或解鎖。');
    return { ...(groups.length ? { elementGroups: groups } : {}), ...(locked.length ? { lockedElementIds: locked } : {}) };
  };
  const validateRequest = request => {
    if (!exact(request, ['operation', 'target', 'value']) || !names.includes(request.operation)
      || !exact(request.target, ['slideId', 'elementIds'])) throw new Error('group/lock payload 必須為 exact own data records。');
    if (typeof request.target.slideId !== 'string' || !request.target.slideId) throw new Error('group/lock slideId 無效。');
    ids(request.target.elementIds, ['lock-elements', 'unlock-elements'].includes(request.operation) ? 1 : 2);
    const fields = request.operation === 'move-group' ? ['x', 'y'] : request.operation === 'resize-group' ? ['width', 'height'] : [];
    if (!exact(request.value, fields)) throw new Error('group/lock value 欄位不符。');
    if (fields.length) validateGeometry(request.value, fields);
    return request;
  };
  const groupFor = (slide, id) => (slide.composition.elementGroups || []).find(group => group.includes(id)) || null;
  const isLocked = (slide, id) => Boolean(slide?.composition?.lockedElementIds?.includes(id));
  const expand = (slide, selected) => [...new Set(selected.flatMap(id => groupFor(slide, id) || [id]))];
  const assertMutable = (slide, operation, selected) => {
    const state = sanitize(slide.composition, slide);
    if (selected.some(id => state.lockedElementIds?.includes(id))) throw new Error('元件已鎖定，請先解鎖。');
    if (['move-element', 'resize-element', 'align-selection', 'distribute-selection', 'delete-element'].includes(operation)
      && selected.some(id => state.elementGroups?.some(group => group.includes(id)))) throw new Error('群組元件請整組操作，或先解組。');
  };
  const bounds = (slide, selected) => {
    const boxes = selected.map(id => {
      const c = component(slide, id), box = slide.composition.geometryOverrides?.[c.id];
      if (!box) throw new Error('群組成員缺少手動版面。');
      return validateGeometry(box);
    });
    const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
    return { x, y, width: Math.max(...boxes.map(b => b.x + b.width)) - x, height: Math.max(...boxes.map(b => b.y + b.height)) - y };
  };
  const transform = (slide, selected, operation, value) => {
    const box = bounds(slide, selected);
    const dx = operation === 'move-group' ? value.x - box.x : 0, dy = operation === 'move-group' ? value.y - box.y : 0;
    const sx = operation === 'resize-group' ? value.width / box.width : 1, sy = operation === 'resize-group' ? value.height / box.height : 1;
    return Object.fromEntries(selected.map(id => {
      const c = component(slide, id), b = slide.composition.geometryOverrides[c.id];
      return [c.id, validateGeometry({ x: Math.round(box.x + (b.x - box.x) * sx + dx), y: Math.round(box.y + (b.y - box.y) * sy + dy),
        width: Math.round(b.width * sx), height: Math.round(b.height * sy) })];
    }));
  };
  const update = (slide, request) => {
    validateRequest(request);
    if (!slide || slide.id !== request.target.slideId) throw new Error('group/lock canonical slide 不符。');
    const { operation, target: { elementIds: selected }, value } = request;
    const state = sanitize(slide.composition, slide), groups = state.elementGroups || [], locked = state.lockedElementIds || [];
    selected.forEach(id => independent(slide, id));
    const group = groups.find(g => sameSet(g, selected));
    if (operation !== 'unlock-elements' && operation !== 'lock-elements' && selected.some(id => locked.includes(id))) throw new Error('元件已鎖定，請先解鎖。');
    for (const g of groups) if (g.some(id => selected.includes(id)) && !g.every(id => selected.includes(id))) throw new Error('必須指定完整群組。');
    if (operation === 'group-elements') {
      if (group) return slide;
      if (selected.some(id => groupFor(slide, id))) throw new Error('請先解組，不支援巢狀群組。');
      bounds(slide, selected);
      slide.composition.elementGroups = [...groups, [...selected]];
    } else if (operation === 'ungroup-elements') {
      if (!group) throw new Error('請指定單一完整群組。');
      const next = groups.filter(g => g !== group);
      if (next.length) slide.composition.elementGroups = next; else delete slide.composition.elementGroups;
    } else if (operation === 'lock-elements' || operation === 'unlock-elements') {
      const next = operation === 'lock-elements' ? [...new Set([...locked, ...selected])] : locked.filter(id => !selected.includes(id));
      if (next.length) slide.composition.lockedElementIds = next; else delete slide.composition.lockedElementIds;
    } else {
      if (!group) throw new Error('請指定單一完整群組。');
      const next = transform(slide, selected, operation, value);
      slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, ...next };
    }
    return slide;
  };
  const assertPatch = (before, after) => {
    const state = sanitize(before.composition, before);
    for (const key of ['elementGroups', 'lockedElementIds']) if (JSON.stringify(before.composition[key]) !== JSON.stringify(after.composition[key])) throw new Error('patch 不得改變group/lock metadata。');
    for (const id of state.lockedElementIds || []) {
      const old = component(before, id), next = component(after, id);
      if (JSON.stringify(old) !== JSON.stringify(next)) throw new Error('patch 不得修改鎖定元件。');
    }
    for (const id of new Set([...(state.lockedElementIds || []), ...(state.elementGroups || []).flat()])) {
      const old = component(before, id), next = component(after, id);
      if (old.id !== next.id || JSON.stringify(before.composition.geometryOverrides?.[old.id]) !== JSON.stringify(after.composition.geometryOverrides?.[next.id])) throw new Error('patch 不得改變群組或鎖定版面。');
    }
  };
  const descriptors = Object.fromEntries(names.map(operation => {
    const fields = operation === 'move-group' ? ['x', 'y'] : operation === 'resize-group' ? ['width', 'height'] : [];
    return [operation, {
      inputSchema: { type: 'object', additionalProperties: false, required: ['operation', 'target', 'value'], properties: {
        operation: { const: operation }, target: { type: 'object', additionalProperties: false, required: ['slideId', 'elementIds'], properties: {
          slideId: { type: 'string', minLength: 1 }, elementIds: { type: 'array', uniqueItems: true, minItems: ['lock-elements', 'unlock-elements'].includes(operation) ? 1 : 2, items: { type: 'string', pattern: pattern.source } },
        } }, value: { type: 'object', additionalProperties: false, required: fields, properties: Object.fromEntries(fields.map(key => [key, { type: 'integer', minimum: 80 }])) },
      } }, allowedTargetRoles: ['component'], mutates: fields.length ? ['composition.geometryOverrides'] : ['composition.elementGroups', 'composition.lockedElementIds'],
      preserves: ['content', 'identity', 'typography', 'motion', 'style', 'background', 'otherSlides'], destructive: false, confirmation: 'none', undoable: true,
      qaInvalidation: fields.length ? ['geometry', 'overflow', 'readability'] : [], portableSerialization: 'json', unsupportedReason: null,
    }];
  }));
  return { names, descriptors, sanitize, validateRequest, component, independent, groupFor, isLocked, expand, assertMutable, bounds, transform, update, assertPatch };
}

export const buildGroupLockRuntime = () => `const groupLock=(${createGroupLockContract.toString()})(resolveSlideElementIdentities,validateComponentGeometry);`;
