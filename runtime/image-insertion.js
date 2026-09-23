import { assetReplacement } from './asset-replacement.js';
import { validateComponentGeometry } from './component-geometry.js';
import { resolveSlideElementIdentities } from './deck-spec.js';

// 共用 image／text insertion；Node 與 portable 序列化同一契約。
export function createImageInsertionContract(assets, validateGeometry, resolveIdentities) {
  const idPattern = /^[a-z0-9][a-z0-9._-]{0,79}$/;
  const fields = (value, required, optional = []) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value), ctor = proto && Object.getOwnPropertyDescriptor(proto, 'constructor');
    if (proto !== null && !(Object.getPrototypeOf(proto) === null && typeof ctor?.value === 'function'
      && Function.prototype.toString.call(ctor.value) === Function.prototype.toString.call(Object)
      && Object.getOwnPropertyDescriptor(ctor.value, 'prototype')?.value === proto)) return false;
    return required.every(key => Object.hasOwn(value, key)) && Reflect.ownKeys(value).every(key => [...required, ...optional].includes(key)
      && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
  };
  const validateMetadata = (slideId, component, geometry) => {
    if (typeof slideId !== 'string' || !slideId || typeof component.id !== 'string' || !idPattern.test(component.id)
      || !['image', 'text'].includes(component.type)) throw new Error('insert-element metadata 無效。');
    if (component.type === 'text') {
      if (typeof component.text !== 'string' || [...component.text].length < 1 || [...component.text].length > 500) throw new Error('insert-element text 必須為 1–500 Unicode code points。');
    } else if (typeof component.alt !== 'string'
      || (Object.hasOwn(component, 'fit') && !assets.descriptor.inputSchema.properties.value.properties.fit.enum.includes(component.fit))) throw new Error('insert-element image metadata 無效。');
    validateGeometry(Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, geometry[key]])));
  };
  const snapshotFileOptions = options => {
    if (!fields(options, ['slideId', 'componentId', 'alt', 'geometry'], ['fit'])
      || !fields(options.geometry, ['x', 'y', 'width', 'height'])) throw new Error('insertImageFile options 欄位無效。');
    const component = { id: options.componentId, type: 'image', alt: options.alt,
      ...(Object.hasOwn(options, 'fit') ? { fit: options.fit } : {}) };
    const geometry = Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, options.geometry[key]]));
    validateMetadata(options.slideId, component, geometry);
    return { operation: 'insert-element', target: { slideId: options.slideId }, value: { component, geometry } };
  };
  const validateRequest = request => {
    if (!fields(request, ['operation', 'target', 'value']) || request.operation !== 'insert-element'
      || !fields(request.target, ['slideId']) || typeof request.target.slideId !== 'string' || !request.target.slideId
      || !fields(request.value, ['component', 'geometry'])
      || !(fields(request.value.component, ['id', 'type', 'dataUri', 'alt'], ['fit'])
        || fields(request.value.component, ['id', 'type', 'text']))
      || !fields(request.value.geometry, ['x', 'y', 'width', 'height'])) throw new Error('insert-element payload 欄位無效。');
    const { component, geometry } = request.value;
    // S13 text payload 不接受隱藏欄位；保留既有 image／File options 的 data-descriptor 契約。
    if (component.type === 'text' && [request, request.target, request.value, component, geometry]
      .some(value => Reflect.ownKeys(value).some(key => !Object.getOwnPropertyDescriptor(value, key).enumerable))) throw new Error('insert-element text payload 不接受隱藏欄位。');
    if (!(component.type === 'text' ? fields(component, ['id', 'type', 'text'])
      : component.type === 'image' && fields(component, ['id', 'type', 'dataUri', 'alt'], ['fit']))) throw new Error('insert-element component variant 無效。');
    validateMetadata(request.target.slideId, component, geometry);
    // 交給 S4 政策驗證，勿另造 MIME／bytes／SVG authority。
    if (component.type === 'image') assets.validateRequest({ operation: 'replace-asset', target: { slideId: request.target.slideId, elementId: 'role-title' }, value: {
      dataUri: component.dataUri, alt: component.alt, ...(Object.hasOwn(component, 'fit') ? { fit: component.fit } : {}),
    } });
    return request;
  };
  const preflight = (slide, request) => {
    const { component } = request.value;
    if (!slide || slide.id !== request.target.slideId || slide.content.components.some(c => c.id === component.id)) throw new Error('insert-element slide 或 duplicate component ID 無效。');
    const components = [...slide.content.components, component];
    const before = resolveIdentities(slide), after = resolveIdentities({ ...slide, content: { ...slide.content, components } });
    const oldIds = [before.title, before.subtitle, ...before.keyPoints, ...before.components];
    const retained = [after.title, after.subtitle, ...after.keyPoints, ...after.components.slice(0, -1)];
    const elementId = after.components.at(-1);
    if (oldIds.length !== retained.length || oldIds.some((id, i) => id !== retained[i])
      || !idPattern.test(elementId) || new Set([...retained, elementId]).size !== retained.length + 1) throw new Error('insert-element 會改變既有 identity；拒絕插入。');
    return elementId;
  };
  const update = (slide, request) => {
    validateRequest(request);
    const elementId = preflight(slide, request), { component, geometry } = request.value;
    const nextComponent = component.type === 'text' ? { id: component.id, type: 'text', text: component.text }
      : { id: component.id, type: 'image', dataUri: component.dataUri, alt: component.alt,
      ...(Object.hasOwn(component, 'fit') ? { fit: component.fit } : {}) };
    const components = [...slide.content.components, nextComponent];
    slide.content.components = components;
    slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides,
      [component.id]: Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, geometry[key]])) };
    return { component: nextComponent, elementId };
  };
  const descriptor = {
    inputSchema: { type: 'object', required: ['operation', 'target', 'value'], additionalProperties: false, properties: {
      operation: { type: 'string', const: 'insert-element' },
      target: { type: 'object', required: ['slideId'], additionalProperties: false, properties: { slideId: { type: 'string', minLength: 1 } } },
      value: { type: 'object', required: ['component', 'geometry'], additionalProperties: false, properties: {
        component: { oneOf: [{ type: 'object', required: ['id', 'type', 'dataUri', 'alt'], additionalProperties: false, properties: {
          id: { type: 'string', pattern: idPattern.source }, type: { type: 'string', const: 'image' },
          dataUri: assets.descriptor.inputSchema.properties.value.properties.dataUri, alt: { type: 'string' }, fit: { type: 'string', enum: ['contain', 'cover'] },
        } }, { type: 'object', required: ['id', 'type', 'text'], additionalProperties: false, properties: {
          id: { type: 'string', pattern: idPattern.source }, type: { type: 'string', const: 'text' },
          text: { type: 'string', minLength: 1, maxLength: 500 },
        } }] },
        geometry: { type: 'object', required: ['x', 'y', 'width', 'height'], additionalProperties: false,
          properties: Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, { type: 'integer', minimum: 80 }])) },
      } },
    } },
    allowedTargetRoles: ['slide'], mutates: ['content.components.membership', 'composition.geometryOverrides.newComponent'],
    preserves: ['existingContent', 'existingIdentity', 'composition.slots', 'composition.order', 'existingGeometry', 'typography', 'motion', 'background', 'style', 'otherSlides'],
    destructive: false, confirmation: 'none', undoable: false, qaInvalidation: ['content', 'assets', 'geometry', 'overflow', 'portableSize'],
    portableSerialization: 'json', unsupportedReason: null,
  };
  return { validateRequest, snapshotFileOptions, preflight, update, descriptor };
}
export const imageInsertion = createImageInsertionContract(assetReplacement, validateComponentGeometry, resolveSlideElementIdentities);
export const buildImageInsertionRuntime = () => `const imageInsertion=(${createImageInsertionContract.toString()})(assetReplacement,validateComponentGeometry,resolveSlideElementIdentities);`;
