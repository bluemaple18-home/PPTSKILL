import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createDeckEditor, OPERATION_DESCRIPTORS } from '../runtime/deck-editor.js';
import { extractDeckSpec, resolveSlideElementIdentities, resolveSlideElementIds, sanitizeDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));

test('legacy keyPoints deterministic backfill，合法 explicit IDs 原樣保留', () => {
  const legacy = sanitizeDeckSpec(fixture);
  assert.deepEqual(legacy.slides[0].content.keyPointIds, ['key-point-01', 'key-point-02', 'key-point-03']);

  const explicit = structuredClone(fixture);
  explicit.slides[0].content.keyPointIds = ['opening-a', 'opening.b', 'opening_c'];
  assert.deepEqual(sanitizeDeckSpec(explicit).slides[0].content.keyPointIds, explicit.slides[0].content.keyPointIds);
});

test('caller-supplied invalid identity 在 sanitizer 前 fail loud', () => {
  const invalidCases = [
    ['長度', ['only-one']],
    ['重複', ['same', 'same', 'third']],
    ['格式', ['valid', 'INVALID SPACE', 'third']],
  ];
  for (const [label, keyPointIds] of invalidCases) {
    const input = structuredClone(fixture);
    input.slides[0].content.keyPointIds = keyPointIds;
    assert.throws(() => sanitizeDeckSpec(input), new RegExp(`keyPointIds.*${label}|${label}.*keyPointIds`, 'u'));
  }
});

test('renderer 對 directly operable roots 輸出 slide-local unique element identity', () => {
  const result = renderFullDeck(fixture);
  assert.equal(result.status, 'pass');
  assert.match(result.html, /data-pptskill-element-id="role-title"[^>]*data-edit-target="slides\.opening\.content\.title"/);
  assert.match(result.html, /data-pptskill-element-id="role-subtitle"[^>]*data-edit-target="slides\.opening\.content\.subtitle"/);
  assert.match(result.html, /data-pptskill-element-id="point-key-point-01"[^>]*data-edit-target="slides\.problem\.content\.keyPoints\.0"/);
  assert.match(result.html, /data-pptskill-element-id="component-portable-quote"[^>]*data-edit-target="slides\.portable\.content\.components\.portable-quote"/);

  for (const slide of result.spec.slides) {
    const section = result.html.match(new RegExp(`<section[^>]*data-slide-id="${slide.id}"[\\s\\S]*?<\\/section>`))?.[0] ?? '';
    const ids = [...section.matchAll(/data-pptskill-element-id="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${slide.id} element identity 必須唯一`);
  }
});

test('edit-text descriptor 完整宣告 bounded metadata', () => {
  assert.deepEqual(Object.keys(OPERATION_DESCRIPTORS), ['group-elements', 'ungroup-elements', 'lock-elements', 'unlock-elements', 'move-group', 'resize-group', 'insert-element', 'delete-element', 'replace-asset', 'crop-image', 'reset-image-crop', 'set-typography', 'copy-style', 'paste-style', 'edit-text', 'move-element', 'resize-element', 'align-selection', 'distribute-selection']);
  assert.deepEqual(OPERATION_DESCRIPTORS['edit-text'].allowedTargetRoles, ['title', 'subtitle', 'keyPoint', 'component']);
  for (const field of ['inputSchema', 'mutates', 'preserves', 'destructive', 'confirmation', 'undoable', 'qaInvalidation', 'portableSerialization', 'unsupportedReason']) {
    assert.ok(field in OPERATION_DESCRIPTORS['edit-text'], `descriptor 缺少 ${field}`);
  }
  assert.deepEqual(OPERATION_DESCRIPTORS['edit-text'].inputSchema, {
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
  });
});

test('executeOperation 只依 stable target pair 編輯文字並 fail loud', () => {
  const editor = createDeckEditor(fixture);
  const before = editor.getSpec();
  const edited = editor.executeOperation({
    operation: 'edit-text',
    target: { slideId: 'problem', elementId: 'point-key-point-01' },
    value: 'stable target edit',
  });
  assert.equal(edited.slides[1].content.keyPoints[0], 'stable target edit');
  assert.deepEqual(edited.slides[0], before.slides[0]);
  assert.deepEqual(edited.slides[1].composition, before.slides[1].composition);
  assert.deepEqual(edited.slides[1].content.components, before.slides[1].content.components);

  assert.throws(() => editor.executeOperation({ operation: 'unknown-operation', target: { slideId: 'problem', elementId: 'role-title' }, value: 'x' }), /operation|支援/u);
  assert.throws(() => editor.executeOperation({ operation: 'edit-text', target: { slideId: 'missing', elementId: 'role-title' }, value: 'x' }), /slide/u);
  assert.throws(() => editor.executeOperation({ operation: 'edit-text', target: { slideId: 'problem', elementId: 'missing' }, value: 'x' }), /element/u);
  assert.equal(editor.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'component-portable-quote' }, value: 'x' }).slides.find(s => s.id === 'portable').content.components.find(c => c.id === 'portable-quote').text, 'x');
  assert.throws(() => editor.executeOperation({ operation: 'edit-text', target: { slideId: 'problem', elementId: 'role-title' }, value: 42 }), /value|string/u);
  assert.throws(() => editor.executeOperation({ operation: 'edit-text', target: { slideId: 'problem', elementId: 'role-title' }, value: 'x', arbitrary: true }), /payload|欄位|additional/u);
  assert.throws(() => editor.executeOperation({ operation: 'edit-text', target: { slideId: 'problem', elementId: 'role-title', arbitrary: true }, value: 'x' }), /target|欄位|additional/u);
  assert.throws(() => editor.executeOperation({ operation: 'edit-text', target: { slideId: '', elementId: 'role-title' }, value: 'x' }), /slideId|target|格式/u);
  assert.throws(() => editor.executeOperation({ operation: 'edit-text', target: { slideId: 'problem', elementId: `role-${'x'.repeat(80)}` }, value: 'x' }), /elementId|target|格式/u);
});

