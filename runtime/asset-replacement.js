import { ASSET_POLICY, parseImageDataUri, inspectImageAsset } from './asset-policy.js';

// 共用既有 asset policy；閉包同時序列化到 portable，不新增 schema authority。
export function createAssetReplacementContract(inspectAsset) {
  const record = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value), ctor = proto && Object.getOwnPropertyDescriptor(proto, 'constructor');
    return proto === null || (Object.getPrototypeOf(proto) === null && ctor?.value?.name === 'Object' && ctor.value.prototype === proto);
  };
  const fields = (value, required, optional = []) => record(value)
    && required.every(key => Object.hasOwn(value, key))
    && Reflect.ownKeys(value).every(key => [...required, ...optional].includes(key)
      && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
  const validateTarget = target => {
    if (!fields(target, ['slideId', 'elementId']) || typeof target.slideId !== 'string' || !target.slideId
      || typeof target.elementId !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(target.elementId)) throw new Error('replace-asset target 無效。');
    return { slideId: target.slideId, elementId: target.elementId };
  };
  const validateRequest = request => {
    if (!fields(request, ['operation', 'target', 'value']) || request.operation !== 'replace-asset'
      || !fields(request.value, ['dataUri'], ['alt', 'fit'])) throw new Error('replace-asset payload 或 target 無效。');
    validateTarget(request.target);
    const value = request.value;
    if (typeof value.dataUri !== 'string' || !/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/.test(value.dataUri) || inspectAsset(value.dataUri).status === 'fail'
      || (Object.hasOwn(value, 'alt') && typeof value.alt !== 'string')
      || (Object.hasOwn(value, 'fit') && !['contain', 'cover'].includes(value.fit))) throw new Error('replace-asset image dataUri、alt 或 fit 無效。');
    return request;
  };
  const update = (slide, request, identities) => {
    validateRequest(request);
    const index = identities.components.indexOf(request.target.elementId), component = slide.content.components[index];
    if (slide.id !== request.target.slideId || !component || component.type !== 'image') throw new Error('replace-asset target 必須是既有 image。');
    for (const key of ['dataUri', 'alt', 'fit']) if (Object.hasOwn(request.value, key)) component[key] = request.value[key];
    return component;
  };
  const project = (image, component) => {
    image.setAttribute('src', component.dataUri);
    image.setAttribute('alt', component.alt);
    image.style.setProperty('object-fit', component.fit || 'contain');
  };
  const descriptor = {
    inputSchema: { type: 'object', required: ['operation', 'target', 'value'], additionalProperties: false, properties: {
      operation: { type: 'string', const: 'replace-asset' },
      target: { type: 'object', required: ['slideId', 'elementId'], additionalProperties: false, properties: {
        slideId: { type: 'string', minLength: 1 }, elementId: { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]{0,79}$' },
      } },
      value: { type: 'object', required: ['dataUri'], additionalProperties: false, properties: {
        dataUri: { type: 'string', pattern: '^data:image/(png|jpeg|webp|gif|svg\\+xml);base64,[a-zA-Z0-9+/=]*$' },
        alt: { type: 'string' }, fit: { type: 'string', enum: ['contain', 'cover'] },
      } },
    } },
    allowedTargetRoles: ['component'], mutates: ['content.components.image.dataUri', 'content.components.image.alt', 'content.components.image.fit'],
    preserves: ['componentIdentity', 'otherContent', 'composition', 'geometry', 'typography', 'style', 'motion', 'background', 'otherSlides'],
    destructive: false, confirmation: 'none', undoable: false, qaInvalidation: ['content', 'assets', 'readability', 'portableSize'],
    portableSerialization: 'json', unsupportedReason: null,
  };
  return { validateTarget, validateRequest, update, project, descriptor };
}

export const assetReplacement = createAssetReplacementContract(inspectImageAsset);
export const buildAssetReplacementRuntime = () => `const ASSET_POLICY=${JSON.stringify(ASSET_POLICY)};const parseImageDataUri=${parseImageDataUri.toString()};const inspectImageAsset=${inspectImageAsset.toString()};const assetReplacement=(${createAssetReplacementContract.toString()})(inspectImageAsset);`;
