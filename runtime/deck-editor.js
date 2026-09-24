import { buildCropHashLicenseScript } from './crop-hash-vendor.js';
import { buildGroupLockRuntime } from './group-lock.js';
import { imageCrop, buildImageCropRuntime, buildCropDialogMarkup, buildCropDialogCss, mountCropDialog } from './image-crop.js';
import { imageInsertion, buildImageInsertionRuntime } from './image-insertion.js';
import { componentDeletion, buildComponentDeletionRuntime } from './component-deletion.js';
import { assetReplacement, buildAssetReplacementRuntime } from './asset-replacement.js';
import { roleTypography, buildRoleTypographyRuntime } from './role-typography.js';
import { buildComponentInteractionRuntime, buildComponentInteractionMount, cleanupComponentInteractionClone } from './component-interaction.js';
import { COMPONENT_GEOMETRY, COMPONENT_ALIGNMENT_VALUES, COMPONENT_DISTRIBUTION_VALUES, validateComponentGeometry, updateComponentGeometry, alignComponentGeometries, distributeComponentGeometries, buildComponentGeometryRuntime } from './component-geometry.js';
import { resolveSlideElementIdentities, ROLE_ELEMENT_IDS, sanitizeDeckSpec, validateDeckSpec, groupLock } from './deck-spec.js';
import { getGenerationCapabilities, validateDeckGenerationCapabilities } from './generation-capabilities.js';
import { buildMotionBrowserContractRuntime, validateDeckMotionInput } from './motion-capabilities.js';
import { buildBackgroundBrowserContractRuntime, validateDeckBackgroundEffects } from './background-effects.js';
import { buildMultiSelectionRuntime } from './multi-selection.js';
import { createEditorHistory } from './editor-history.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
// 僅在冷路徑提交／清理後比對 canonical 值；pointer 只讀閉包 revision。
const sameCanonicalValue = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameCanonicalValue(a[key], b[key]));
};
const operationIdPattern = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const hasExactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const editTextAllowedTargetRoles = Object.freeze(['title', 'subtitle', 'keyPoint', 'component']);
// 私有 canonical type guard，不從公開 descriptor 推導文字 authority。
const editTextComponent = (slide, elementId, value) => {
  const index = resolveSlideElementIdentities(slide).components.indexOf(elementId);
  const component = slide.content.components[index];
  if (!component || component.type !== 'text') throw new Error('edit-text component 僅支援 type=text。');
  imageInsertion.validateTextValue(value);
  return component;
};

const validateOperationRequest = (request) => {
  if (!Object.hasOwn(Object.getOwnPropertyDescriptor(request || {}, 'operation') || {}, 'value')) throw new Error('operation 不接受 getter。');
  if (groupLock.names.includes(request.operation)) return groupLock.validateRequest(request);
  if (request?.operation === 'edit-text') return imageInsertion.validateEditTextRequest(request);
  if (request?.operation === 'insert-element') return imageInsertion.validateRequest(request);
  if (request?.operation === 'delete-element') return componentDeletion.validateRequest(request);
  if (['crop-image','reset-image-crop'].includes(request?.operation)) return imageCrop.validateRequest(request);
  if (request?.operation === 'replace-asset') return assetReplacement.validateRequest(request);
  if (['copy-style', 'paste-style'].includes(request?.operation)) return roleTypography.validateStyleRequest(request);
  if (request?.operation === 'set-typography') return roleTypography.validateRequest(request);
  if (!hasExactKeys(request, ['operation', 'target', 'value'])) throw new Error('operation payload 欄位必須恰為 operation、target、value。');
  if (typeof request.operation !== 'string' || !operationIdPattern.test(request.operation)) throw new Error('operation ID 格式非法。');
  if (request.operation === 'align-selection' || request.operation === 'distribute-selection') {
    const isDistribution = request.operation === 'distribute-selection';
    const prefix = isDistribution ? 'distribute-selection' : 'align-selection';
    if (!hasExactKeys(request.target, ['slideId', 'elementIds'])) throw new Error(prefix + ' target 欄位必須恰為 slideId、elementIds。');
    if (typeof request.target.slideId !== 'string' || request.target.slideId.length < 1) throw new Error('operation target slideId 格式非法。');
    const ids = request.target.elementIds, minimum = isDistribution ? 3 : 2;
    if (!Array.isArray(ids) || ids.length < minimum || ids.some(id => typeof id !== 'string' || !operationIdPattern.test(id))
      || new Set(ids).size !== ids.length) throw new Error(prefix + ' elementIds 數量或格式非法。');
    if (isDistribution) {
      if (!hasExactKeys(request.value, ['distribution']) || !COMPONENT_DISTRIBUTION_VALUES.includes(request.value.distribution)) throw new Error('distribute-selection distribution 不支援。');
    } else if (!hasExactKeys(request.value, ['alignment']) || !COMPONENT_ALIGNMENT_VALUES.includes(request.value.alignment)) throw new Error('align-selection alignment 不支援。');
    return request;
  }
  if (!hasExactKeys(request.target, ['slideId', 'elementId'])) throw new Error('operation target 欄位必須恰為 slideId、elementId。');
  if (typeof request.target.slideId !== 'string' || request.target.slideId.length < 1) throw new Error('operation target slideId 格式非法。');
  if (typeof request.target.elementId !== 'string' || !operationIdPattern.test(request.target.elementId)) throw new Error('operation target elementId 格式非法。');
  if (request.operation === 'edit-text' && typeof request.value !== 'string') throw new Error('operation value 必須是 string。');
  if (request.operation === 'move-element') validateComponentGeometry(request.value, ['x', 'y']);
  if (request.operation === 'resize-element') validateComponentGeometry(request.value, ['width', 'height']);
  return request;
};

