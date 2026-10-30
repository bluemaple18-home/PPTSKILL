import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { resolveSlideElementIdentities } from '../runtime/deck-spec.js';
import { fixture, mountedEditor } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const prepared = () => {
  const spec = fixture(0);
  const slide = spec.slides.find(item => item.id === 'portable');
  slide.composition.geometryOverrides = {
    ...slide.composition.geometryOverrides,
    'perf-image': { x: 200, y: 560, width: 240, height: 160 },
  };
  return spec;
};

const slideOf = spec => spec.slides.find(item => item.id === 'portable');
const elementIds = spec => resolveSlideElementIdentities(slideOf(spec)).components;
const boxes = spec => slideOf(spec).composition.geometryOverrides;
const request = (spec, alignment, ids = elementIds(spec)) => ({
  operation: 'align-selection',
  target: { slideId: 'portable', elementIds: ids },
  value: { alignment },
});

const expected = {
  left: {
    'portable-quote': { x: 200, y: 280, width: 640, height: 480 },
    'perf-image': { x: 200, y: 560, width: 240, height: 160 },
  },
  'center-x': {
    'portable-quote': { x: 500, y: 280, width: 640, height: 480 },
    'perf-image': { x: 700, y: 560, width: 240, height: 160 },
  },
  right: {
    'portable-quote': { x: 800, y: 280, width: 640, height: 480 },
    'perf-image': { x: 1200, y: 560, width: 240, height: 160 },
  },
  top: {
    'portable-quote': { x: 800, y: 280, width: 640, height: 480 },
    'perf-image': { x: 200, y: 280, width: 240, height: 160 },
  },
  'center-y': {
    'portable-quote': { x: 800, y: 280, width: 640, height: 480 },
    'perf-image': { x: 200, y: 440, width: 240, height: 160 },
  },
  bottom: {
    'portable-quote': { x: 800, y: 280, width: 640, height: 480 },
    'perf-image': { x: 200, y: 600, width: 240, height: 160 },
  },
};

const lanes = [
  ['Node', spec => {
    const editor = createDeckEditor(spec);
    return { execute: value => editor.executeOperation(value), getSpec: () => editor.getSpec(), descriptors: editor.operationDescriptors };
  }],
  ['portable browser runtime', spec => {
    const harness = mountedEditor(spec);
    return { execute: value => harness.api.executeOperation(value), getSpec: () => harness.getSpec(), descriptors: harness.api.operationDescriptors };
  }],
];

for (const [lane, makeEditor] of lanes) {
  test(`S9 ${lane} 六種 align-selection 使用 selection bbox 且保持尺寸`, () => {
    for (const alignment of Object.keys(expected)) {
      const input = prepared();
      const editor = makeEditor(input);
      const result = editor.execute(request(input, alignment));
      assert.deepEqual(boxes(result), expected[alignment], alignment);
    }
  });

  test(`S9 ${lane} align-selection invalid / missing geometry 原子拒絕`, () => {
    const input = prepared();
    const editor = makeEditor(input);
    const ids = elementIds(input);
    const invalid = [
      request(input, 'left', [ids[0]]),
      request(input, 'left', [ids[0], ids[0]]),
      request(input, 'left', [ids[0], 'component-missing']),
      request(input, 'left', [ids[0], 'role-title']),
      request(input, 'diagonal'),
      { ...request(input, 'left'), extra: true },
      { ...request(input, 'left'), target: { slideId: 'portable', elementIds: ids, extra: true } },
      { ...request(input, 'left'), value: { alignment: 'left', extra: true } },
      { ...request(input, 'left'), target: { slideId: 'missing', elementIds: ids } },
    ];
    for (const bad of invalid) {
      const before = editor.getSpec();
      assert.throws(() => editor.execute(bad));
      assert.deepEqual(editor.getSpec(), before);
    }

    const missing = prepared();
    delete slideOf(missing).composition.geometryOverrides['perf-image'];
    const missingEditor = makeEditor(missing);
    const before = missingEditor.getSpec();
    assert.throws(() => missingEditor.execute(request(missing, 'left')), /canonical geometry|手動版面|geometry/u);
    assert.deepEqual(missingEditor.getSpec(), before);
  });

  test(`S9 ${lane} align-selection canonical no-op 不改 state`, () => {
    const input = prepared();
    const editor = makeEditor(input);
    editor.execute(request(input, 'left'));
    const before = editor.getSpec();
    const result = editor.execute(request(before, 'left'));
    assert.deepEqual(result, before);
    assert.deepEqual(editor.getSpec(), before);
  });

  test(`S9 ${lane} align-selection descriptor 深度 immutable`, () => {
    const editor = makeEditor(prepared());
    const descriptor = editor.descriptors['align-selection'];
    assert.ok(descriptor);
    assert.deepEqual(Array.from(descriptor.allowedTargetRoles), ['component']);
    assert.deepEqual(Array.from(descriptor.mutates), ['composition.geometryOverrides']);
    assert.deepEqual(Array.from(descriptor.qaInvalidation), ['geometry', 'overflow', 'readability']);
    assert.equal(descriptor.portableSerialization, 'json');
    assert.ok(Object.isFrozen(editor.descriptors));
    assert.ok(Object.isFrozen(descriptor));
    assert.throws(() => descriptor.allowedTargetRoles.push('title'));
  });
}
