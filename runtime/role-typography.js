// Node 與 portable 共用此閉包；不依賴 DOM selector 或外部 schema authority。
export function createRoleTypographyContract() {
  const roles = { 'role-title': 'title', 'role-subtitle': 'subtitle' };
  const record = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === null || (Object.getPrototypeOf(proto) === null && Object.hasOwn(proto, 'constructor') && proto.constructor?.name === 'Object');
  };
  const exact = (value, keys) => record(value) && Reflect.ownKeys(value).length === keys.length
    && keys.every(key => Object.hasOwn(value, key) && Object.getOwnPropertyDescriptor(value, key)?.get === undefined);
  const validSize = value => Number.isInteger(value) && value >= 16 && value <= 160;
  const validateValue = (value, reset = true) => {
    if (!exact(value, ['fontSize']) || !(validSize(value.fontSize) || (reset && value.fontSize === null))) throw new Error('fontSize 必須為 16..160 整數；null 僅供 reset。');
  };
  const targetRole = (slide, elementId) => {
    if (!Object.hasOwn(roles, elementId)) throw new Error('typography 僅支援 title/subtitle。');
    const role = roles[elementId];
    if (typeof slide.content?.[role] !== 'string' || (role === 'subtitle' && !slide.content.subtitle)) throw new Error('typography target 文字不存在。');
    return role;
  };
  const validateRequest = request => {
    if (!exact(request, ['operation', 'target', 'value']) || request.operation !== 'set-typography'
      || !exact(request.target, ['slideId', 'elementId']) || typeof request.target.slideId !== 'string' || !request.target.slideId
      || typeof request.target.elementId !== 'string' || !Object.hasOwn(roles, request.target.elementId)) throw new Error('set-typography payload 或 target 無效。');
    validateValue(request.value);
    return request;
  };
  const sanitize = (overrides, content) => {
    if (overrides === undefined) return undefined;
    if (!record(overrides)) throw new Error('typographyOverrides 必須是 role map。');
    const result = {};
    for (const key of Reflect.ownKeys(overrides)) {
      targetRole({ content }, key);
      if (Object.getOwnPropertyDescriptor(overrides, key)?.get) throw new Error('typographyOverrides 不接受 getter。');
      validateValue(overrides[key], false);
      result[key] = { fontSize: overrides[key].fontSize };
    }
    return Object.keys(result).length ? result : undefined;
  };
  const update = (slide, request) => {
    validateRequest(request);
    if (slide.id !== request.target.slideId) throw new Error('typography slide target 不符。');
    targetRole(slide, request.target.elementId);
    const overrides = sanitize(slide.composition?.typographyOverrides, slide.content) || {};
    if (request.value.fontSize === null) delete overrides[request.target.elementId];
    else overrides[request.target.elementId] = { fontSize: request.value.fontSize };
    if (Object.keys(overrides).length) slide.composition.typographyOverrides = overrides;
    else delete slide.composition.typographyOverrides;
  };
  // 僅投影 font-size；保存 inline default 與 priority，reset 不傷其他 style。
  const project = (element, fontSize) => {
    const baseline = 'data-pptskill-font-default', priority = 'data-pptskill-font-priority';
    if (fontSize !== undefined) {
      if (!validSize(fontSize)) throw new Error('fontSize 投影值無效。');
      if (element.getAttribute(baseline) === null) {
        const value = element.style.getPropertyValue('font-size'), importance = element.style.getPropertyPriority('font-size');
        element.style.setProperty('font-size', fontSize + 'px');
        element.setAttribute(baseline, value);
        element.setAttribute(priority, importance);
      }
      element.style.setProperty('font-size', fontSize + 'px');
    } else if (element.getAttribute(baseline) !== null) {
      const value = element.getAttribute(baseline);
      if (value) element.style.setProperty('font-size', value, element.getAttribute(priority) || '');
      else element.style.removeProperty('font-size');
      element.removeAttribute(baseline); element.removeAttribute(priority);
      if (!element.getAttribute('style')?.trim()) element.removeAttribute('style');
    }
  };
  const descriptor = {
    inputSchema: { type: 'object', required: ['operation', 'target', 'value'], additionalProperties: false, properties: {
      operation: { type: 'string', const: 'set-typography' },
      target: { type: 'object', required: ['slideId', 'elementId'], additionalProperties: false, properties: {
        slideId: { type: 'string', minLength: 1 }, elementId: { type: 'string', enum: Object.keys(roles) },
      } },
      value: { type: 'object', required: ['fontSize'], additionalProperties: false, properties: {
        fontSize: { anyOf: [{ type: 'integer', minimum: 16, maximum: 160 }, { type: 'null' }] },
      } },
    } },
    allowedTargetRoles: ['title', 'subtitle'], mutates: ['composition.typographyOverrides'],
    preserves: ['content', 'style', 'geometry', 'motion', 'background', 'otherSlides'],
    destructive: false, confirmation: 'none', undoable: false,
    qaInvalidation: ['typography', 'overflow', 'readability'], portableSerialization: 'json', unsupportedReason: null,
  };
  return { validateRequest, sanitize, update, project, descriptor };
}

export const roleTypography = createRoleTypographyContract();
export const buildRoleTypographyRuntime = () => `const roleTypography=(${createRoleTypographyContract.toString()})();`;