test('legacy non-pattern 與 201+ 字元 slideId 仍可走 Node/browser operation path', () => {
  const input = structuredClone(fixture);
  const legacySlideId = `Opening Cover ${'X'.repeat(220)}`;
  input.slides[0].id = legacySlideId;
  const editor = createDeckEditor(input);
  const edited = editor.executeOperation({
    operation: 'edit-text',
    target: { slideId: legacySlideId, elementId: 'role-title' },
    value: 'legacy slide edited',
  });
  assert.equal(edited.slides[0].id, legacySlideId);
  assert.equal(edited.slides[0].content.title, 'legacy slide edited');
  const rendered = renderFullDeck(input);
  assert.equal(rendered.status, 'pass');
  assert.match(rendered.html, /request\.target\.slideId\.length<1/);
  assert.doesNotMatch(rendered.html, /request\.target\.slideId\.length>\d+/);
});

test('對抗性 long component／keyPoint IDs 仍解析為 bounded unique identity 並可 round-trip', () => {
  const input = structuredClone(fixture);
  const slide = input.slides.find(({ id }) => id === 'portable');
  const longComponentId = 'a'.repeat(80);
  const collidingComponentId = 'a'.repeat(61) + '-5143e6d5';
  slide.content.components = [
    { id: longComponentId, type: 'text', text: 'long' },
    { id: collidingComponentId, type: 'text', text: 'suffix collision' },
  ];
  slide.composition.slots.component = `content.components.${longComponentId}`;
  slide.content.keyPointIds = [
    'b'.repeat(80),
    'b'.repeat(65) + '-cbdd63c5',
    'third-point',
  ];

  const clean = sanitizeDeckSpec(input);
  const cleanSlide = clean.slides.find(({ id }) => id === 'portable');
  const identities = resolveSlideElementIdentities(cleanSlide);
  const elementIds = resolveSlideElementIds(cleanSlide);
  assert.equal(new Set(elementIds).size, elementIds.length);
  assert.ok(elementIds.every((id) => /^[a-z0-9][a-z0-9._-]{0,79}$/.test(id)));
  assert.notEqual(identities.keyPoints[0], identities.keyPoints[1]);
  assert.notEqual(identities.components[0], identities.components[1]);
  const reordered = structuredClone(cleanSlide);
  reordered.content.keyPointIds.reverse();
  reordered.content.keyPoints.reverse();
  reordered.content.components.reverse();
  const reorderedIdentities = resolveSlideElementIdentities(reordered);
  assert.equal(reorderedIdentities.keyPoints[reordered.content.keyPointIds.indexOf(slide.content.keyPointIds[0])], identities.keyPoints[0]);
  assert.equal(reorderedIdentities.components[reordered.content.components.findIndex(({ id }) => id === longComponentId)], identities.components[0]);

  const edited = createDeckEditor(clean).executeOperation({
    operation: 'edit-text',
    target: { slideId: 'portable', elementId: identities.keyPoints[1] },
    value: 'collision-safe edit',
  });
  assert.equal(edited.slides.find(({ id }) => id === 'portable').content.keyPoints[1], 'collision-safe edit');

  const rendered = renderFullDeck(clean);
  assert.equal(rendered.status, 'pass');
  assert.match(rendered.html, new RegExp(`data-pptskill-element-id="${identities.components[0]}"`));
  assert.match(rendered.html, /resolveSlideElementIdentities=slide=>/);
  assert.match(rendered.html, /identities\.keyPoints\.indexOf\(o\.target\.elementId\)/);
  assert.deepEqual(extractDeckSpec(rendered.html), rendered.spec);
  assert.deepEqual(rendered.spec.slides.find(({ id }) => id === 'portable').content.keyPointIds, slide.content.keyPointIds);
});