const geometryDescriptor = (operation, fields) => ({
  inputSchema: {
    type: 'object', required: ['operation', 'target', 'value'], additionalProperties: false,
    properties: {
      operation: { type: 'string', const: operation, pattern: '^[a-z0-9][a-z0-9._-]{0,79}$' },
      target: { type: 'object', required: ['slideId', 'elementId'], additionalProperties: false,
        properties: { slideId: { type: 'string', minLength: 1 }, elementId: { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]{0,79}$' } } },
      value: { type: 'object', required: fields, additionalProperties: false,
        properties: Object.fromEntries(fields.map(key => [key, { type: 'integer', minimum: key === 'x' || key === 'y' ? COMPONENT_GEOMETRY.safeInset : COMPONENT_GEOMETRY.minimumSize }])) },
    },
  },
  allowedTargetRoles: ['component'], mutates: ['composition.geometryOverrides'],
  preserves: ['content', 'style', 'motion', 'background', 'otherSlides'],
  destructive: false, confirmation: 'none', undoable: true, qaInvalidation: ['geometry', 'overflow', 'readability'],
  portableSerialization: 'json', unsupportedReason: null,
});

export const OPERATION_DESCRIPTORS = deepFreeze({
  ...groupLock.descriptors,
  'insert-element': imageInsertion.descriptor,
  'delete-element': componentDeletion.descriptor,
  'replace-asset': assetReplacement.descriptor,
  'crop-image': imageCrop.descriptor('crop-image'),
  'reset-image-crop': imageCrop.descriptor('reset-image-crop'),
  'set-typography': roleTypography.descriptor,
  'copy-style': roleTypography.styleDescriptor('copy-style'),
  'paste-style': roleTypography.styleDescriptor('paste-style'),
  'edit-text': {
    description: '編輯既有 role 文字；component 僅允許 type=text，只改 text 欄位。',
    inputSchema: {
      type: 'object',
      required: ['operation', 'target', 'value'],
      additionalProperties: false,
      properties: {
        operation: { type: 'string', const: 'edit-text', pattern: '^[a-z0-9][a-z0-9._-]{0,79}$' },
        target: {
          type: 'object',
          required: ['slideId', 'elementId'],
          additionalProperties: false,
          properties: {
            slideId: { type: 'string', minLength: 1 },
            elementId: { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]{0,79}$' },
          },
        },
        value: { type: 'string' },
      },
    },
    allowedTargetRoles: [...editTextAllowedTargetRoles],
    mutates: ['content.text', 'content.components.text'],
    preserves: ['composition', 'style', 'motion', 'background', 'componentIdentity', 'componentMembership', 'nonTextComponentFields', 'otherComponents', 'otherSlides'],
    destructive: false,
    confirmation: 'none',
    undoable: true,
    qaInvalidation: ['content', 'overflow'],
    portableSerialization: 'json',
    unsupportedReason: null,
  },
  'move-element': geometryDescriptor('move-element', ['x', 'y']),
  'resize-element': geometryDescriptor('resize-element', ['width', 'height']),
  'align-selection': {
    inputSchema: {
      type: 'object', required: ['operation', 'target', 'value'], additionalProperties: false,
      properties: {
        operation: { type: 'string', const: 'align-selection', pattern: '^[a-z0-9][a-z0-9._-]{0,79}$' },
        target: { type: 'object', required: ['slideId', 'elementIds'], additionalProperties: false,
          properties: {
            slideId: { type: 'string', minLength: 1 },
            elementIds: { type: 'array', minItems: 2, uniqueItems: true,
              items: { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]{0,79}$' } },
          } },
        value: { type: 'object', required: ['alignment'], additionalProperties: false,
          properties: { alignment: { type: 'string', enum: [...COMPONENT_ALIGNMENT_VALUES] } } },
      },
    },
    allowedTargetRoles: ['component'], mutates: ['composition.geometryOverrides'],
    preserves: ['content', 'style', 'motion', 'background', 'otherSlides'],
    destructive: false, confirmation: 'none', undoable: true, qaInvalidation: ['geometry', 'overflow', 'readability'],
    portableSerialization: 'json', unsupportedReason: null,
  },
  'distribute-selection': {
    inputSchema: {
      type: 'object', required: ['operation', 'target', 'value'], additionalProperties: false,
      properties: {
        operation: { type: 'string', const: 'distribute-selection', pattern: '^[a-z0-9][a-z0-9._-]{0,79}$' },
        target: { type: 'object', required: ['slideId', 'elementIds'], additionalProperties: false,
          properties: {
            slideId: { type: 'string', minLength: 1 },
            elementIds: { type: 'array', minItems: 3, uniqueItems: true,
              items: { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]{0,79}$' } },
          } },
        value: { type: 'object', required: ['distribution'], additionalProperties: false,
          properties: { distribution: { type: 'string', enum: [...COMPONENT_DISTRIBUTION_VALUES] } } },
      },
    },
    allowedTargetRoles: ['component'], mutates: ['composition.geometryOverrides'],
    preserves: ['content', 'style', 'motion', 'background', 'otherSlides'],
    destructive: false, confirmation: 'none', undoable: true, qaInvalidation: ['geometry', 'overflow', 'readability'],
    portableSerialization: 'json', unsupportedReason: null,
  },
});

export const EDITOR_CHROME_SELECTORS = Object.freeze([
  '[data-pptskill-editor-chrome]',
  '.moveable-control-box',
  '.selecto-selection',
  '[data-pptskill-context-toolbar]',
  '[data-pptskill-group-toolbar]',
  '[data-pptskill-typography-toolbar]',
  '[data-pptskill-selected-image-toolbar]',
  '[data-pptskill-insert-image-toolbar]',
  '[data-pptskill-insert-text-toolbar]',
  '[data-insert-text-dialog]',
  '[data-crop-dialog]',
]);

export const EDITOR_PRESENTATION_TRUTH_SELECTORS = Object.freeze([
  '.deck',
  '.slide',
  '#deck-spec',
  '[data-edit-target]',
]);

export function cleanupEditorChromeFromExportClone(root, chromeSelectors, presentationTruthSelectors) {
  if (!root || !Array.isArray(chromeSelectors) || !Array.isArray(presentationTruthSelectors)) throw new Error('editor chrome cleanup contract 無效。');
  const chromeRoots = [...new Set(chromeSelectors.flatMap((selector) => [
    ...(root.matches?.(selector) ? [root] : []),
    ...root.querySelectorAll(selector),
  ]))];
  for (const node of chromeRoots) {
    const touchesPresentationTruth = presentationTruthSelectors.some((selector) => (
      node.matches?.(selector) || node.querySelector?.(selector)
    ));
    if (touchesPresentationTruth) throw new Error('editor chrome contract 指向 presentation truth；拒絕匯出。');
  }
  chromeRoots.forEach((node) => node.remove());
  return chromeRoots.length;
}

const uniqueSlideId = (slides, baseId) => {
  let suffix = 1;
  let candidate = `${baseId}-copy-${suffix}`;
  const ids = new Set(slides.map(({ id }) => id));
  while (ids.has(candidate)) candidate = `${baseId}-copy-${suffix += 1}`;
  return candidate;
};

const findSlide = (spec, slideId) => {
  const slide = spec.slides.find((item) => item.id === slideId);
  if (!slide) throw new Error(`找不到 slide：${slideId}`);
  return slide;
};

export function createDeckEditor(input) {
  const rawMotionErrors = validateDeckMotionInput(input);
  const rawBackgroundErrors = validateDeckBackgroundEffects(input);
  if (rawMotionErrors.length || rawBackgroundErrors.length) throw new Error([...rawMotionErrors, ...rawBackgroundErrors].join(' '));
  let spec = sanitizeDeckSpec(input);
  let styleClipboard = null;
  const history = createEditorHistory();
  const initialCapabilityValidation = validateDeckGenerationCapabilities(spec);
  if (initialCapabilityValidation.status !== 'pass') throw new Error(initialCapabilityValidation.errors.join(' '));

  const commit = (candidate, undoable = false) => {
    const rawMotionErrors = validateDeckMotionInput(candidate);
    const rawBackgroundErrors = validateDeckBackgroundEffects(candidate);
    if (rawMotionErrors.length || rawBackgroundErrors.length) throw new Error([...rawMotionErrors, ...rawBackgroundErrors].join(' '));
    const clean = sanitizeDeckSpec(candidate);
    const validation = validateDeckSpec(clean);
    const capabilityValidation = validateDeckGenerationCapabilities(clean);
    const errors = [...validation.errors, ...capabilityValidation.errors];
    if (errors.length) throw new Error(errors.join(' '));
    const changed = !sameCanonicalValue(spec, clean);
    const result = clone(clean);
    if (changed) history.record(spec, clean, undoable);
    spec = clean;
    return result;
  };

  const executeOperation = (request) => {
    const { operation, target, value } = validateOperationRequest(request);
    const descriptor = OPERATION_DESCRIPTORS[operation];
    if (!descriptor) throw new Error(`不支援的 operation：${operation || 'unknown'}`);
    if (operation === 'copy-style' || operation === 'paste-style') {
      const slide = findSlide(spec, target.slideId);
      roleTypography.validateStyleTarget(slide, request);
      if (operation === 'copy-style') { styleClipboard = roleTypography.copyStyle(slide, request); return clone(spec); }
      if (!styleClipboard) throw new Error('請先複製明示字級。');
      return executeOperation({ operation: 'set-typography', target, value: { ...styleClipboard } });
    }
    const candidate = clone(spec);
    const slide = findSlide(candidate, target.slideId);
    const identities = resolveSlideElementIdentities(slide);
    if (groupLock.names.includes(operation)) {
      groupLock.update(slide, request);
      return commit(candidate, descriptor.undoable === true);
    }
    groupLock.assertMutable(slide, operation, target.elementIds || [target.elementId]);
    if (operation === 'delete-element') {
      if (candidate.slides.filter(s => s.id === target.slideId).length !== 1) throw new Error('delete-element canonical slide 必須唯一。');
      componentDeletion.update(slide, request);
      return commit(candidate, descriptor.undoable === true);
    }
    if (operation === 'insert-element') {
      imageInsertion.update(slide, request);
      return commit(candidate, descriptor.undoable === true);
    }
    if (operation === 'crop-image' || operation === 'reset-image-crop') {
      imageCrop.update(slide, request, identities);
      return commit(candidate, descriptor.undoable === true);
    }
    if (operation === 'replace-asset') {
      assetReplacement.update(slide, request, identities);
      return commit(candidate, descriptor.undoable === true);
    }
    if (operation === 'align-selection' || operation === 'distribute-selection') {
      const componentIds = target.elementIds.map(elementId => {
        const index = identities.components.indexOf(elementId);
        if (index < 0) throw new Error(`${operation} 找不到 component element：${elementId}`);
        return slide.content.components[index].id;
      });
      if (operation === 'align-selection') alignComponentGeometries(slide, componentIds, value.alignment);
      else distributeComponentGeometries(slide, componentIds, value.distribution, target.elementIds);
      return commit(candidate, descriptor.undoable === true);
    }
    const pointIndex = identities.keyPoints.indexOf(target.elementId);
    let role;
    if (target.elementId === ROLE_ELEMENT_IDS.title) role = 'title';
    else if (target.elementId === ROLE_ELEMENT_IDS.subtitle) role = 'subtitle';
    else if (pointIndex >= 0) role = 'keyPoint';
    else if (identities.components.includes(target.elementId)) role = 'component';
    else throw new Error(`找不到 element：${target.elementId}`);
    if (!descriptor.allowedTargetRoles.includes(role)) throw new Error(`operation 不支援 target role：${role}`);
    if (operation === 'set-typography') roleTypography.update(slide, request);
    else if (operation === 'edit-text' && role === 'component') {
      const component = editTextComponent(slide, target.elementId, value);
      if (component.text === value) return clone(spec);
      component.text = value;
    }
    else if (role === 'component') updateComponentGeometry(slide, slide.content.components[identities.components.indexOf(target.elementId)].id, operation, value);
    else if (role === 'title' || role === 'subtitle') slide.content[role] = value;
    else slide.content.keyPoints[pointIndex] = value;
    return commit(candidate, descriptor.undoable === true);
  };

  const editor = {
    getSpec: () => clone(spec),
    getHistoryState: history.state,
    undo() { return history.replay('undo', value => { spec = value; }); },
    redo() { return history.replay('redo', value => { spec = value; }); },
    operationDescriptors: OPERATION_DESCRIPTORS,
    executeOperation,
    editText(slideId, field, value) {
      if (!['title', 'subtitle'].includes(field)) throw new Error('只允許直接編輯 title 或 subtitle。');
      return executeOperation({ operation: 'edit-text', target: { slideId, elementId: ROLE_ELEMENT_IDS[field] }, value: String(value) });
    },
    editKeyPoint(slideId, index, value) {
      const slide = findSlide(spec, slideId);
      if (!Number.isInteger(index) || index < 0 || index >= slide.content.keyPoints.length) throw new Error('keyPoint index 超出範圍。');
      return executeOperation({ operation: 'edit-text', target: { slideId, elementId: resolveSlideElementIdentities(slide).keyPoints[index] }, value: String(value) });
    },
    editComponent(slideId, componentId, changes) {
      const candidate = clone(spec);
      const slide = findSlide(candidate, slideId), components = slide.content.components;
      const index = components.findIndex(({ id }) => id === componentId);
      if (index < 0) throw new Error(`找不到 component：${componentId}`);
      groupLock.assertMutable(slide, 'edit-text', [resolveSlideElementIdentities(slide).components[index]]);
      components[index] = { ...components[index], ...clone(changes), id: componentId, type: components[index].type };
      return commit(candidate);
    },
    replaceImage(slideId, componentId, { dataUri, alt, fit }) {
      const slide = findSlide(spec, slideId), index = slide.content.components.findIndex(c => c.id === componentId);
      return executeOperation({ operation: 'replace-asset', target: { slideId, elementId: resolveSlideElementIdentities(slide).components[index] },
        value: { dataUri, ...(alt !== undefined ? { alt } : {}), ...(fit !== undefined ? { fit } : {}) } });
    },
    reorder(fromIndex, toIndex) {
      if (![fromIndex, toIndex].every((value) => Number.isInteger(value) && value >= 0 && value < spec.slides.length)) throw new Error('reorder index 超出範圍。');
      const candidate = clone(spec);
      const [slide] = candidate.slides.splice(fromIndex, 1);
      candidate.slides.splice(toIndex, 0, slide);
      return commit(candidate);
    },
    duplicate(index) {
      if (spec.slides.length >= 15) throw new Error('投影片上限為 15 頁。');
      if (!Number.isInteger(index) || index < 0 || index >= spec.slides.length) throw new Error('duplicate index 超出範圍。');
      const candidate = clone(spec);
      const copy = clone(candidate.slides[index]);
      const sourceId = copy.id;
      copy.id = uniqueSlideId(candidate.slides, copy.id);
      candidate.slides.splice(index + 1, 0, copy);
      for (const claim of candidate.claims ?? []) if (claim.slideIds.includes(sourceId)) claim.slideIds.push(copy.id);
      commit(candidate);
      return copy.id;
    },
    delete(index) {
      if (spec.slides.length === 1) throw new Error('至少保留一張投影片。');
      if (!Number.isInteger(index) || index < 0 || index >= spec.slides.length) throw new Error('delete index 超出範圍。');
      const candidate = clone(spec);
      const [removed] = candidate.slides.splice(index, 1);
      candidate.claims = candidate.claims?.map((claim) => ({ ...claim, slideIds: claim.slideIds.filter((id) => id !== removed.id) })).filter((claim) => claim.slideIds.length > 0);
      return commit(candidate);
    },
    applyLocalPatch({ slideId, region, value }) {
      if (region === 'content.title' || region === 'content.subtitle') return executeOperation({ operation: 'edit-text', target: { slideId, elementId: ROLE_ELEMENT_IDS[region.slice(8)] }, value: String(value) });
      const pointMatch = /^content\.keyPoints\.(\d+)$/.exec(region);
      if (pointMatch) {
        const slide = findSlide(spec, slideId);
        const index = Number(pointMatch[1]);
        if (index >= slide.content.keyPoints.length) throw new Error('keyPoint index 超出範圍。');
        return executeOperation({ operation: 'edit-text', target: { slideId, elementId: resolveSlideElementIdentities(slide).keyPoints[index] }, value: String(value) });
      }
      const componentMatch = /^content\.components\.([a-z0-9][a-z0-9._-]{0,79})$/i.exec(region);
      if (componentMatch && value && typeof value === 'object') return this.editComponent(slideId, componentMatch[1], value);
      throw new Error('local AI patch 必須指向單一支援的 slide content region。');
    },
  };
  return editor;
}

export const buildDeckEditorCss = () => `${buildCropDialogCss()}
.pptskill-editor{position:fixed;right:18px;bottom:18px;z-index:10000;display:flex;align-items:center;gap:7px;padding:9px;border:1px solid #ffffff2e;border-radius:12px;background:#151515ee;color:#fff;font:600 13px/1.2 "Microsoft JhengHei","Microsoft JhengHei UI","PingFang TC",sans-serif;box-shadow:0 12px 34px #0005;backdrop-filter:blur(12px);opacity:.28;transition:opacity 120ms ease}.pptskill-editor:hover,.pptskill-editor:focus-within,body[data-editor-mode="edit"] .pptskill-editor{opacity:1}.pptskill-editor>:not([data-action="edit"]):not([data-action="layout"]){display:none}body[data-editor-mode="edit"] .pptskill-editor>*{display:inline-flex}body[data-editor-mode="edit"] .pptskill-editor__file{display:block}
.pptskill-editor button,.pptskill-editor label{appearance:none;border:1px solid #ffffff30;border-radius:7px;background:#2a2a2a;color:inherit;padding:8px 10px;font:inherit;cursor:pointer}.pptskill-editor button:hover,.pptskill-editor label:hover{background:#3b3b3b}.pptskill-editor button:focus-visible,.pptskill-editor label:focus-visible{outline:2px solid #9ed7ff;outline-offset:2px}.pptskill-editor [data-action="save"]{background:#f1eee7;color:#181818}.pptskill-editor__status{min-width:88px;color:#d7d7d7;font-weight:500}.pptskill-editor__file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.pptskill-component-dialog{width:min(680px,calc(100vw - 40px));border:1px solid #ffffff30;border-radius:14px;background:#181818;color:#fff;padding:20px;font:600 14px/1.5 "Microsoft JhengHei","Microsoft JhengHei UI","PingFang TC",sans-serif}.pptskill-component-dialog::backdrop{background:#0009}.pptskill-component-dialog textarea{display:block;width:100%;min-height:280px;margin:12px 0;padding:12px;border:1px solid #ffffff30;border-radius:8px;background:#0f0f0f;color:#fff;font:500 13px/1.45 ui-monospace,monospace}.pptskill-component-dialog menu{display:flex;justify-content:flex-end;gap:8px;margin:0;padding:0}.pptskill-component-dialog button{padding:8px 12px}.pptskill-insert-text-dialog{box-sizing:border-box;max-height:calc(100vh - 40px);overflow:auto}.pptskill-insert-text-dialog textarea{box-sizing:border-box;min-height:180px;font:inherit}.pptskill-insert-text-dialog [data-insert-text-status]{min-height:1.5em;white-space:pre-wrap;color:#ffd6a0}.pptskill-insert-text-dialog :focus-visible{outline:2px solid #9ed7ff;outline-offset:2px}
body[data-editor-mode="edit"] [data-edit-kind="text"][contenteditable="true"]{outline:2px dashed #2f82ff;outline-offset:4px;cursor:text}body[data-editor-mode="edit"] .slide[data-editor-selected="true"]{box-shadow:0 0 0 4px #2f82ff inset}
.pptskill-editor button:disabled{opacity:.45;cursor:not-allowed}body[data-editor-mode="layout"] .pptskill-editor>[data-action="undo"],body[data-editor-mode="layout"] .pptskill-editor>[data-action="redo"]{display:inline-flex}
.pptskill-editor{max-width:calc(100vw - 36px);flex-wrap:wrap}body[data-editor-mode="layout"] .pptskill-editor{opacity:1}body[data-editor-mode="layout"] .pptskill-editor>[data-pptskill-insert-text-toolbar],body[data-editor-mode="layout"] .pptskill-editor>[data-pptskill-insert-image-toolbar],body[data-editor-mode="layout"] .pptskill-editor>[data-pptskill-selected-image-toolbar],body[data-editor-mode="layout"] .pptskill-editor>[data-action="snap-layout"],body[data-editor-mode="layout"] .pptskill-editor>[data-action="save"],body[data-editor-mode="layout"] .pptskill-editor>[data-action="delete"],body[data-editor-mode="layout"] .pptskill-editor>[data-editor-status],body[data-editor-mode="layout"] .pptskill-editor>[data-action="initialize-layout"]:not([hidden]),body[data-editor-mode="layout"] .pptskill-editor>[data-pptskill-context-toolbar]:not([hidden]),body[data-editor-mode="layout"] .pptskill-editor>[data-pptskill-group-toolbar]:not([hidden]){display:inline-flex}.pptskill-editor>[data-pptskill-context-toolbar],.pptskill-editor>[data-pptskill-group-toolbar]{align-items:center;gap:4px;flex-wrap:wrap}.pptskill-editor>[hidden],.pptskill-editor [data-pptskill-insert-text-toolbar]>[hidden],.pptskill-editor [data-pptskill-insert-image-toolbar]>[hidden],.pptskill-editor [data-pptskill-selected-image-toolbar]>[hidden]{display:none!important}body[data-editor-mode="layout"] .slide [data-editor-selected="true"]{outline:2px solid #2f82ff;outline-offset:2px}body[data-editor-mode="layout"] .slide [data-pptskill-element-id]{user-select:none}body[data-editor-mode="layout"] .moveable-control-box{z-index:9999}
body[data-editor-mode="edit"] .pptskill-editor>[data-pptskill-typography-toolbar]:not([hidden]){display:inline-flex}.pptskill-editor [data-pptskill-typography-toolbar]{align-items:center;gap:4px}.pptskill-editor [data-typography-size]{width:5em;background:#151515;color:inherit;border:1px solid #ffffff50;border-radius:4px;font:inherit;padding:4px}.pptskill-editor [data-typography-size]:focus-visible{outline:2px solid #9ed7ff;outline-offset:2px}
.pptskill-editor [data-pptskill-selected-image-toolbar],.pptskill-editor [data-selected-image-fit]{align-items:center;gap:4px}.pptskill-editor [data-selected-image-fit]{display:inline-flex}.pptskill-editor [data-image-fit][aria-pressed="true"]{background:#3b3b3b;border-color:#9ed7ff}
@media print{[data-pptskill-editor-chrome],.moveable-control-box,.selecto-selection{display:none!important}.pptskill-editor{display:none!important}.slide[data-editor-selected="true"]{box-shadow:none}}
`;

const buildInsertTextToolbarMarkup = () => `<span data-pptskill-insert-text-toolbar><button type="button" data-action="insert-text" hidden disabled>插入文字</button><button type="button" data-action="edit-selected-text" hidden disabled>編輯所選文字</button></span>`;
const buildInsertTextDialogMarkup = () => `<dialog class="pptskill-component-dialog pptskill-insert-text-dialog" data-insert-text-dialog aria-labelledby="pptskill-insert-text-label"><label id="pptskill-insert-text-label" for="pptskill-insert-text-value">插入文字（1–500 字元）</label><textarea id="pptskill-insert-text-value" data-insert-text-value aria-describedby="pptskill-insert-text-status"></textarea><p id="pptskill-insert-text-status" data-insert-text-status tabindex="-1" role="status" aria-live="polite"></p><menu><button type="button" data-action="cancel-insert-text">取消</button><button type="button" data-action="submit-insert-text">插入</button></menu></dialog>`;
const buildInsertImageToolbarMarkup = () => `<span data-pptskill-insert-image-toolbar><button type="button" data-action="insert-image" hidden disabled>插入圖片</button><input class="pptskill-editor__file" id="pptskill-insert-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden></span>`;

const buildGroupToolbarMarkup = () => `<span data-pptskill-group-toolbar hidden><button type="button" data-group-control data-action="group-elements">群組</button><button type="button" data-group-control data-action="ungroup-elements">解組</button><button type="button" data-group-control data-action="lock-elements">鎖定</button><button type="button" data-group-control data-action="unlock-elements">解鎖</button></span>`;

const buildSelectedImageToolbarMarkup = () => `<span data-pptskill-selected-image-toolbar><button type="button" data-action="crop-selected-image" hidden disabled>裁切圖片</button><button type="button" data-action="replace-selected-image" hidden disabled>替換所選圖片</button><span data-selected-image-fit role="group" aria-label="所選圖片顯示方式" hidden><button type="button" data-action="set-selected-image-fit" data-image-fit="contain" aria-label="完整顯示所選圖片" aria-pressed="false" disabled>完整顯示</button><button type="button" data-action="set-selected-image-fit" data-image-fit="cover" aria-label="填滿所選圖片框" title="填滿圖片框，可能裁去邊緣" aria-pressed="false" disabled>填滿</button></span><input class="pptskill-editor__file" id="pptskill-selected-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden></span>`;

const buildTypographyToolbarMarkup = () => `<span data-pptskill-typography-toolbar hidden><label>字級 <input type="number" min="16" max="160" step="1" aria-label="字級（slide px）" data-typography-size></label><button type="button" data-action="apply-typography">套用字級</button><button type="button" data-action="reset-typography">還原字級</button><button type="button" data-action="copy-style" disabled>複製字級</button><button type="button" data-action="paste-style" disabled>貼上字級</button></span>`;

export const buildDeckEditorMarkup = () => `${buildCropHashLicenseScript()}<nav class="pptskill-editor" data-pptskill-editor aria-label="簡報編輯器"><button type="button" data-action="edit">編輯文字</button><button type="button" data-action="layout" aria-pressed="false">編輯版面</button><button type="button" data-action="undo" disabled aria-label="復原">復原</button><button type="button" data-action="redo" disabled aria-label="重做">重做</button><button type="button" data-action="snap-layout" aria-pressed="false">8px吸附</button><button type="button" data-action="initialize-layout" hidden>套用手動版面</button>${buildInsertImageToolbarMarkup()}${buildInsertTextToolbarMarkup()}${buildTypographyToolbarMarkup()}${buildGroupToolbarMarkup()}${buildSelectedImageToolbarMarkup()}<span data-pptskill-context-toolbar hidden aria-label="多選排列"><button type="button" data-action="align-left">左對齊</button><button type="button" data-action="align-center-x">水平置中</button><button type="button" data-action="align-right">右對齊</button><button type="button" data-action="align-top">上對齊</button><button type="button" data-action="align-center-y">垂直置中</button><button type="button" data-action="align-bottom">下對齊</button><button type="button" data-action="distribute-horizontal-centers" data-distribute-control hidden>水平均分</button><button type="button" data-action="distribute-vertical-centers" data-distribute-control hidden>垂直均分</button><button type="button" data-action="distribute-horizontal-gaps" data-distribute-control hidden>水平等間距</button><button type="button" data-action="distribute-vertical-gaps" data-distribute-control hidden>垂直等間距</button></span><button type="button" data-action="edit-component">編輯元件</button><button type="button" data-action="move-up">上移</button><button type="button" data-action="move-down">下移</button><button type="button" data-action="duplicate">複製</button><button type="button" data-action="delete">刪除</button><label for="pptskill-image-input">替換圖片</label><input class="pptskill-editor__file" id="pptskill-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"><button type="button" data-action="save">另存 HTML</button><span class="pptskill-editor__status" data-editor-status aria-live="polite">可直接播放</span></nav>${buildInsertTextDialogMarkup()}${buildCropDialogMarkup()}<dialog class="pptskill-component-dialog" data-component-dialog><strong>編輯目前頁面的支援元件</strong><p>只接受 DeckSpec allowlist 內的 text、image、table、chart 或 public citation。</p><textarea data-component-json spellcheck="false"></textarea><menu><button type="button" data-action="cancel-component">取消</button><button type="button" data-action="apply-component">套用</button></menu></dialog>`;

export const buildDeckEditorRuntimeScript = (componentTreatments = {}) => {
  const chartCapability = getGenerationCapabilities().components.chart;
  const motionContractRuntime = buildMotionBrowserContractRuntime();
  const backgroundContractRuntime = buildBackgroundBrowserContractRuntime();
  const editorChromeCleanupRuntime = cleanupEditorChromeFromExportClone.toString();
  return String.raw`<script data-pptskill-editor-runtime>(()=>{const boot=()=>{
if(window.PPTSKILLEditor)return;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)],clone=v=>JSON.parse(JSON.stringify(v));
${buildComponentGeometryRuntime()}
${buildRoleTypographyRuntime()}
${buildAssetReplacementRuntime()}
${buildImageCropRuntime()}
if(!q('[data-pptskill-crop-hash-license]'))document.body.insertAdjacentHTML?.('beforeend',${JSON.stringify(buildCropHashLicenseScript()).replaceAll('<','\\u003c')});
const cropProjection=createCropProjection({contract:imageCrop,window});let cropDialog=null;
const mountCropDialog=${mountCropDialog.toString()};
if(!q('[data-pptskill-typography-toolbar]'))q('[data-pptskill-editor]')?.insertAdjacentHTML('beforeend',${JSON.stringify(buildTypographyToolbarMarkup())});
if(!q('[data-pptskill-insert-image-toolbar]'))q('[data-pptskill-editor]')?.insertAdjacentHTML('beforeend',${JSON.stringify(buildInsertImageToolbarMarkup())});
if(!q('[data-pptskill-insert-text-toolbar]'))q('[data-pptskill-editor]')?.insertAdjacentHTML('beforeend',${JSON.stringify(buildInsertTextToolbarMarkup())});
if(q('[data-pptskill-insert-text-toolbar]')&&!q('[data-action="edit-selected-text"]'))q('[data-pptskill-insert-text-toolbar]').insertAdjacentHTML('beforeend','<button type="button" data-action="edit-selected-text" hidden disabled>編輯所選文字</button>');
if(q('[data-pptskill-editor]')&&!q('[data-insert-text-dialog]'))document.body.insertAdjacentHTML('beforeend',${JSON.stringify(buildInsertTextDialogMarkup())});
if(!q('[data-pptskill-group-toolbar]'))q('[data-pptskill-editor]')?.insertAdjacentHTML('beforeend',${JSON.stringify(buildGroupToolbarMarkup())});
if(!q('[data-pptskill-selected-image-toolbar]'))q('[data-pptskill-editor]')?.insertAdjacentHTML('beforeend',${JSON.stringify(buildSelectedImageToolbarMarkup())});
if(q('[data-pptskill-editor]')&&!q('[data-crop-dialog]'))document.body.insertAdjacentHTML('beforeend',${JSON.stringify(buildCropDialogMarkup())});
if(!q('[data-action="crop-selected-image"]'))q('[data-pptskill-selected-image-toolbar]')?.insertAdjacentHTML('beforeend','<button type="button" data-action="crop-selected-image" hidden disabled>裁切圖片</button>');
if(q('[data-pptskill-editor]')&&!q('[data-action="undo"]'))q('[data-pptskill-editor]').insertAdjacentHTML('beforeend','<button type="button" data-action="undo" disabled aria-label="復原">復原</button><button type="button" data-action="redo" disabled aria-label="重做">重做</button>');
const componentTreatments=${JSON.stringify(componentTreatments)};
const deepFreeze=${deepFreeze.toString()};
${motionContractRuntime}
${backgroundContractRuntime}
const editorChromeSelectors=${JSON.stringify(EDITOR_CHROME_SELECTORS)},editorPresentationTruthSelectors=${JSON.stringify(EDITOR_PRESENTATION_TRUTH_SELECTORS)},cleanupEditorChromeFromExportClone=${editorChromeCleanupRuntime};
const supportedChartTypes=${JSON.stringify(chartCapability.supportedChartTypes)},chartValueDomain=${JSON.stringify(chartCapability.valueDomain)},operationDescriptors=deepFreeze(${JSON.stringify(OPERATION_DESCRIPTORS)});
const idPattern=/^[a-z0-9][a-z0-9._-]{0,79}$/,namespacedElementId=(namespace,id)=>{const candidate=namespace+'-'+id;if(idPattern.test(candidate))return candidate;let hash=2166136261;for(const character of id)hash=Math.imul(hash^character.codePointAt(0),16777619)>>>0;const suffix=hash.toString(16).padStart(8,'0');return namespace+'-'+id.slice(0,78-namespace.length-suffix.length)+'-'+suffix},pointElementId=id=>namespacedElementId('point',id),componentElementId=id=>namespacedElementId('component',id),roleElementIds={title:'role-title',subtitle:'role-subtitle'},resolveSlideElementIdentities=slide=>{const used=new Set(Object.values(roleElementIds)),keyPointIds=slide.content?.keyPointIds||[],componentIds=(slide.content?.components||[]).map(({id})=>id),entries=[...keyPointIds.map(id=>({key:'point\0'+id,base:pointElementId(id)})),...componentIds.map(id=>({key:'component\0'+id,base:componentElementId(id)}))].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0),resolved=new Map(),allocate=base=>{let candidate=base,suffix=1;while(used.has(candidate)){const marker='-'+(suffix++).toString(36);candidate=base.slice(0,80-marker.length)+marker}used.add(candidate);return candidate};for(const {key,base} of entries)resolved.set(key,allocate(base));return{title:roleElementIds.title,subtitle:roleElementIds.subtitle,keyPoints:keyPointIds.map(id=>resolved.get('point\0'+id)),components:componentIds.map(id=>resolved.get('component\0'+id))}};
${buildImageInsertionRuntime()}
${buildComponentDeletionRuntime()}
${buildGroupLockRuntime()}
const hasExactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const validateOperationRequest=request=>{if(groupCommitInProgress)throw new Error('群組提交進行中。');if(cropCommitInProgress)throw new Error('裁切提交進行中。');if(deletionInProgress)throw new Error('delete-element 進行中，拒絕同步重入。');if(!Object.hasOwn(Object.getOwnPropertyDescriptor(request||{},'operation')||{},'value'))throw new Error('operation 不接受 getter。');if(groupLock.names.includes(request.operation))return groupLock.validateRequest(request);if(request?.operation==='edit-text')return imageInsertion.validateEditTextRequest(request);if(request?.operation==='insert-element')return imageInsertion.validateRequest(request);if(request?.operation==='delete-element')return componentDeletion.validateRequest(request);if(['crop-image','reset-image-crop'].includes(request?.operation))return imageCrop.validateRequest(request);if(request?.operation==='replace-asset')return assetReplacement.validateRequest(request);if(['copy-style','paste-style'].includes(request?.operation))return roleTypography.validateStyleRequest(request);if(request?.operation==='set-typography')return roleTypography.validateRequest(request);if(!hasExactKeys(request,['operation','target','value']))throw new Error('operation payload 欄位必須恰為 operation、target、value。');if(typeof request.operation!=='string'||!idPattern.test(request.operation))throw new Error('operation ID 格式非法。');if(request.operation==='align-selection'||request.operation==='distribute-selection'){const isDistribution=request.operation==='distribute-selection',prefix=isDistribution?'distribute-selection':'align-selection';if(!hasExactKeys(request.target,['slideId','elementIds']))throw new Error(prefix+' target 欄位必須恰為 slideId、elementIds。');if(typeof request.target.slideId!=='string'||request.target.slideId.length<1)throw new Error('operation target slideId 格式非法。');const ids=request.target.elementIds,minimum=isDistribution?3:2;if(!Array.isArray(ids)||ids.length<minimum||ids.some(id=>typeof id!=='string'||!idPattern.test(id))||new Set(ids).size!==ids.length)throw new Error(prefix+' elementIds 數量或格式非法。');if(isDistribution){if(!hasExactKeys(request.value,['distribution'])||!COMPONENT_DISTRIBUTION_VALUES.includes(request.value.distribution))throw new Error('distribute-selection distribution 不支援。')}else if(!hasExactKeys(request.value,['alignment'])||!COMPONENT_ALIGNMENT_VALUES.includes(request.value.alignment))throw new Error('align-selection alignment 不支援。');return request}if(!hasExactKeys(request.target,['slideId','elementId']))throw new Error('operation target 欄位必須恰為 slideId、elementId。');if(typeof request.target.slideId!=='string'||request.target.slideId.length<1)throw new Error('operation target slideId 格式非法。');if(typeof request.target.elementId!=='string'||!idPattern.test(request.target.elementId))throw new Error('operation target elementId 格式非法。');if(request.operation==='edit-text'&&typeof request.value!=='string')throw new Error('operation value 必須是 string。');if(request.operation==='move-element')validateComponentGeometry(request.value,['x','y']);if(request.operation==='resize-element')validateComponentGeometry(request.value,['width','height']);return request};
const sameCanonicalValue=${sameCanonicalValue.toString()};
const createEditorHistory=${createEditorHistory.toString()};
const editTextComponent=${editTextComponent.toString()};
let layout=null,revision=0;
const history=createEditorHistory();
const markChanged=(before,after)=>{if(!sameCanonicalValue(before,after))revision++};
const setValue=(object,key,value)=>{if(object[key]!==value){object[key]=value;revision++}};
const tag=q('#deck-spec');if(!tag)return;let spec=JSON.parse(tag.textContent);const safeStyle=clone(spec.style);let currentId=spec.slides[0]?.id||'';let editMode=false;let editingComponentId='',composingText=null,typographyTarget=null,styleClipboard=null;
const status=m=>{const e=q('[data-editor-status]');if(e)e.textContent=m};
const currentIndex=()=>spec.slides.findIndex(s=>s.id===currentId);const currentNode=()=>q('.slide[data-slide-id="'+CSS.escape(currentId)+'"]');
let pendingImageTarget=null,imagePickerOpen=null,pendingInsertion=null,insertionBusy=false,pendingTextInsertion=null,textInsertionBusy=false,textInsertionComposing=false;
let deletionInProgress=false,pendingAssetOperations=0,cropCommitInProgress=false,groupCommitInProgress=false;
const insertionSlide=(id=currentId)=>{if(!layout?.getState().enabled)return null;const slides=spec.slides.filter(s=>s.id===id),nodes=qa('.slide').filter(s=>s.dataset.slideId===id);return slides.length===1&&nodes.length===1?slides[0]:null};
const refreshInsertImage=()=>{refreshInsertText();const button=q('[data-action="insert-image"]');if(button){button.hidden=!insertionSlide();button.disabled=button.hidden||insertionBusy||Boolean(imagePickerOpen)||(Boolean(pendingTextInsertion)||Boolean(cropDialog?.isOpen()))}};
const selectedImageTarget=()=>{const state=layout?.getSelectionState();if(!state?.enabled||state.selected.length!==1)return null;const slide=spec.slides.find(s=>s.id===currentId),elementId=state.selected[0],index=slide?resolveSlideElementIdentities(slide).components.indexOf(elementId):-1;if(slide&&groupLock.isLocked(slide,elementId))return null;return slide?.content.components[index]?.type==='image'?{slideId:currentId,elementId}:null};
const selectedImageComponent=target=>{const slide=target&&spec.slides.find(s=>s.id===target.slideId);return slide?.content.components[resolveSlideElementIdentities(slide).components.indexOf(target.elementId)]};
const refreshSelectedImage=reason=>{cropDialog?.invalidate();const cropButton=q('[data-action="crop-selected-image"]'),cropTarget=selectedImageTarget();if(!layout?.getState().enabled)q('[data-crop-dialog]')?.removeAttribute('data-pptskill-editor-chrome');if(cropButton){if(layout?.getState().enabled)cropButton.setAttribute('data-pptskill-editor-chrome','');else cropButton.removeAttribute('data-pptskill-editor-chrome');cropButton.hidden=!cropTarget;cropButton.disabled=!cropTarget||Boolean(imagePickerOpen)||(Boolean(pendingTextInsertion)||Boolean(cropDialog?.isOpen()))||insertionBusy||pendingAssetOperations>0||Boolean(cropDialog?.isOpen());}if(cropTarget&&imageCrop.state(selectedImageComponent(cropTarget))==='pending')status('裁切待重新確認：目前完整顯示原圖。');if(reason!=='blur'&&reason!=='refresh'){pendingImageTarget=null;pendingInsertion=null;if(pendingTextInsertion&&!textInsertionBusy){const editing=pendingTextInsertion.mode==='edit';closeInsertText();if(editing)status('文字編輯目標已失效，請重新開啟。')}}refreshInsertImage();const button=q('[data-action="replace-selected-image"]'),target=selectedImageTarget(),group=q('[data-selected-image-fit]'),fit=target?(selectedImageComponent(target).fit||'contain'):null;if(button){button.hidden=!target;button.disabled=!target||Boolean(imagePickerOpen)||(Boolean(pendingTextInsertion)||Boolean(cropDialog?.isOpen()))}if(group)group.hidden=!target;qa('[data-image-fit]').forEach(control=>{control.disabled=!target||Boolean(imagePickerOpen)||(Boolean(pendingTextInsertion)||Boolean(cropDialog?.isOpen()));control.setAttribute('aria-pressed',String(control.dataset.imageFit===fit))});refreshHistoryControls()};
const setSelectedImageFit=fit=>{if(cropDialog?.isOpen()||pendingTextInsertion||imagePickerOpen||!['contain','cover'].includes(fit))return;const target=selectedImageTarget();if(!target)return;layout.cancel('image-fit');const component=selectedImageComponent(target);if((component.fit||'contain')===fit)return;try{executeOperation({operation:'replace-asset',target,value:{dataUri:component.dataUri,fit}})}catch(error){status(error.message)}};
const select=id=>{if(currentId!==id){cropDialog?.close();const editing=pendingTextInsertion?.mode==='edit';closeInsertText();if(editing)status('文字編輯目標已失效，請重新開啟。');layout?.clearSelection();clearTypographyTarget()}currentId=id;qa('.slide').forEach(s=>s.dataset.editorSelected=String(s.dataset.slideId===id));refreshInsertImage();};
const textInsertionDialog=q('[data-insert-text-dialog]'),textInsertionInput=q('[data-insert-text-value]'),textInsertionStatus=q('[data-insert-text-status]');
// 僅捕捉 UI target；canonical 寫入仍完全交由 S14 operation。
const selectedTextTarget=()=>{
const state=layout?.getSelectionState(),slide=insertionSlide();if(!state?.enabled||state.selected.length!==1||!slide)return null;
const elementId=state.selected[0],ids=resolveSlideElementIdentities(slide).components,index=ids.indexOf(elementId),component=slide.content.components[index],root=currentNode();
if(groupLock.isLocked(slide,elementId)||component?.type!=='text'||ids.filter(id=>id===elementId).length!==1||!root?.isConnected||root.closest('.deck')!==q('.deck'))return null;
const nodes=qa('[data-pptskill-element-id]',root).filter(n=>n.dataset.pptskillElementId===elementId),targets=qa('[data-edit-target]',root).filter(n=>n.dataset.editTarget==='slides.'+slide.id+'.content.components.'+component.id),node=nodes[0];
if(nodes.length!==1||targets.length!==1||targets[0]!==node||!node.isConnected||node.closest('.slide')!==root||node.dataset.editKind!=='text'||node.textContent!==component.text||node.children.length)return null;
return{slideId:slide.id,elementId,root,node,text:component.text}
};
const setTextDialogMode=mode=>{const editing=mode==='edit';q('#pptskill-insert-text-label').textContent=editing?'編輯文字（1–500 字元）':'插入文字（1–500 字元）';q('[data-action="submit-insert-text"]').textContent=editing?'儲存':'插入'};
// layout 期間保留 chrome ownership，避免關閉按鈕的尾隨 click 清除原 selection；play teardown 移除。
const refreshInsertText=()=>{if(!layout?.getState().enabled)textInsertionDialog?.removeAttribute('data-pptskill-editor-chrome');const button=q('[data-action="insert-text"]');if(button){button.hidden=!insertionSlide();button.disabled=button.hidden||insertionBusy||Boolean(imagePickerOpen)||(Boolean(pendingTextInsertion)||Boolean(cropDialog?.isOpen()))}const edit=q('[data-action="edit-selected-text"]');if(edit){edit.hidden=!selectedTextTarget();edit.disabled=edit.hidden||insertionBusy||textInsertionBusy||Boolean(imagePickerOpen)||(Boolean(pendingTextInsertion)||Boolean(cropDialog?.isOpen()))}};
const closeInsertText=()=>{const pending=pendingTextInsertion;pendingTextInsertion=null;textInsertionComposing=false;if(textInsertionInput)textInsertionInput.value='';if(textInsertionStatus)textInsertionStatus.textContent='';if(textInsertionDialog?.open)textInsertionDialog.close();refreshSelectedImage('refresh');if(pending?.focus?.isConnected&&!pending.focus.disabled&&!pending.focus.hidden)pending.focus.focus?.()};
const openInsertText=()=>{
if(cropDialog?.isOpen()||pendingTextInsertion||textInsertionBusy||insertionBusy||imagePickerOpen||!textInsertionDialog)return;
const slide=insertionSlide(),root=slide&&currentNode();if(!slide||!root?.isConnected||root.closest('.deck')!==q('.deck'))return;
layout.cancel('insert-text');setTextDialogMode('insert');pendingTextInsertion={mode:'insert',slideId:slide.id,root,focus:q('[data-action="insert-text"]')};textInsertionInput.value='';textInsertionStatus.textContent='';refreshSelectedImage('refresh');
try{textInsertionDialog.setAttribute('data-pptskill-editor-chrome','');textInsertionDialog.showModal();textInsertionInput.focus()}catch(error){closeInsertText();status(error.message)}
};
// 文字 dialog 沿既有 picker cancellation 保留 selection identity，吸附開啟時亦可送出。
const openEditText=()=>{
if(cropDialog?.isOpen()||pendingTextInsertion||textInsertionBusy||insertionBusy||imagePickerOpen||!textInsertionDialog)return;
const target=selectedTextTarget();if(!target)return;
layout.cancel('picker');setTextDialogMode('edit');pendingTextInsertion={...target,mode:'edit',focus:q('[data-action="edit-selected-text"]')};textInsertionInput.value=target.text;textInsertionStatus.textContent='';refreshSelectedImage('refresh');
try{textInsertionDialog.setAttribute('data-pptskill-editor-chrome','');textInsertionDialog.showModal();textInsertionInput.focus()}catch(error){closeInsertText();status(error.message)}
};
const submitInsertText=()=>{
if(!pendingTextInsertion||textInsertionBusy||textInsertionComposing)return;
const pending=pendingTextInsertion,slide=insertionSlide(pending.slideId);
if(pending.mode==='edit'){const target=selectedTextTarget();if(!target||target.slideId!==pending.slideId||target.elementId!==pending.elementId||target.root!==pending.root||target.node!==pending.node||target.text!==pending.text){closeInsertText();status('文字編輯目標已失效，請重新開啟。');return}}
if(!slide||currentId!==pending.slideId||currentNode()!==pending.root||!pending.root.isConnected||pending.root.closest('.deck')!==q('.deck')){closeInsertText();status('文字插入目標已失效，slide／root 必須唯一，請重新開啟。');return}
textInsertionBusy=true;
try{if(pending.mode==='edit'){executeOperation({operation:'edit-text',target:{slideId:pending.slideId,elementId:pending.elementId},value:textInsertionInput.value});closeInsertText();status('文字已儲存');return}const used=new Set(slide.content.components.map(c=>c.id));let n=1;while(used.has('inserted-text-'+n))n++;
executeOperation({operation:'insert-element',target:{slideId:pending.slideId},value:{component:{id:'inserted-text-'+n,type:'text',text:textInsertionInput.value},geometry:{x:560,y:288,width:480,height:320}}});closeInsertText();status('文字已插入')}
catch(error){textInsertionStatus.textContent=error.message;textInsertionStatus.focus()}
finally{textInsertionBusy=false;refreshSelectedImage('refresh')}
};
q('[data-action="insert-text"]')?.addEventListener('pointerdown',()=>layout?.cancel('insert-text'));
q('[data-action="edit-selected-text"]')?.addEventListener('pointerdown',()=>layout?.cancel('picker'));
q('[data-action="crop-selected-image"]')?.addEventListener('pointerdown',()=>layout?.cancel('picker'));
textInsertionInput?.addEventListener('compositionstart',()=>{textInsertionComposing=true});
textInsertionInput?.addEventListener('compositionend',()=>{textInsertionComposing=false});
// IME keydown 保留原生預設處理；只在 dialog cancel 邊界阻止組字期間關閉。
textInsertionDialog?.addEventListener('cancel',e=>{e.preventDefault();if(!textInsertionComposing)closeInsertText()});
textInsertionDialog?.addEventListener('close',()=>{if(!textInsertionDialog.open)closeInsertText()});
const pointTarget=(id,i)=>'slides.'+id+'.content.keyPoints.'+i;
const resolveDirectTextTarget=element=>{const el=element?.closest?.('[data-edit-kind="text"]');if(!el)return null;const slideNode=el.closest('.slide'),slide=spec.slides.find(item=>item.id===slideNode?.dataset.slideId),elementId=el.dataset.pptskillElementId;if(!slide||typeof elementId!=='string')return null;const identities=resolveSlideElementIdentities(slide);if(elementId===identities.title)return{element:el,slideId:slide.id,elementId,canonical:()=>slide.content.title};if(elementId===identities.subtitle)return{element:el,slideId:slide.id,elementId,canonical:()=>slide.content.subtitle};const pointIndex=identities.keyPoints.indexOf(elementId);return pointIndex>=0?{element:el,slideId:slide.id,elementId,canonical:()=>slide.content.keyPoints[pointIndex]}:null};
const directTextElements=()=>qa('[data-edit-kind="text"]').filter(el=>resolveDirectTextTarget(el));
const commitTextElement=element=>{const target=resolveDirectTextTarget(element);if(!target)return false;if(composingText===target.element)throw new Error('IME 組字尚未完成，暫不可提交或匯出。');const value=target.element.textContent.trim();if(value===target.canonical())return false;executeOperation({operation:'edit-text',target:{slideId:target.slideId,elementId:target.elementId},value});return true};
const restoreTextElement=element=>{const target=resolveDirectTextTarget(element);if(!target)return false;target.element.textContent=target.canonical();return true};
const syncText=()=>{if(composingText)throw new Error('IME 組字尚未完成，暫不可提交或匯出。');directTextElements().forEach(commitTextElement)};
const renumber=()=>{const total=spec.slides.length;qa('.slide').forEach((slide,index)=>{qa('[data-editor-folio]',slide).forEach(el=>{const kind=el.dataset.editorFolio;el.textContent=kind==='system'?'SYS.'+String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0'):String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0')})})};
const setEdit=on=>{const invalidated=on&&pendingTextInsertion?.mode==='edit';if(on&&layout?.getState().enabled)layout.setMode(false);let cancelledComposition=false;if(!on&&editMode){if(composingText){restoreTextElement(composingText);composingText=null;cancelledComposition=true}syncText()}editMode=on;if(!on)clearTypographyTarget();document.body.dataset.editorMode=on?'edit':'play';qa('[data-edit-kind="text"]').forEach(el=>el.contentEditable='false');directTextElements().forEach(el=>el.contentEditable=String(on));q('[data-action="edit"]').textContent=on?'完成編輯':'編輯文字';status(invalidated?'文字編輯目標已失效，請重新開啟。':on?'正在編輯':cancelledComposition?'未完成的組字已取消':'變更已保留');refreshHistoryControls()};
const uniqueId=base=>{let n=1,id=base+'-copy-'+n,ids=new Set(spec.slides.map(s=>s.id));while(ids.has(id))id=base+'-copy-'+(++n);return id};
const retarget=(node,oldId,newId)=>{node.id=newId;node.dataset.slideId=newId;qa('[data-edit-target]',node).forEach(el=>el.dataset.editTarget=el.dataset.editTarget.replace('slides.'+oldId+'.','slides.'+newId+'.'))};
const sanitizeComponent=c=>{if(!c||typeof c!=='object'||typeof c.id!=='string')return null;const b={id:c.id,type:String(c.type||'')};if(b.type==='text')return {...b,text:String(c.text||'')};const imageMime=String(c.dataUri||'').slice(11).split(';',1)[0];if(b.type==='image'&&String(c.dataUri||'').startsWith('data:image/')&&['png','jpeg','webp','gif','svg+xml'].includes(imageMime))return {...b,alt:String(c.alt||''),dataUri:c.dataUri,...imageCrop.sanitize(c),...(['contain','cover'].includes(c.fit)?{fit:c.fit}:{})};if(b.type==='table')return {...b,headers:Array.isArray(c.headers)?c.headers.slice(0,12).map(String):[],rows:Array.isArray(c.rows)?c.rows.slice(0,30).map(r=>Array.isArray(r)?r.slice(0,12).map(v=>['string','number','boolean'].includes(typeof v)||v===null?v:''):[]):[]};if(b.type==='chart'){const chartType=String(c.chartType||''),series=Array.isArray(c.series)?c.series.map(s=>({name:String(s?.name||''),values:Array.isArray(s?.values)?s.values.filter(v=>typeof v==='number'):[]})):[];if(!supportedChartTypes.includes(chartType))throw new Error('chart type '+chartType+' 尚未支援；不得偷換成 bar。');if(chartValueDomain==='non-negative'&&series.some(s=>s.values.some(v=>v<0)))throw new Error('目前 bar renderer 不支援負值語意。');return {...b,chartType,labels:Array.isArray(c.labels)?c.labels.map(String):[],series}}if(b.type==='citation'&&c.public===true){const url=String(c.url||'');return {...b,label:String(c.label||''),...(url.startsWith('http://')||url.startsWith('https://')?{url}:{}) ,public:true}}return null};
const sanitizeClaim=c=>{if(!c||typeof c!=='object'||typeof c.id!=='string'||!['fact','derived','inference'].includes(c.kind)||typeof c.summary!=='string')return null;const refs=Array.isArray(c.sourceRefs)?c.sourceRefs.slice(0,8).filter(r=>r?.public===true&&typeof r.id==='string'&&typeof r.label==='string').map(r=>({id:r.id,label:r.label,...(/^https?:\/\//.test(String(r.url||''))?{url:r.url}:{}),public:true,sourceAvailableToRecipient:r.sourceAvailableToRecipient===true})):[];if(c.kind==='derived'&&c.derivation?.operation==='percentage-point-change'&&!['ratio','percent'].includes(c.derivation.scale))throw new Error('percentage-point derivation 必須明示 scale: ratio | percent。');const derivation=c.kind==='derived'&&c.derivation&&['absolute-delta','percent-change','percentage-point-change'].includes(c.derivation.operation)&&Number.isFinite(c.derivation.baseline)&&Number.isFinite(c.derivation.current)?{operation:c.derivation.operation,baseline:c.derivation.baseline,current:c.derivation.current,...(c.derivation.operation==='percentage-point-change'?{scale:c.derivation.scale}:{})}:null;if(c.kind==='derived'&&!derivation)throw new Error('derived claim 必須包含可重算 derivation。');return{id:c.id,kind:c.kind,summary:c.summary,slideIds:Array.isArray(c.slideIds)?c.slideIds.slice(0,15).map(String):[],...(Number.isFinite(c.value)?{value:c.value}:{}),...Object.fromEntries(['metric','period','population','unit','currency'].flatMap(k=>typeof c[k]==='string'&&c[k]?[[k,c[k]]]:[])),...(['causal','correlation','descriptive'].includes(c.relation)?{relation:c.relation}:{}),...(['causal','correlation','descriptive','unknown'].includes(c.evidenceRelation)?{evidenceRelation:c.evidenceRelation}:{}),...(c.kind==='derived'?{derivation}:{}),sourceRefs:refs}};
const cleanSlideContent=s=>{const rawPoints=s.content?.keyPoints,ids=s.content?.keyPointIds;if(ids!==undefined&&(!Array.isArray(ids)||!Array.isArray(rawPoints)||ids.length!==rawPoints.length))throw new Error('keyPointIds 長度不符。');if(ids!==undefined&&(ids.some(id=>typeof id!=='string'||!idPattern.test(id))||new Set(ids).size!==ids.length))throw new Error('keyPointIds 無效。');const keyPoints=Array.isArray(rawPoints)?rawPoints.filter(value=>typeof value==='string').slice(0,5).filter(Boolean):[],keyPointIds=ids===undefined?keyPoints.map((_,i)=>'key-point-'+String(i+1).padStart(2,'0')):[...ids];if(keyPointIds.length!==keyPoints.length)throw new Error('keyPointIds 長度不符。');const components=Array.isArray(s.content?.components)?s.content.components.map(sanitizeComponent).filter(Boolean):[];if(components.some(({id})=>!idPattern.test(id))||new Set(components.map(({id})=>id)).size!==components.length)throw new Error('component ID 無效或重複。');const content={title:String(s.content?.title||''),subtitle:String(s.content?.subtitle||''),keyPoints,keyPointIds,components},identities=resolveSlideElementIdentities({content}),elementIds=[identities.title,identities.subtitle,...identities.keyPoints,...identities.components];if(elementIds.some(id=>!idPattern.test(id))||new Set(elementIds).size!==elementIds.length)throw new Error('element ID 無效或重複。');return content};
const clean=(source=spec)=>{const rawErrors=source.slides.flatMap(validateSlideMotion),rawBackgroundErrors=source.slides.flatMap(validateSlideBackgroundEffect);if(rawErrors.length||rawBackgroundErrors.length)throw new Error([...rawErrors,...rawBackgroundErrors].join(' '));const cleaned={schemaVersion:'1.0',deckId:String(source.deckId||'deck'),title:String(source.title||'Untitled deck'),language:String(source.language||'zh-Hant'),style:clone(safeStyle),...(Array.isArray(source.claims)?{claims:source.claims.slice(0,100).map(sanitizeClaim).filter(Boolean)}:{}),slides:source.slides.slice(0,15).map((s,i)=>({id:String(s.id||'slide-'+String(i+1).padStart(2,'0')),content:cleanSlideContent(s),composition:{...groupLock.sanitize(s.composition||{},{...s,content:cleanSlideContent(s),composition:s.composition||{}}),primitive:String(s.composition?.primitive||'title-body'),variant:String(s.composition?.variant||'default'),slots:Object.fromEntries(Object.entries(s.composition?.slots||{}).filter(([,v])=>typeof v==='string'&&/^content\.(title|subtitle|keyPoints|components\.[a-z0-9][a-z0-9._-]{0,79})$/.test(v))),...(roleTypography.sanitize(s.composition?.typographyOverrides,s.content)?{typographyOverrides:roleTypography.sanitize(s.composition.typographyOverrides,s.content)}:{}),...(Array.isArray(s.composition?.order)?{order:s.composition.order.map(String)}:{}),...(sanitizeCompositionMotion(s.composition?.motion)?{motion:sanitizeCompositionMotion(s.composition.motion)}:{}),...(sanitizeCompositionBackgroundEffect(s.composition?.backgroundEffect)?{backgroundEffect:sanitizeCompositionBackgroundEffect(s.composition.backgroundEffect)}:{}),...(sanitizeGeometryOverrides(s.composition?.geometryOverrides,cleanSlideContent(s).components)?{geometryOverrides:sanitizeGeometryOverrides(s.composition.geometryOverrides,cleanSlideContent(s).components)}:{})}}))};const errors=cleaned.slides.flatMap(validateSlideMotion),backgroundErrors=cleaned.slides.flatMap(validateSlideBackgroundEffect);if(errors.length||backgroundErrors.length)throw new Error([...errors,...backgroundErrors].join(' '));return cleaned};
const projectCropImages=(root,state,exportClone=false)=>{for(const slide of state.slides){const slideSelector='.slide[data-slide-id="'+CSS.escape(slide.id)+'"]',section=root.matches?.(slideSelector)?root:q(slideSelector,root);if(!section)continue;const ids=resolveSlideElementIdentities(slide);slide.content.components.forEach((c,i)=>{if(c.type!=='image')return;const selector='[data-pptskill-element-id="'+CSS.escape(ids.components[i])+'"] img',img=q(selector,section);if(!img)return;if(exportClone){const live=q('.slide[data-slide-id="'+CSS.escape(slide.id)+'"] '+selector);if(c.crop||c.imageSafety)cropProjection.copyClean(img,live,c);}else cropProjection.sync(img,c);});}if(!exportClone)cropProjection.prune();};
const projectRoleTypography=(root,state)=>{for(const slide of state.slides){const section=q('.slide[data-slide-id="'+CSS.escape(slide.id)+'"]',root);if(!section)continue;for(const id of ['role-title','role-subtitle']){const element=q('[data-pptskill-element-id="'+id+'"]',section);if(element)roleTypography.project(element,slide.composition.typographyOverrides?.[id]?.fontSize)}}};
const refreshStyleControls=()=>{const slide=spec.slides.find(s=>s.id===typographyTarget?.slideId),valid=editMode&&typographyTarget?.slideId===currentId&&!!slide&&(typographyTarget.elementId==='role-title'||!!slide.content.subtitle);let explicit=false;if(valid){try{roleTypography.copyStyle(slide,{operation:'copy-style',target:typographyTarget,value:{}});explicit=true}catch{}}const copy=q('[data-action="copy-style"]'),paste=q('[data-action="paste-style"]');if(copy)copy.disabled=!valid||!explicit;if(paste)paste.disabled=!valid||!styleClipboard};
const clearTypographyTarget=()=>{typographyTarget=null;const toolbar=q('[data-pptskill-typography-toolbar]');if(toolbar)toolbar.hidden=true;refreshStyleControls()};
const setTypographyTarget=target=>{clearTypographyTarget();if(!editMode||!['role-title','role-subtitle'].includes(target.elementId)||target.slideId!==currentId)return;const slide=spec.slides.find(s=>s.id===target.slideId);if(target.elementId==='role-subtitle'&&!slide?.content.subtitle)return;typographyTarget={slideId:target.slideId,elementId:target.elementId};const toolbar=q('[data-pptskill-typography-toolbar]'),input=q('[data-typography-size]');if(toolbar)toolbar.hidden=false;if(input){input.value=String(slide.composition.typographyOverrides?.[target.elementId]?.fontSize??'');input.placeholder='預設'}refreshStyleControls()};
const applyStyle=operation=>{try{if(!editMode||!typographyTarget||typographyTarget.slideId!==currentId)throw new Error('請先選取目前頁面的標題或副標題。');if(composingText)throw new Error('IME 組字尚未完成，暫不可複製或貼上字級。');const request={operation,target:{...typographyTarget},value:{}},slide=spec.slides.find(s=>s.id===currentId);roleTypography.validateStyleTarget(slide,request);if(operation==='copy-style')roleTypography.copyStyle(slide,request);else if(!styleClipboard)throw new Error('請先複製明示字級。');syncText();executeOperation(request);status(operation==='copy-style'?'已複製字級':'已貼上字級')}catch(error){status(error.message)}};
const applyTypography=reset=>{try{if(!editMode||!typographyTarget||typographyTarget.slideId!==currentId)throw new Error('請先選取目前頁面的標題或副標題。');if(composingText)throw new Error('IME 組字尚未完成，暫不可修改字級。');const input=q('[data-typography-size]'),raw=input?.value?.trim(),value=reset?null:raw?Number(raw):NaN,request={operation:'set-typography',target:{...typographyTarget},value:{fontSize:value}};roleTypography.validateRequest(request);syncText();executeOperation(request);if(reset&&input)input.value='';status(reset?'已還原預設字級':'字級已更新')}catch(error){status(error.message)}};
const projectComponentGeometry=(root,state)=>{for(const slide of state.slides){const node=q('.slide[data-slide-id="'+CSS.escape(slide.id)+'"]',root);if(!node)continue;const identities=resolveSlideElementIdentities(slide);for(const element of qa('[data-edit-target]',node)){if(!element.dataset.editTarget?.startsWith('slides.'+slide.id+'.content.components.'))continue;const index=identities.components.indexOf(element.dataset.pptskillElementId);if(index<0){element.remove();continue}const box=getComponentGeometry(slide.composition,slide.content.components[index].id);projectComponentGeometryStyle(element,box);if(box&&element.parentElement!==node)node.append(element)}for(const component of slide.content.components){if(!getComponentGeometry(slide.composition,component.id))continue;const id=identities.components[slide.content.components.indexOf(component)];if(!q('[data-pptskill-element-id="'+CSS.escape(id)+'"]',node)){const template=document.createElement('template');template.innerHTML=renderComponent(component,slide);node.append(template.content.firstElementChild)}}}};
const cleanupComponentInteractionClone=${cleanupComponentInteractionClone.toString()};
const serializeHtml=()=>{if(groupCommitInProgress)throw new Error('群組提交進行中。');if(deletionInProgress)throw new Error('delete-element 進行中，拒絕同步重入。');syncText();const before=spec,revisionBefore=revision,tagBefore=tag.textContent,cleaned=clean();try{spec=cleaned;tag.textContent=JSON.stringify(spec).replaceAll('<','\\u003c');const root=document.documentElement.cloneNode(true);cleanupComponentInteractionClone(root);cleanupEditorChromeFromExportClone(root,editorChromeSelectors,editorPresentationTruthSelectors);projectComponentGeometry(root,spec);projectRoleTypography(root,spec);projectCropImages(root,spec,true);qa('[contenteditable]',root).forEach(el=>el.removeAttribute('contenteditable'));qa('.slide[data-editor-selected]',root).forEach(el=>el.removeAttribute('data-editor-selected'));qa('[data-pptskill-background-layer]',root).forEach(layer=>{layer.replaceChildren();layer.removeAttribute('style');layer.dataset.backgroundState='static'});root.querySelector('body').dataset.editorMode='play';const state=q('[data-editor-status]',root);if(state)state.textContent='可直接播放';const html='<!doctype html>'+root.outerHTML;if(!sameCanonicalValue(before,spec)){revision++;history.clear();refreshHistoryControls()}return html}catch(error){spec=before;revision=revisionBefore;tag.textContent=tagBefore;throw error}};
const prepareExport=()=>{const html=serializeHtml();if(!window.PPTSKILLSizeGuard)throw new Error('Portable size guard 未載入。');return window.PPTSKILLSizeGuard.prepare(html,spec)};
const exportHtml=()=>{const prepared=prepareExport();if(prepared.status==='fail')throw new Error('HTML 超過 20 MiB 上限；請先替換過大的圖片。');return prepared.html};
const download=()=>{try{const prepared=prepareExport();if(prepared.status==='fail'){status('匯出失敗：HTML 超過 20 MiB');return false}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([prepared.html],{type:'text/html;charset=utf-8'}));a.download=(spec.deckId||'deck')+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0);status(prepared.status==='warn'?'已另存 HTML（檔案偏大）':'已另存 HTML');return true}catch(error){status(error.message);return false}};
const move=delta=>{
const i=currentIndex(),to=i+delta;if(i<0||to<0||to>=spec.slides.length)return;
const before=clone(spec),revisionBefore=revision,historyBefore=history.checkpoint(),checkpoint=captureHistoryDom(),controls=captureHistoryControls(),selectionBefore=layout?.getSelectionState(),statusBefore=q('[data-editor-status]')?.textContent;
let node,parent,next,folios=[];
try{
layout?.clearSelection();syncText();node=currentNode();parent=node.parentNode;next=node.nextSibling;
const other=delta<0?node.previousElementSibling:node.nextElementSibling;folios=qa('[data-editor-folio]').map(el=>[el,el.textContent]);
if(delta<0)parent.insertBefore(node,other);else parent.insertBefore(other,node);
[spec.slides[i],spec.slides[to]]=[spec.slides[to],spec.slides[i]];renumber();status('已調整順序');revision++;history.clear();refreshHistoryControls()
}catch(error){
spec=before;revision=revisionBefore;history.restore(historyBefore);
try{if(node?.parentNode===parent&&node.nextSibling!==next)parent.insertBefore(node,next)}catch{}
for(const [el,value]of folios)try{if(el.textContent!==value)el.textContent=value}catch{}
if(historyDomChanged(checkpoint))restoreHistoryDom(checkpoint);
try{layout?.restoreProjection?.()}catch{}
try{layout?.restoreSelection?.(selectionBefore)}catch{}
restoreHistoryControls(controls);if(statusBefore!==undefined)try{status(statusBefore)}catch{}
throw error
}};
const duplicate=()=>{layout?.clearSelection();syncText();if(spec.slides.length>=15){status('最多 15 頁');return}const i=currentIndex(),source=spec.slides[i],copy=clone(source),id=uniqueId(source.id),before=spec,revisionBefore=revision;copy.id=id;const candidate=clone(spec);candidate.slides.splice(i+1,0,copy);for(const claim of candidate.claims||[])if(claim.slideIds.includes(source.id))claim.slideIds.push(id);const node=currentNode(),next=node.cloneNode(true);projectCropImages(next,{slides:[source]},true);retarget(next,source.id,id);const background=q('[data-pptskill-background-layer]',next);if(background){background.replaceChildren();background.removeAttribute('style');background.dataset.backgroundState='static'}try{node.after(next);spec=candidate;projectCropImages(document,spec);if(background)window.PPTSKILLBackground?.init(background);select(id);renumber();next.scrollIntoView({behavior:'smooth',block:'start'});setEdit(editMode);status('已複製投影片');revision++;history.clear()}catch(error){spec=before;revision=revisionBefore;try{if(next.parentNode)next.remove()}catch{}try{if(currentId===id)select(source.id)}catch{}throw error}};
const remove=()=>{layout?.clearSelection();if(spec.slides.length===1){status('至少保留一頁');return}const i=currentIndex(),node=currentNode(),before=spec,revisionBefore=revision,candidate=clone(spec),removed=candidate.slides.splice(i,1)[0];if(Array.isArray(candidate.claims))candidate.claims=candidate.claims.map(c=>({...c,slideIds:c.slideIds.filter(id=>id!==removed.id)})).filter(c=>c.slideIds.length);const next=node.nextElementSibling||node.previousElementSibling,parent=node.parentNode,nextSibling=node.nextSibling,background=q('[data-pptskill-background-layer]',node);if(background)window.PPTSKILLBackground?.destroy(background);try{node.remove();spec=candidate;cropProjection.prune();select(next.dataset.slideId);renumber();next.scrollIntoView({behavior:'smooth',block:'start'});status('已刪除投影片');revision++;history.clear()}catch(error){spec=before;revision=revisionBefore;try{if(node.parentNode!==parent)parent.insertBefore(node,nextSibling)}catch{}throw error}};
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const renderComponentMarkup=(c,slide=spec.slides[currentIndex()])=>{const componentIndex=slide.content.components.findIndex(x=>x.id===c.id),target='slides.'+slide.id+'.content.components.'+c.id,box=getComponentGeometry(slide.composition,c.id),identity=' data-pptskill-element-id="'+esc(resolveSlideElementIdentities(slide).components[componentIndex])+'"',geometry=box?' data-pptskill-geometry="canonical" style="'+componentGeometryStyle(box)+'"':'';if(c.type==='image')return '<figure class="asset image-asset" data-effect-role="image"'+identity+' data-edit-target="'+esc(target)+'"'+geometry+'><img src="'+esc(c.dataUri)+'" alt="'+esc(c.alt)+'" style="object-fit:'+(c.crop||c.imageSafety?'contain':c.fit||'contain')+'"></figure>';if(c.type==='text')return '<blockquote class="asset text-asset" data-effect-role="visualAnchor" data-edit-kind="text"'+identity+' data-edit-target="'+esc(target)+'"'+geometry+'>'+esc(c.text)+'</blockquote>';if(c.type==='citation')return '<p class="asset citation-asset" data-edit-kind="text"'+identity+' data-edit-target="'+esc(target)+'"'+geometry+'>'+(c.url?'<a href="'+esc(c.url)+'">'+esc(c.label)+'</a>':esc(c.label))+'</p>';if(c.type==='table')return '<div class="asset table-asset" data-effect-role="diagram"'+identity+' data-edit-target="'+esc(target)+'"'+geometry+'><table><thead><tr>'+c.headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+c.rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';if(c.type==='chart'){const max=Math.max(1,...c.series.flatMap(s=>s.values));return '<div class="asset chart-asset" data-effect-role="diagram"'+identity+' data-edit-target="'+esc(target)+'"'+geometry+'>'+c.series.map(s=>'<section><b>'+esc(s.name)+'</b>'+s.values.map((v,i)=>'<div class="bar-row"><span>'+esc(c.labels[i]||'')+'</span><i style="--bar:'+Math.max(0,Math.min(100,Math.round(v/max*100)))+'%"></i><em>'+esc(v)+'</em></div>').join('')+'</section>').join('')+'</div>'}return ''};
const renderComponent=(component,slide)=>renderComponentMarkup(component,slide).replace(/data-effect-role="([^"]+)"/g,(match,role)=>match+' data-effect-treatment="'+esc(componentTreatments[role]||'none')+'"');
const replaceComponent=component=>{const target='slides.'+currentId+'.content.components.'+component.id,root=currentNode(),matches=qa('[data-edit-target]',root).filter(el=>el.dataset.editTarget===target),old=matches[0];if(matches.length!==1||!old.isConnected||old.closest('.slide')!==root)throw new Error('component DOM target 已移除或不唯一。');const template=document.createElement('template');template.innerHTML=renderComponent(component);const next=template.content.firstElementChild;if(old.dataset.effectTreatment)next.dataset.effectTreatment=old.dataset.effectTreatment;const img=q('img',next),oldImg=q('img',old),checkpoint=oldImg&&cropProjection.checkpoint(oldImg),imgStyle=oldImg?.getAttribute('style'),frameStyle=old.getAttribute('style');try{old.replaceWith(next);if(img&&component.type==='image')cropProjection.sync(img,component);setEdit(editMode);if(oldImg)cropProjection.release(oldImg);}catch(error){try{if(img)cropProjection.release(img);}catch{}try{if(next.parentNode)next.replaceWith(old)}catch{}if(oldImg){try{if(imgStyle===null)oldImg.removeAttribute('style');else oldImg.setAttribute('style',imgStyle);cropProjection.rollback(oldImg,checkpoint)}catch{}}try{if(frameStyle===null)old.removeAttribute('style');else old.setAttribute('style',frameStyle)}catch{}throw error;}cropDialog?.close();layout?.clearSelection()};
const updateMetricPoint=(slideId,slide,index,point)=>{const root=q('.slide[data-slide-id="'+CSS.escape(slideId)+'"]'),article=q('.metric-cards article[data-metric-index="'+index+'"]',root);if(!article)return;const parts=String(point).split('｜'),value=parts.shift(),label=parts.join('｜'),target=slide.composition.motion?.targets.find(t=>t.ref==='content.keyPoints.'+index),valueNode=q('.metric-value',article),labelNode=q('p',article);if(target){const parsed=parseMotionMetric(point),flow=q('[data-pptskill-odometer]',article);if(!parsed||!flow)throw new Error('motion metric DOM 與 canonical content 失配。');const spans=qa(':scope > span',valueNode);if(spans[0])spans[0].textContent=parsed.numberPrefix;if(spans[1])spans[1].textContent=parsed.numberSuffix;flow.dataset.to=String(parsed.finalValue);flow.dataset.finalDisplay=parsed.numericDisplay;flow.dataset.useGrouping=String(parsed.format.useGrouping);flow.dataset.fractionDigits=String(parsed.format.maximumFractionDigits);flow.animated=false;if(typeof flow.update==='function')flow.update(parsed.finalValue,parsed.format);else flow.textContent=parsed.numericDisplay}else if(valueNode)valueNode.textContent=value;if(labelNode)labelNode.textContent=label};
// S14 先驗 candidate 與唯一 DOM，再原地提交；失敗不觸碰 gesture／revision。
const editComponentText=o=>{
if(composingText)throw new Error('IME 組字尚未完成，暫不可修改文字元件。');
const slide=spec.slides.find(s=>s.id===o.target.slideId),component=editTextComponent(slide,o.target.elementId,o.value);
const candidate=clone(spec),next=editTextComponent(candidate.slides.find(s=>s.id===slide.id),o.target.elementId,o.value);next.text=o.value;
const cleaned=clean(candidate);if(!sameCanonicalValue(candidate,cleaned))throw new Error('edit-text candidate 清理不得改變其他欄位。');
const roots=qa('.slide').filter(n=>n.dataset.slideId===slide.id),root=roots[0],target='slides.'+slide.id+'.content.components.'+component.id;
if(roots.length!==1||!root.isConnected||root.closest('.deck')!==q('.deck'))throw new Error('edit-text slide DOM 必須唯一 connected。');
const nodes=qa('[data-pptskill-element-id]',root).filter(n=>n.dataset.pptskillElementId===o.target.elementId),targets=qa('[data-edit-target]',root).filter(n=>n.dataset.editTarget===target),node=nodes[0];
if(nodes.length!==1||targets.length!==1||targets[0]!==node||!node.isConnected||node.closest('.slide')!==root||node.dataset.editKind!=='text'||node.textContent!==component.text||node.children.length||node.childNodes&&(node.childNodes.length!==1||node.childNodes[0].nodeType!==3))throw new Error('edit-text text DOM 與 canonical identity／文字失配。');
if(component.text===o.value)return spec;
const previous=node.textContent,children=node.childNodes?[...node.childNodes]:null;
let proto=Object.getPrototypeOf(node),setter;while(proto&&!setter){setter=Object.getOwnPropertyDescriptor(proto,'textContent')?.set;proto=Object.getPrototypeOf(proto)}
try{node.textContent=o.value;if(node.textContent!==o.value)throw new Error('edit-text DOM projection 失敗。')}
catch(error){if(children)node.replaceChildren(...children);else setter.call(node,previous);throw error}
spec=cleaned;revision++;layout?.cancel();layout?.clearSelection();return spec
};
// 刪除先驗 canonical candidate 與真實節點；DOM removal 的 before/after throw 均回原位置。
const deleteComponent=o=>{
if(pendingAssetOperations||insertionBusy||imagePickerOpen||textInsertionBusy||composingText)throw new Error('delete-element：圖片或文字提交進行中。');
deletionInProgress=true;
try{
const slides=spec.slides.filter(s=>s.id===o.target.slideId);if(slides.length!==1)throw new Error('delete-element 找不到唯一 canonical slide target。');
const slide=slides[0],candidate=clone(spec),next=candidate.slides.find(s=>s.id===slide.id),{component}=componentDeletion.update(next,o),cleaned=clean(candidate);
if(!sameCanonicalValue(candidate,cleaned))throw new Error('delete-element candidate 清理不得改變其他欄位。');
const decks=qa('.deck'),roots=qa('.slide').filter(n=>n.dataset.slideId===slide.id),root=roots[0];
if(decks.length!==1||!decks[0].isConnected||roots.length!==1||!root.isConnected||root.closest('.deck')!==decks[0])throw new Error('delete-element slide DOM 必須唯一 connected。');
const target='slides.'+slide.id+'.content.components.'+component.id,nodes=qa('[data-pptskill-element-id]',root).filter(n=>n.dataset.pptskillElementId===o.target.elementId),targets=qa('[data-edit-target]',root).filter(n=>n.dataset.editTarget===target),node=nodes[0];
if(nodes.length!==1||targets.length!==1||targets[0]!==node||!node.isConnected||node.closest('.slide')!==root)throw new Error('delete-element DOM 與 canonical identity 失配。');
if(component.type==='text'){
if(node.dataset.editKind!=='text'||node.textContent!==component.text||node.children.length||node.childNodes&&[...node.childNodes].some(child=>child.nodeType!==3))throw new Error('delete-element text DOM 與 canonical 失配。');
}else{
const images=qa('img',node),img=images[0];
if(node.dataset.editKind||images.length!==1||node.children.length!==1||img.parentNode!==node||node.textContent.trim()||img.getAttribute('src')!==component.dataUri||img.getAttribute('alt')!==component.alt||img.style.getPropertyValue('object-fit')!==cropProjection.expectedFit(img,component))throw new Error('delete-element image DOM 與 canonical 失配。');
}
const parent=node.parentNode,nextSibling=node.nextSibling,insertBefore=parent.insertBefore;
try{node.remove();if(node.parentNode||node.isConnected)throw new Error('delete-element DOM removal 未完成。')}
catch(error){if(node.parentNode!==parent||node.nextSibling!==nextSibling)insertBefore.call(parent,node,nextSibling);throw error}
spec=cleaned;revision++;
if(editingComponentId===component.id&&currentId===slide.id)editingComponentId='';
if(pendingTextInsertion?.mode==='edit'&&pendingTextInsertion.slideId===slide.id&&pendingTextInsertion.elementId===o.target.elementId)closeInsertText();
cropProjection.prune();cropDialog?.invalidate();layout?.cancel('delete-element');layout?.clearSelection();refreshSelectedImage('refresh');return spec
}finally{deletionInProgress=false}
};
// 先建立並驗證candidate；DOM效果期間擋重入，最後才交給既有revision。
const commitGroup=o=>{
if(pendingAssetOperations||pendingTextInsertion||textInsertionBusy||textInsertionComposing||insertionBusy||imagePickerOpen||composingText||cropDialog?.isOpen()||q('[data-component-dialog]')?.open||layout?.getState().gesturing)throw new Error('編輯或拖曳尚未完成，暫不可修改群組／鎖定。');
const before=spec,revisionBefore=revision,candidate=clone(spec),slide=candidate.slides.find(s=>s.id===o.target.slideId);
if(candidate.slides.filter(s=>s.id===o.target.slideId).length!==1)throw new Error('群組 canonical slide 必須唯一。');
groupLock.update(slide,o);const cleaned=clean(candidate);if(!sameCanonicalValue(candidate,cleaned))throw new Error('群組清理不得改變其他欄位。');if(sameCanonicalValue(before,cleaned))return spec;
const roots=qa('.slide').filter(n=>n.dataset.slideId===o.target.slideId),root=roots[0];if(roots.length!==1||!root?.isConnected||root.closest('.deck')!==q('.deck'))throw new Error('群組缺少唯一連接中的DOM slide。');
const nodes=o.target.elementIds.map(id=>{const found=qa('[data-pptskill-element-id]',root).filter(n=>n.dataset.pptskillElementId===id);if(found.length!==1||!found[0].isConnected||found[0].closest('.slide')!==root)throw new Error('群組DOM target不唯一或已移除。');const node=found[0],component=groupLock.component(slide,id);if(node.dataset.editTarget!=='slides.'+slide.id+'.content.components.'+component.id)throw new Error('群組DOM identity不符。');return {node,component,style:node.getAttribute('style'),geometry:node.getAttribute('data-pptskill-geometry')};});
groupCommitInProgress=true;
try{if(['move-group','resize-group'].includes(o.operation))for(const {node,component} of nodes)projectComponentGeometryStyle(node,slide.composition.geometryOverrides[component.id]);spec=cleaned;markChanged(before,spec);layout?.refresh?.();refreshSelectedImage('refresh');return spec}
catch(error){spec=before;revision=revisionBefore;try{for(const {node,style,geometry} of nodes)for(const [key,value] of [['style',style],['data-pptskill-geometry',geometry]]){if(value===null)node.removeAttribute(key);else if(node.getAttribute(key)!==value)node.setAttribute(key,value)}}catch{}try{layout?.restoreProjection?.()}catch{}throw error}
finally{groupCommitInProgress=false}
};
const executeOperationCore=request=>{const o=validateOperationRequest(request);if(groupLock.names.includes(o.operation))return commitGroup(o);const groupSlide=spec.slides.find(s=>s.id===o.target.slideId);if(groupSlide)groupLock.assertMutable(groupSlide,o.operation,o.target.elementIds||[o.target.elementId]);if(o.operation==='delete-element')return deleteComponent(o);if(o.operation==='insert-element'){
const candidate=clone(spec),slide=candidate.slides.find(s=>s.id===o.target.slideId);if(!slide)throw new Error('找不到 slide。');
const {component,elementId}=imageInsertion.update(slide,o),cleaned=clean(candidate),candidateSlide=cleaned.slides.find(s=>s.id===slide.id);
const roots=qa('.slide[data-slide-id="'+CSS.escape(slide.id)+'"]'),root=roots[0];if(roots.length!==1)throw new Error('insert-element slide DOM 必須唯一存在。');
const target='slides.'+slide.id+'.content.components.'+component.id;
if(qa('[data-pptskill-element-id]',root).some(node=>node.dataset.pptskillElementId===elementId)||qa('[data-edit-target]',root).some(node=>node.dataset.editTarget===target))throw new Error('insert-element DOM identity 已存在。');
const template=document.createElement('template');template.innerHTML=renderComponent(component,candidateSlide);const node=template.content.firstElementChild;
if(!node||node.dataset.pptskillElementId!==elementId||(component.type==='image'?!q('img',node):node.dataset.editKind!=='text'))throw new Error('insert-element detached DOM 無效。');
if(component.type==='image')assetReplacement.project(q('img',node),component);else node.contentEditable='false';projectComponentGeometryStyle(node,getComponentGeometry(candidateSlide.composition,component.id));
// append 可能先插入再 throw；此時只移除本次 detached root，既有 DOM／gesture 完全保留。
try{root.append(node)}catch(error){node.remove();throw error}
spec=cleaned;revision++;layout?.cancel();layout?.clearSelection();return spec}
if(['replace-asset','crop-image','reset-image-crop'].includes(o.operation)){

const candidate=clone(spec),slide=candidate.slides.find(s=>s.id===o.target.slideId);if(!slide)throw new Error('找不到 slide。');
const updated=o.operation==='replace-asset'?assetReplacement.update(slide,o,resolveSlideElementIdentities(slide)):imageCrop.update(slide,o,resolveSlideElementIdentities(slide));
const root=q('.slide[data-slide-id="'+CSS.escape(o.target.slideId)+'"]'),img=root&&q('[data-pptskill-element-id="'+CSS.escape(o.target.elementId)+'"] img',root);if(!img)throw new Error('圖片 DOM target 已移除。');
const before=spec,revisionBefore=revision,projectionBefore=cropProjection.checkpoint(img),frameStyle=img.parentElement.getAttribute('style'),attributes=['src','alt','style'].map(key=>[key,img.getAttribute(key)]);
cropCommitInProgress=Boolean(o.operation!=='replace-asset'||updated.crop||updated.imageSafety);
try{spec=candidate;const cleaned=clean(),component=cleaned.slides.find(s=>s.id===o.target.slideId).content.components.find(c=>c.id===updated.id);spec=cleaned;
if(!sameCanonicalValue(before,spec)){if(o.operation==='replace-asset')assetReplacement.project(img,component);cropProjection.sync(img,component);}markChanged(before,spec);refreshSelectedImage('refresh');if(imageCrop.state(component)==='pending')status('裁切待重新確認：目前完整顯示原圖。');return spec}catch(error){spec=before;revision=revisionBefore;cropProjection.rollback(img,projectionBefore);for(const [key,value] of attributes){if(value===null)img.removeAttribute(key);else if(img.getAttribute(key)!==value)img.setAttribute(key,value)}if(frameStyle===null)img.parentElement.removeAttribute('style');else img.parentElement.setAttribute('style',frameStyle);throw error}finally{cropCommitInProgress=false}}
if(o.operation==='copy-style'||o.operation==='paste-style'){if(composingText)throw new Error('IME 組字尚未完成，暫不可複製或貼上字級。');if(!editMode||!typographyTarget||currentId!==o.target.slideId||typographyTarget.slideId!==o.target.slideId||typographyTarget.elementId!==o.target.elementId)throw new Error('請先選取目前頁面的標題或副標題。');const slide=spec.slides.find(s=>s.id===o.target.slideId);roleTypography.validateStyleTarget(slide,o);if(o.operation==='copy-style'){styleClipboard=roleTypography.copyStyle(slide,o);refreshStyleControls();return spec}if(!styleClipboard)throw new Error('請先複製明示字級。');return executeOperation({operation:'set-typography',target:o.target,value:{...styleClipboard}})}if(o.operation==='set-typography'){if(composingText)throw new Error('IME 組字尚未完成，暫不可修改字級。');const candidate=clone(spec),slide=candidate.slides.find(s=>s.id===o.target.slideId);if(!slide)throw new Error('找不到 slide。');roleTypography.update(slide,o);const before=spec;try{spec=candidate;spec=clean();projectRoleTypography(document,spec);markChanged(before,spec);if(typographyTarget)setTypographyTarget(typographyTarget);return spec}catch(error){spec=before;throw error}}if(!operationDescriptors[o.operation])throw new Error('不支援的 operation。');const slide=spec.slides.find(s=>s.id===o.target.slideId);if(!slide)throw new Error('找不到 slide。');const identities=resolveSlideElementIdentities(slide);if(o.operation==='align-selection'||o.operation==='distribute-selection'){const before=clone(spec);try{const componentIds=o.target.elementIds.map(elementId=>{const index=identities.components.indexOf(elementId);if(index<0)throw new Error(o.operation+' 找不到 component element：'+elementId);return slide.content.components[index].id});if(o.operation==='align-selection')alignComponentGeometries(slide,componentIds,o.value.alignment);else distributeComponentGeometries(slide,componentIds,o.value.distribution,o.target.elementIds);spec=clean();projectComponentGeometry(document,spec);markChanged(before,spec);return spec}catch(error){spec=before;throw error}}const pointIndex=identities.keyPoints.indexOf(o.target.elementId),role=o.target.elementId===roleElementIds.title?'title':o.target.elementId===roleElementIds.subtitle?'subtitle':pointIndex>=0?'keyPoint':identities.components.includes(o.target.elementId)?'component':null;if(!role)throw new Error('找不到 element。');if(!operationDescriptors[o.operation].allowedTargetRoles.includes(role))throw new Error('operation 不支援 target role：'+role);if(o.operation==='edit-text'&&role==='component')return editComponentText(o);const before=clone(spec);try{if(role==='component')updateComponentGeometry(slide,slide.content.components[identities.components.indexOf(o.target.elementId)].id,o.operation,o.value);else if(role==='title'||role==='subtitle')slide.content[role]=o.value;else slide.content.keyPoints[pointIndex]=o.value;spec=clean();const cleanedSlide=spec.slides.find(s=>s.id===o.target.slideId),root=q('.slide[data-slide-id="'+CSS.escape(o.target.slideId)+'"]'),element=q('[data-pptskill-element-id="'+CSS.escape(o.target.elementId)+'"]',root);if(role==='component'){projectComponentGeometry(document,spec)}else if(role==='keyPoint'&&element?.matches('.metric-cards article'))updateMetricPoint(o.target.slideId,cleanedSlide,pointIndex,o.value);else if(element)element.textContent=o.value;markChanged(before,spec);refreshStyleControls();return spec}catch(error){spec=before;throw error}};
let historyControlsUpdating=false;
const historyBusy=()=>Boolean(historyControlsUpdating||pasteInputOwned(document.activeElement)||document.activeElement?.closest?.('dialog')||composingText||textInsertionComposing||pendingTextInsertion||textInsertionBusy||insertionBusy||imagePickerOpen||pendingAssetOperations||deletionInProgress||cropCommitInProgress||groupCommitInProgress||cropDialog?.isOpen()||q('[data-component-dialog]')?.open||layout?.getState().gesturing);
const historyMode=()=>Boolean(editMode||layout?.getState().enabled);
const captureHistoryControls=()=>['undo','redo'].map(direction=>{const button=q('[data-action="'+direction+'"]');return button&&[button,button.disabled,button.title]});
const restoreHistoryControls=saved=>{const previous=historyControlsUpdating;historyControlsUpdating=true;try{for(const item of saved)if(item){const [button,disabled,title]=item;try{button.disabled=disabled;button.title=title}catch{}}}finally{historyControlsUpdating=previous}};
const refreshHistoryControls=()=>{if(historyControlsUpdating)return;const state=history.state(),blocked=!historyMode()||historyBusy()||spec.slides.filter(s=>s.id===currentId).length!==1||qa('.slide').filter(s=>s.dataset.slideId===currentId).length!==1;historyControlsUpdating=true;try{for(const [direction,enabled]of [['undo',state.canUndo],['redo',state.canRedo]]){const button=q('[data-action="'+direction+'"]');if(button){button.disabled=blocked||!enabled;button.title=state.oversized?'歷史超過 64 MiB，無法保留':button.disabled?'目前無法'+(direction==='undo'?'復原':'重做'):''}}}finally{historyControlsUpdating=false}};
const projectHistoryState=(state,previous)=>{
  let geometryChanged=false;
  for(const slide of state.slides){
    const old=previous.slides.find(item=>item.id===slide.id),roots=qa('.slide').filter(node=>node.dataset.slideId===slide.id),root=roots[0];
    if(!old||roots.length!==1||!root.isConnected||root.closest('.deck')!==q('.deck'))throw new Error('history slide target 已失效。');
    const identities=resolveSlideElementIdentities(slide);
    const setText=(id,value)=>{const nodes=qa('[data-pptskill-element-id]',root).filter(node=>node.dataset.pptskillElementId===id);if(nodes.length!==1)throw new Error('history text target 已失效。');if(nodes[0].textContent!==value)nodes[0].textContent=value};
    if(old.content.title!==slide.content.title)setText(identities.title,slide.content.title);
    if(old.content.subtitle!==slide.content.subtitle)setText(identities.subtitle,slide.content.subtitle);
    slide.content.keyPoints.forEach((value,i)=>{if(old.content.keyPoints[i]===value)return;const node=qa('[data-pptskill-element-id]',root).find(item=>item.dataset.pptskillElementId===identities.keyPoints[i]);if(node?.matches('.metric-cards article'))updateMetricPoint(slide.id,slide,i,value);else setText(identities.keyPoints[i],value)});
    slide.content.components.forEach((component,i)=>{if(component.type==='text'&&old.content.components[i]?.text!==component.text)setText(identities.components[i],component.text)});
    if(!sameCanonicalValue(old.composition.geometryOverrides,slide.composition.geometryOverrides))geometryChanged=true;
  }
  if(geometryChanged)projectComponentGeometry(document,state)
};
const captureHistoryDom=()=>{const deck=q('.deck'),nodes=deck?qa('*',deck):[];return{nodes:new Set(nodes),saved:nodes.map(node=>[node,node.parentNode,node.nextSibling,node.children?.length?null:node.textContent,['style','data-pptskill-geometry','data-to','data-final-display','data-use-grouping','data-fraction-digits'].map(key=>[key,node.getAttribute(key)])])}};
const historyDomChanged=checkpoint=>{const deck=q('.deck');if(!deck)return false;const nodes=qa('*',deck);if(nodes.length!==checkpoint.nodes.size||nodes.some(node=>!checkpoint.nodes.has(node)))return true;return checkpoint.saved.some(([node,parent,,value,attributes])=>node.parentNode!==parent||(value!==null&&node.textContent!==value)||attributes.some(([key,old])=>node.getAttribute(key)!==old))};
const restoreHistoryDom=checkpoint=>{const deck=q('.deck');if(!deck)return;for(const node of qa('*',deck))if(!checkpoint.nodes.has(node))try{node.remove()}catch{}for(const [node,parent,next,value,attributes]of checkpoint.saved){try{if(node.parentNode!==parent&&parent?.isConnected)parent.insertBefore(node,next?.parentNode===parent?next:null);if(value!==null&&node.textContent!==value)node.textContent=value;for(const [key,old]of attributes){if(old===null){if(node.getAttribute(key)!==null)node.removeAttribute(key)}else if(node.getAttribute(key)!==old)node.setAttribute(key,old)}}catch{}}};
const replayHistory=direction=>{if(!historyMode()||historyBusy())return false;if(spec.slides.filter(s=>s.id===currentId).length!==1||qa('.slide').filter(s=>s.dataset.slideId===currentId).length!==1)return false;const before=spec,revisionBefore=revision,checkpoint=captureHistoryDom(),historyBefore=history.checkpoint(),controls=captureHistoryControls(),selectionBefore=layout?.getSelectionState(),statusBefore=q('[data-editor-status]')?.textContent;try{const changed=history.replay(direction,value=>{const next=clean(value);if(!sameCanonicalValue(next,value))throw new Error('history snapshot 清理結果失配。');spec=next;projectHistoryState(next,before);layout?.refresh?.();clearTypographyTarget();refreshSelectedImage('refresh');revision++});if(changed){refreshHistoryControls();status(direction==='undo'?'已復原':'已重做')}return changed}catch(error){spec=before;revision=revisionBefore;history.restore(historyBefore);restoreHistoryDom(checkpoint);try{layout?.restoreSelection?.(selectionBefore)}catch{}restoreHistoryControls(controls);if(statusBefore!==undefined)try{status(statusBefore)}catch{}throw error}}
const executeOperation=(request,afterCommit=()=>{})=>{const o=validateOperationRequest(request);const before=clone(spec),revisionBefore=revision,checkpoint=captureHistoryDom(),historyBefore=history.checkpoint(),controls=captureHistoryControls(),selectionBefore=layout?.getSelectionState(),statusBefore=q('[data-editor-status]')?.textContent;try{const result=executeOperationCore(request);if(!sameCanonicalValue(before,spec)){history.record(before,clone(spec),operationDescriptors[o.operation]?.undoable===true);refreshHistoryControls()}afterCommit();return result}catch(error){spec=before;revision=revisionBefore;history.restore(historyBefore);const changed=historyDomChanged(checkpoint);if(changed)restoreHistoryDom(checkpoint);try{if(changed)layout?.restoreProjection?.();if(selectionBefore&&JSON.stringify(layout?.getSelectionState())!==JSON.stringify(selectionBefore))layout?.restoreSelection?.(selectionBefore)}catch{}restoreHistoryControls(controls);if(statusBefore!==undefined)try{status(statusBefore)}catch{}throw error}}
const applyPatch=p=>{if(groupCommitInProgress)throw new Error('群組提交進行中。');if(cropCommitInProgress)throw new Error('裁切提交進行中。');if(deletionInProgress)throw new Error('delete-element 進行中，拒絕同步重入。');if(!p||p.slideId!==currentId)throw new Error('patch 必須指向目前選取的 slide。');const slide=spec.slides[currentIndex()];const lockedPatch=/^content\.components\.([a-z0-9][a-z0-9._-]{0,79})$/i.exec(p.region);if(lockedPatch){const index=slide.content.components.findIndex(c=>c.id===lockedPatch[1]);groupLock.assertMutable(slide,'edit-text',[resolveSlideElementIdentities(slide).components[index]])}if(p.region==='content.title'||p.region==='content.subtitle')return executeOperation({operation:'edit-text',target:{slideId:p.slideId,elementId:roleElementIds[p.region.slice(8)]},value:String(p.value)});const m=/^content\.keyPoints\.(\d+)$/.exec(p.region);if(m){const i=Number(m[1]);if(i>=slide.content.keyPoints.length)throw new Error('keyPoint index 超出範圍。');return executeOperation({operation:'edit-text',target:{slideId:p.slideId,elementId:resolveSlideElementIdentities(slide).keyPoints[i]},value:String(p.value)})}syncText();const c=/^content\.components\.([a-z0-9][a-z0-9._-]{0,79})$/i.exec(p.region);if(c&&p.value&&typeof p.value==='object'){const i=slide.content.components.findIndex(x=>x.id===c[1]);if(i<0)throw new Error('找不到 component。');const before=clone(spec),revisionBefore=revision,checkpoint=captureHistoryDom(),historyBefore=history.checkpoint(),controls=captureHistoryControls(),selectionBefore=layout?.getSelectionState();slide.content.components[i]={...slide.content.components[i],...clone(p.value),id:c[1],type:slide.content.components[i].type};try{const cleaned=clean(),component=cleaned.slides[currentIndex()].content.components.find(x=>x.id===c[1]);if(!component)throw new Error('元件 patch 未通過 sanitizer。');spec=cleaned;if(!sameCanonicalValue(before,spec)){replaceComponent(component);revision++;history.clear();refreshHistoryControls()}return spec}catch(error){spec=before;revision=revisionBefore;history.restore(historyBefore);if(historyDomChanged(checkpoint))restoreHistoryDom(checkpoint);try{if(selectionBefore&&JSON.stringify(layout?.getSelectionState())!==JSON.stringify(selectionBefore))layout?.restoreSelection?.(selectionBefore)}catch{}restoreHistoryControls(controls);throw error}}throw new Error('patch region 不在 allowlist。')};
const openComponentEditor=()=>{if(cropDialog?.isOpen())return;syncText();const component=spec.slides[currentIndex()].content.components[0];if(!component){status('此頁沒有支援元件');return}editingComponentId=component.id;q('[data-component-json]').value=JSON.stringify(component,null,2);q('[data-component-dialog]').showModal()};
const applyComponentEditor=()=>{try{const value=JSON.parse(q('[data-component-json]').value);applyPatch({slideId:currentId,region:'content.components.'+editingComponentId,value});q('[data-component-dialog]').close();status('元件已更新')}catch(error){status(error.message)}};
document.addEventListener('click',e=>{const slide=e.target.closest?.('.slide');if(slide)select(slide.dataset.slideId);const action=e.target.closest?.('[data-action]')?.dataset.action;if(!action)return;if(action==='crop-selected-image')cropDialog.open();if(action==='confirm-crop')cropDialog.submit(false);if(action==='reset-image-crop')cropDialog.submit(true);if(action==='cancel-crop')cropDialog.close();if(action==='insert-text')openInsertText();if(action==='edit-selected-text')openEditText();if(action==='submit-insert-text')submitInsertText();if(action==='cancel-insert-text'&&!textInsertionComposing)closeInsertText();if(action==='insert-image')openInsertImagePicker();if(action==='replace-selected-image')openSelectedImagePicker();if(action==='set-selected-image-fit')setSelectedImageFit(e.target.closest('[data-image-fit]')?.dataset.imageFit);if(action==='copy-style'||action==='paste-style')applyStyle(action);if(action==='apply-typography'||action==='reset-typography')applyTypography(action==='reset-typography');if(action==='edit')setEdit(!editMode);if(action==='edit-component')openComponentEditor();if(action==='apply-component')applyComponentEditor();if(action==='cancel-component')q('[data-component-dialog]').close();if(action==='move-up')move(-1);if(action==='move-down')move(1);if(action==='duplicate')duplicate();if(action==='delete')remove();if(action==='undo'||action==='redo'){refreshHistoryControls();if(!q('[data-action="'+action+'"]')?.disabled)try{replayHistory(action)}catch(error){status(error.message)}}if(action==='save')download()});
const textEventRoot=document.body?.addEventListener?document.body:document;
textEventRoot.addEventListener('dblclick',e=>{
const target=resolveDirectTextTarget(e.target);if(target){select(target.slideId);setEdit(true);target.element.contentEditable='true';target.element.focus?.();setTypographyTarget(target);e.preventDefault?.();return}
// component 僅將目前 canonical node 的事件送往 S16；不沿舊 selection 誤開其他物件。
if(e.defaultPrevented||e.isComposing||e.shiftKey||e.ctrlKey||e.altKey||e.metaKey||(e.button!==undefined&&e.button!==0)||editMode||composingText||textInsertionComposing)return;
const component=selectedTextTarget();if(!component||e.target!==component.node||component.node.closest('[data-pptskill-editor-chrome],[data-pptskill-editor],.pptskill-editor,.moveable-control-box,.selecto-selection'))return;
openEditText();if(textInsertionDialog.open)e.preventDefault?.()
});
textEventRoot.addEventListener('focusin',e=>{const target=resolveDirectTextTarget(e.target);if(!editMode)return;if(target){select(target.slideId);setTypographyTarget(target)}else if(!e.target.closest?.('.pptskill-editor,[data-pptskill-typography-toolbar]'))clearTypographyTarget()});
textEventRoot.addEventListener('compositionstart',e=>{const target=resolveDirectTextTarget(e.target);if(editMode&&target)composingText=target.element});
textEventRoot.addEventListener('compositionend',e=>{const target=resolveDirectTextTarget(e.target);if(!target||composingText!==target.element)return;composingText=null;commitTextElement(target.element);status('文字已更新')});
textEventRoot.addEventListener('focusout',e=>{const target=resolveDirectTextTarget(e.target);if(!editMode||!target||composingText===target.element)return;commitTextElement(target.element)});
textEventRoot.addEventListener('keydown',e=>{if(e.key!=='Escape'||e.isComposing)return;const target=resolveDirectTextTarget(e.target);if(!editMode||!target||composingText===target.element)return;restoreTextElement(target.element);e.preventDefault();e.stopImmediatePropagation?.();status('已取消文字變更')});
const replaceImageFile=async(file,explicitTarget)=>{
if(deletionInProgress)throw new Error('delete-element 進行中，拒絕同步重入。');pendingAssetOperations++;refreshHistoryControls();try{
if(!file)return null;if(!window.PPTSKILLAssets)throw new Error('Asset optimizer 未載入。');
let target;if(explicitTarget===undefined){const slide=spec.slides[currentIndex()],index=slide.content.components.findIndex(c=>c.type==='image');if(index<0)throw new Error('此頁沒有可替換圖片。');target={slideId:slide.id,elementId:resolveSlideElementIdentities(slide).components[index]}}else target=assetReplacement.validateTarget(explicitTarget);
const requireImage=()=>{const slide=spec.slides.find(s=>s.id===target.slideId),index=slide?resolveSlideElementIdentities(slide).components.indexOf(target.elementId):-1;if(!slide||slide.content.components[index]?.type!=='image')throw new Error('圖片元件已移除。')};
requireImage();status('正在最佳化圖片…');const result=await window.PPTSKILLAssets.optimizeFile(file);requireImage();
const message=result.warnings.length?'圖片已替換（保留大型 GIF）':result.optimized?'圖片已最佳化並替換':'圖片已替換';
executeOperation({operation:'replace-asset',target,value:{dataUri:result.dataUri}});const changed=selectedImageComponent(target);status(changed&&imageCrop.state(changed)==='pending'?'裁切待重新確認：目前完整顯示原圖。':message);return result}finally{pendingAssetOperations--;refreshHistoryControls()}};
const insertImageFile=async(file,options)=>{
if(deletionInProgress)throw new Error('delete-element 進行中，拒絕同步重入。');pendingAssetOperations++;refreshHistoryControls();try{
if(!file)return null;if(typeof window.PPTSKILLAssets?.optimizeFile!=='function')throw new Error('Asset optimizer 未載入。');
const request=imageInsertion.snapshotFileOptions(options);imageInsertion.preflight(spec.slides.find(s=>s.id===request.target.slideId),request);
const result=await window.PPTSKILLAssets.optimizeFile(file);
if(!result||typeof result!=='object'||typeof result.dataUri!=='string'||!Array.isArray(result.warnings)||result.warnings.some(w=>typeof w!=='string')||typeof result.optimized!=='boolean')throw new Error('Asset optimizer result 無效。');
const message=result.warnings.length?'圖片已插入（保留大型 GIF）':result.optimized?'圖片已最佳化並插入':'圖片已插入';
request.value.component.dataUri=result.dataUri;executeOperation(request);status(message);return result}finally{pendingAssetOperations--;refreshHistoryControls()}};
const selectedImageInput=q('#pptskill-selected-image-input');
const openSelectedImagePicker=()=>{if(cropDialog?.isOpen()||pendingTextInsertion||imagePickerOpen)return;const target=selectedImageTarget();if(!target||!selectedImageInput)return;layout.cancel('picker');pendingImageTarget=target;imagePickerOpen='replace';refreshSelectedImage('refresh');try{selectedImageInput.click()}catch(error){pendingImageTarget=null;imagePickerOpen=false;refreshSelectedImage('refresh');status(error.message)}};
selectedImageInput?.addEventListener('cancel',()=>{selectedImageInput.value='';if(imagePickerOpen!=='replace')return;pendingImageTarget=null;imagePickerOpen=false;selectedImageInput.value='';refreshSelectedImage('refresh')});
selectedImageInput?.addEventListener('change',async e=>{if(imagePickerOpen!=='replace'){selectedImageInput.value='';return}const target=pendingImageTarget,file=e.target.files?.[0];pendingImageTarget=null;imagePickerOpen=false;e.target.value='';refreshSelectedImage('refresh');if(!file)return;if(!target){status('圖片選取已失效，請重新選取圖片。');return}try{await replaceImageFile(file,target)}catch(error){status(error.message)}});
const insertImageInput=q('#pptskill-insert-image-input');
const insertionTarget=slide=>{const used=new Set(slide.content.components.map(c=>c.id));let componentId;for(let n=1;n<=slide.content.components.length+1;n++){const id='inserted-image-'+n;if(!used.has(id)){componentId=id;break}}if(!componentId)return;return{slideId:slide.id,componentId}};
const insertionOptions=(target,file)=>({...target,geometry:{x:560,y:288,width:480,height:320},fit:'contain',alt:typeof file.name==='string'?file.name:''});
const openInsertImagePicker=()=>{if(cropDialog?.isOpen()||pendingTextInsertion||insertionBusy||imagePickerOpen||!insertImageInput)return;const slide=insertionSlide();if(!slide)return;const target=insertionTarget(slide);if(!target)return;layout.cancel('picker');pendingInsertion=target;insertionBusy=true;imagePickerOpen='insert';refreshSelectedImage('refresh');try{insertImageInput.click()}catch(error){pendingInsertion=null;imagePickerOpen=null;insertionBusy=false;insertImageInput.value='';refreshSelectedImage('refresh');status(error.message)}};
insertImageInput?.addEventListener('cancel',()=>{insertImageInput.value='';if(imagePickerOpen!=='insert')return;pendingInsertion=null;imagePickerOpen=null;insertionBusy=false;refreshSelectedImage('refresh')});
insertImageInput?.addEventListener('change',async e=>{if(imagePickerOpen!=='insert'){insertImageInput.value='';return}const target=pendingInsertion,file=e.target.files?.[0];pendingInsertion=null;imagePickerOpen=null;e.target.value='';refreshSelectedImage('refresh');try{if(!file)return;if(!target){status('圖片插入已失效，請重新選檔。');return}await insertImageFile(file,insertionOptions(target,file))}catch(error){status(error.message)}finally{insertionBusy=false;refreshSelectedImage('refresh')}});
const fileDropSlide=e=>{const transfer=e.dataTransfer,node=e.target.closest?.('.slide');if(!transfer||!node||!node.isConnected||node.closest('.deck')!==q('.deck'))return null;return Array.from(transfer.types||[]).includes('Files')||Array.from(transfer.items||[]).some(item=>item.kind==='file')?node:null};
const availableDropSlide=node=>!cropDialog?.isOpen()&&node.dataset.slideId&&!pendingTextInsertion&&!insertionBusy&&!imagePickerOpen?insertionSlide(node.dataset.slideId):null;
document.addEventListener('dragover',e=>{const node=fileDropSlide(e);if(!node)return;e.preventDefault();e.dataTransfer.dropEffect=availableDropSlide(node)&&Array.from(e.dataTransfer.items||[]).filter(item=>item.kind==='file').length<2?'copy':'none'});
document.addEventListener('drop',async e=>{const node=fileDropSlide(e);if(!node)return;e.preventDefault();const slide=availableDropSlide(node);if(!slide)return;const files=e.dataTransfer.files;if(files?.length!==1){status('請一次拖入單張圖片。');return}const target=insertionTarget(slide);if(!target)return;layout.cancel('image-drop');select(slide.id);insertionBusy=true;refreshSelectedImage('refresh');try{await insertImageFile(files[0],insertionOptions(target,files[0]))}catch(error){status(error.message)}finally{insertionBusy=false;refreshSelectedImage('refresh')}});
// 貼上只接管事件 File；輸入 ownership 與 slide identity 必須先成立。
const pasteInputOwned=node=>{if(node?.closest?.('input,textarea,select,[role="textbox"]'))return true;for(let n=node;n;n=n.parentElement){const value=n.getAttribute?.('contenteditable');if(value===null||value===undefined)continue;const normalized=value.toLowerCase();if(normalized==='false')return false;if(normalized===''||normalized==='true'||normalized==='plaintext-only')return true}return false};
document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.isComposing||e.altKey||!(e.ctrlKey||e.metaKey)||e.key?.toLowerCase()!=='z')return;const node=e.target?.closest?e.target:e.target?.parentElement,active=document.activeElement;if(pasteInputOwned(node)||pasteInputOwned(active)||node?.closest?.('dialog')||active?.closest?.('dialog'))return;const direction=e.shiftKey?'redo':'undo';try{if(replayHistory(direction)){e.preventDefault();e.stopImmediatePropagation?.()}}catch(error){status(error.message)}},true);
document.addEventListener('focusin',refreshHistoryControls,true);document.addEventListener('focusout',()=>Promise.resolve().then(refreshHistoryControls),true);
const pasteSlide=e=>{if(e.defaultPrevented||e.isComposing||composingText||!layout.getState().enabled)return null;const raw=e.target,node=raw?.closest?raw:raw?.parentElement;if(pasteInputOwned(node)||pasteInputOwned(document.activeElement))return null;const deck=q('.deck');if(raw===document||raw===document.body||raw===deck)return insertionSlide();if(!node?.isConnected)return null;const slide=node.closest('.slide');if(slide)return slide.closest('.deck')===deck&&slide.dataset.slideId?insertionSlide(slide.dataset.slideId):null;const toolbar=q('[data-pptskill-editor]');if(toolbar&&node.closest('[data-pptskill-editor]')===toolbar)return insertionSlide();return null};
document.addEventListener('paste',async e=>{const slide=pasteSlide(e),transfer=e.clipboardData;if(!slide||!transfer)return;const files=transfer.files;if(!files?.length&&!Array.from(transfer.types||[]).includes('Files')&&!Array.from(transfer.items||[]).some(item=>item.kind==='file'))return;e.preventDefault();if(cropDialog?.isOpen()||pendingTextInsertion||insertionBusy||imagePickerOpen)return;if(files?.length!==1){status('請一次貼上單張圖片。');return}const target=insertionTarget(slide);if(!target)return;layout.cancel('image-paste');select(slide.id);insertionBusy=true;refreshSelectedImage('refresh');try{await insertImageFile(files[0],insertionOptions(target,files[0]))}catch(error){status(error.message)}finally{insertionBusy=false;refreshSelectedImage('refresh')}});
q('#pptskill-image-input')?.addEventListener('change',async e=>{try{await replaceImageFile(e.target.files?.[0])}catch(error){status(error.message)}});
projectComponentGeometry(document,spec);projectRoleTypography(document,spec);projectCropImages(document,spec);
qa('.slide').forEach(slide=>slide.addEventListener('focusin',()=>select(slide.dataset.slideId)));select(currentId);document.body.dataset.editorMode='play';

window.addEventListener?.('scroll',event=>{if(cropDialog?.isOpen()&&event.target?.closest?.('[data-crop-dialog]'))event.stopImmediatePropagation();},true);
${buildComponentInteractionRuntime()}
${buildMultiSelectionRuntime()}
${buildComponentInteractionMount()}
layout=mountComponentInteraction({document,window,getSpec:()=>spec,getRevision:()=>revision,resolveIdentities:resolveSlideElementIdentities,groupLock,executeOperation,project:()=>projectComponentGeometry(document,spec),notify:message=>{if(message!=='可直接播放'||q('[data-editor-status]')?.textContent!=='文字編輯目標已失效，請重新開啟。')status(message)},setTextMode:setEdit,selectSlide:select,onSelectionChange:refreshSelectedImage,onGestureChange:refreshHistoryControls});
cropDialog=mountCropDialog({document,window,contract:imageCrop,projection:cropProjection,getTarget:selectedImageTarget,getComponent:selectedImageComponent,getRevision:()=>revision,getCurrentSlide:()=>currentId,getBusy:()=>Boolean(pendingTextInsertion||textInsertionBusy||insertionBusy||imagePickerOpen||pendingAssetOperations||composingText||deletionInProgress||q('[data-component-dialog]')?.open),cancelGesture:()=>layout?.cancel('picker'),execute:executeOperation,notify:status,refresh:()=>refreshSelectedImage('refresh')});
window.addEventListener?.('pagehide',()=>{cropDialog?.close();cropProjection.destroy();});
window.addEventListener?.('pageshow',event=>{if(event.persisted){projectCropImages(document,spec);refreshSelectedImage('refresh');}});
refreshSelectedImage('refresh');refreshHistoryControls();
window.PPTSKILLEditor={layout,getHistoryState:history.state,undo:()=>replayHistory('undo'),redo:()=>replayHistory('redo'),getDeckSpec:()=>clone(clean()),operationDescriptors:operationDescriptors,executeOperation:o=>clone(executeOperation(o)),applyLocalPatch:p=>{const out=applyPatch(p);status('已套用本機 AI patch');return clone(out)},replaceImageFile,insertImageFile,prepareExport,exportHtml,getSizeReport:()=>prepareExport().report,download};
};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()})();</script>`;
};
