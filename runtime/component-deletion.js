import { resolveSlideElementIdentities } from './deck-spec.js';

// Node 與 portable 共用 membership／引用／identity 契約；DOM transaction 留在既有 editor。
export function createComponentDeletionContract(resolveIdentities) {
  const idPattern = /^[a-z0-9][a-z0-9._-]{0,79}$/;
  const exact = (value, keys) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value), ctor = proto && Object.getOwnPropertyDescriptor(proto, 'constructor');
    if (proto !== null && !(Object.getPrototypeOf(proto) === null && typeof ctor?.value === 'function'
      && Function.prototype.toString.call(ctor.value) === Function.prototype.toString.call(Object)
      && Object.getOwnPropertyDescriptor(ctor.value, 'prototype')?.value === proto)) return false;
    return Reflect.ownKeys(value).length === keys.length && keys.every(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor?.enumerable && Object.hasOwn(descriptor, 'value');
    });
  };
  const validateRequest = request => {
    if (!exact(request, ['operation', 'target', 'value']) || request.operation !== 'delete-element'
      || !exact(request.target, ['slideId', 'elementId']) || !exact(request.value, ['confirm'])) throw new Error('delete-element payload／target／value 必須為 exact enumerable data objects。');
    if (typeof request.target.slideId !== 'string' || !request.target.slideId
      || typeof request.target.elementId !== 'string' || !idPattern.test(request.target.elementId)) throw new Error('delete-element target slideId／elementId 格式非法。');
    if (request.value.confirm !== true) throw new Error('delete-element 必須明示 confirm=true。');
    return request;
  };
  const preflight = (slide, request) => {
    validateRequest(request);
    if (!slide || slide.id !== request.target.slideId) throw new Error('delete-element 找不到 canonical slide target。');
    const before = resolveIdentities(slide), index = before.components.indexOf(request.target.elementId), component = slide.content.components[index];
    if (!component || !['text', 'image'].includes(component.type)) throw new Error('delete-element target 僅支援獨立 text/image component。');
    const ref = 'content.components.' + component.id, composition = slide.composition;
    if (Object.values(composition.slots || {}).includes(ref)
      || (composition.order || []).some(value => [ref, component.id, request.target.elementId].includes(value))
      || (composition.motion?.targets || []).some(target => target.ref === ref)) throw new Error('delete-element target 仍有 composition 引用；拒絕刪除。');
    const components = slide.content.components.filter((_, i) => i !== index);
    const after = resolveIdentities({ ...slide, content: { ...slide.content, components } });
    const all = [before.title, before.subtitle, ...before.keyPoints, ...before.components];
    const retained = [before.title, before.subtitle, ...before.keyPoints, ...before.components.filter((_, i) => i !== index)];
    const next = [after.title, after.subtitle, ...after.keyPoints, ...after.components];
    if (new Set(all).size !== all.length || new Set(next).size !== next.length || retained.length !== next.length
      || retained.some((id, i) => id !== next[i]) || next.some(id => !idPattern.test(id))) throw new Error('delete-element 會改變 surviving identity；拒絕刪除。');
    return { component, elementId: request.target.elementId, index };
  };
  const update = (slide, request) => {
    const result = preflight(slide, request);
    slide.content.components.splice(result.index, 1);
    if (slide.composition.geometryOverrides) {
      delete slide.composition.geometryOverrides[result.component.id];
      if (!Object.keys(slide.composition.geometryOverrides).length) delete slide.composition.geometryOverrides;
    }
    return result;
  };
  const descriptor = {
    description: '需明示確認，僅刪除無 composition 引用的獨立文字或圖片。',
    inputSchema: { type: 'object', required: ['operation', 'target', 'value'], additionalProperties: false, properties: {
      operation: { type: 'string', const: 'delete-element' },
      target: { type: 'object', required: ['slideId', 'elementId'], additionalProperties: false, properties: {
        slideId: { type: 'string', minLength: 1 }, elementId: { type: 'string', pattern: idPattern.source },
      } },
      value: { type: 'object', required: ['confirm'], additionalProperties: false, properties: { confirm: { type: 'boolean', const: true } } },
    } },
    allowedTargetRoles: ['component'], mutates: ['content.components.membership', 'composition.geometryOverrides.deletedComponent'],
    preserves: ['survivingContent', 'survivingIdentity', 'composition.slots', 'composition.order', 'otherGeometry', 'typography', 'motion', 'background', 'style', 'otherSlides'],
    destructive: true, confirmation: 'required', undoable: false, qaInvalidation: ['content', 'assets', 'geometry', 'overflow', 'portableSize'],
    portableSerialization: 'json', unsupportedReason: null,
  };
  return { validateRequest, preflight, update, descriptor };
}
export const componentDeletion = createComponentDeletionContract(resolveSlideElementIdentities);
export const buildComponentDeletionRuntime = () => `const componentDeletion=(${createComponentDeletionContract.toString()})(resolveSlideElementIdentities);`;