test('descriptor metadata 深層 immutable，mutation 不可擴張 enforcement allowlist', () => {
  assert.throws(() => OPERATION_DESCRIPTORS['edit-text'].allowedTargetRoles.push('component'), TypeError);
  assert.throws(() => { OPERATION_DESCRIPTORS['edit-text'].inputSchema.properties.value.type = 'object'; }, TypeError);
  const nontext = structuredClone(fixture);
  const component = nontext.slides.find(s => s.id === 'portable').content.components.find(c => c.id === 'portable-quote');
  Object.assign(component, { type: 'image', dataUri: 'data:image/png;base64,AA==', alt: '非文字' });
  const editor = createDeckEditor(nontext);
  assert.throws(() => editor.executeOperation({
    operation: 'edit-text',
    target: { slideId: 'portable', elementId: 'component-portable-quote' },
    value: 'still rejected',
  }), /type=text/u);
  const runtime = renderFullDeck(fixture).html;
  assert.match(runtime, /operationDescriptors=deepFreeze\(/);
  assert.match(runtime, /if\(!operationDescriptors\[o\.operation\]\.allowedTargetRoles\.includes\(role\)\)throw new Error/);
});

test('legacy component ID 與 role／point canonical IDs 可同名但 element identity 不碰撞', () => {
  const input = structuredClone(fixture);
  const slide = input.slides.find(({ id }) => id === 'portable');
  slide.content.components[0].id = 'title';
  slide.composition.slots.component = 'content.components.title';
  const clean = sanitizeDeckSpec(input);
  assert.deepEqual(clean.slides.find(({ id }) => id === 'portable').content.keyPointIds, ['key-point-01', 'key-point-02', 'key-point-03']);

  const rendered = renderFullDeck(input);
  assert.equal(rendered.status, 'pass');
  assert.match(rendered.html, /data-pptskill-element-id="role-title"[^>]*data-edit-target="slides\.portable\.content\.title"/);
  assert.match(rendered.html, /data-pptskill-element-id="component-title"[^>]*data-edit-target="slides\.portable\.content\.components\.title"/);
  assert.match(rendered.html, /const cleanSlideContent=.*new Set\(elementIds\)/s);
  assert.match(rendered.html, /const executeOperation=request=>\{const o=validateOperationRequest\(request\)/);
});

test('legacy adapters、duplicate 與 export/reopen 共用 canonical identity', () => {
  const editor = createDeckEditor(fixture);
  editor.editText('opening', 'title', 'legacy title');
  editor.editKeyPoint('problem', 1, 'legacy point');
  editor.applyLocalPatch({ slideId: 'problem', region: 'content.subtitle', value: 'legacy patch' });
  const sourceIds = editor.getSpec().slides[1].content.keyPointIds;
  const copyId = editor.duplicate(1);
  assert.deepEqual(editor.getSpec().slides.find(({ id }) => id === copyId).content.keyPointIds, sourceIds);

  const rendered = renderFullDeck(editor.getSpec());
  assert.deepEqual(extractDeckSpec(rendered.html), rendered.spec);
  assert.deepEqual(rendered.spec.slides.find(({ id }) => id === copyId).content.keyPointIds, sourceIds);
  assert.match(rendered.html, /window\.PPTSKILLEditor=\{[^}]*operationDescriptors:[^,]+,executeOperation/u);
});
