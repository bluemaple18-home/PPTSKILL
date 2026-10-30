import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { resolveSlideElementIdentities } from '../runtime/deck-spec.js';
import { fixture, mountedEditor } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const prepared = ({ fourth = false } = {}) => {
  const spec = fixture(0);
  const slide = spec.slides.find(item => item.id === 'portable');
  slide.content.components.push({ id: 's10-three', type: 'text', text: '第三個均分元件' });
  slide.composition.geometryOverrides = {
    ...slide.composition.geometryOverrides,
    'perf-image': { x: 200, y: 560, width: 240, height: 160 },
    's10-three': { x: 1200, y: 100, width: 160, height: 120 },
  };
  if (fourth) {
    slide.content.components.push({ id: 's10-four', type: 'text', text: '第四個均分元件' });
    slide.composition.geometryOverrides['s10-four'] = { x: 600, y: 700, width: 100, height: 100 };
  }
  return spec;
};

const slideOf = spec => spec.slides.find(item => item.id === 'portable');
const elementIds = spec => resolveSlideElementIdentities(slideOf(spec)).components;
const boxes = spec => slideOf(spec).composition.geometryOverrides;
const request = (spec, distribution, ids = elementIds(spec)) => ({
  operation: 'distribute-selection',
  target: { slideId: 'portable', elementIds: ids },
  value: { distribution },
});

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
  test(`S10 ${lane} 3-item horizontal/vertical centers 頭尾固定`, () => {
    const horizontalInput = prepared();
    const horizontal = makeEditor(horizontalInput).execute(request(horizontalInput, 'horizontal-centers'));
    assert.deepEqual(boxes(horizontal), {
      'portable-quote': { x: 480, y: 280, width: 640, height: 480 },
      'perf-image': { x: 200, y: 560, width: 240, height: 160 },
      's10-three': { x: 1200, y: 100, width: 160, height: 120 },
    });

    const verticalInput = prepared();
    const vertical = makeEditor(verticalInput).execute(request(verticalInput, 'vertical-centers'));
    assert.deepEqual(boxes(vertical), {
      'portable-quote': { x: 800, y: 160, width: 640, height: 480 },
      'perf-image': { x: 200, y: 560, width: 240, height: 160 },
      's10-three': { x: 1200, y: 100, width: 160, height: 120 },
    });
  });

  test(`S10 ${lane} 4-item deterministic round 且只改主軸`, () => {
    const input = prepared({ fourth: true });
    const horizontal = makeEditor(input).execute(request(input, 'horizontal-centers'));
    assert.deepEqual(boxes(horizontal), {
      'portable-quote': { x: 640, y: 280, width: 640, height: 480 },
      'perf-image': { x: 200, y: 560, width: 240, height: 160 },
      's10-three': { x: 1200, y: 100, width: 160, height: 120 },
      's10-four': { x: 590, y: 700, width: 100, height: 100 },
    });

    const vertical = makeEditor(input).execute(request(input, 'vertical-centers'));
    assert.deepEqual(boxes(vertical), {
      'portable-quote': { x: 800, y: 117, width: 640, height: 480 },
      'perf-image': { x: 200, y: 473, width: 240, height: 160 },
      's10-three': { x: 1200, y: 100, width: 160, height: 120 },
      's10-four': { x: 600, y: 700, width: 100, height: 100 },
    });
  });

  test(`S10 ${lane} equal-center tie 依 stable element identity，不依賴 target 輸入順序`, () => {
    const input = prepared({ fourth: true });
    const slide = slideOf(input);
    const a = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa000zzzzzzzzzz';
    const b = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa003zzzzzzzzzz';
    slide.content.components[2].id = a;
    slide.content.components[3].id = b;
    delete slide.composition.geometryOverrides['s10-three'];
    delete slide.composition.geometryOverrides['s10-four'];
    slide.composition.geometryOverrides = {
      ...slide.composition.geometryOverrides,
      'portable-quote': { x: 200, y: 280, width: 200, height: 200 },
      'perf-image': { x: 1200, y: 560, width: 200, height: 160 },
      [a]: { x: 750, y: 100, width: 100, height: 120 },
      [b]: { x: 750, y: 700, width: 100, height: 100 },
    };
    const ids = elementIds(input);
    assert.ok(ids[3] < ids[2], 'fixture 必須讓 stable element identity 排序與 component id 排序相反');
    const forward = makeEditor(input).execute(request(input, 'horizontal-centers', ids));
    const reverse = makeEditor(input).execute(request(input, 'horizontal-centers', [...ids].reverse()));
    assert.deepEqual(boxes(forward), boxes(reverse));
    assert.equal(boxes(forward)[b].x, 583, 'stable element identity 較小者分配到較左的中間中心');
    assert.equal(boxes(forward)[a].x, 917);
  });

  test(`S10 ${lane} invalid / missing geometry / safe-area 全部原子拒絕`, () => {
    const input = prepared();
    const editor = makeEditor(input);
    const ids = elementIds(input);
    const invalid = [
      request(input, 'horizontal-centers', ids.slice(0, 2)),
      request(input, 'horizontal-centers', [ids[0], ids[1], ids[1]]),
      request(input, 'horizontal-centers', [ids[0], ids[1], 'component-missing']),
      request(input, 'horizontal-centers', [ids[0], ids[1], 'role-title']),
      request(input, 'diagonal-centers'),
      { ...request(input, 'horizontal-centers'), extra: true },
      { ...request(input, 'horizontal-centers'), target: { slideId: 'portable', elementIds: ids, extra: true } },
      { ...request(input, 'horizontal-centers'), value: { distribution: 'horizontal-centers', extra: true } },
      { ...request(input, 'horizontal-centers'), target: { slideId: 'missing', elementIds: ids } },
    ];
    for (const bad of invalid) {
      const before = editor.getSpec();
      assert.throws(() => editor.execute(bad));
      assert.deepEqual(editor.getSpec(), before);
    }

    const missing = prepared();
    delete slideOf(missing).composition.geometryOverrides['s10-three'];
    const missingEditor = makeEditor(missing);
    const before = missingEditor.getSpec();
    assert.throws(() => missingEditor.execute(request(missing, 'horizontal-centers')), /canonical geometry|geometry/u);
    assert.deepEqual(missingEditor.getSpec(), before);

    const unsafe = prepared({ fourth: true });
    const unsafeSlide = slideOf(unsafe);
    unsafeSlide.composition.geometryOverrides = {
      'portable-quote': { x: 80, y: 280, width: 80, height: 480 },
      'perf-image': { x: 80, y: 560, width: 1000, height: 160 },
      's10-three': { x: 900, y: 100, width: 160, height: 120 },
      's10-four': { x: 1440, y: 700, width: 80, height: 100 },
    };
    const unsafeEditor = makeEditor(unsafe);
    const unsafeBefore = unsafeEditor.getSpec();
    assert.throws(() => unsafeEditor.execute(request(unsafe, 'horizontal-centers')), /safe area|minimum|geometry/u);
    assert.deepEqual(unsafeEditor.getSpec(), unsafeBefore);
  });

  test(`S10 ${lane} canonical no-op 與 descriptor contract`, () => {
    const input = prepared();
    const editor = makeEditor(input);
    editor.execute(request(input, 'horizontal-centers'));
    const before = editor.getSpec();
    assert.deepEqual(editor.execute(request(before, 'horizontal-centers')), before);
    assert.deepEqual(editor.getSpec(), before);

    const descriptor = editor.descriptors['distribute-selection'];
    assert.ok(descriptor);
    assert.deepEqual(Array.from(descriptor.allowedTargetRoles), ['component']);
    assert.deepEqual(Array.from(descriptor.mutates), ['composition.geometryOverrides']);
    assert.deepEqual(Array.from(descriptor.qaInvalidation), ['geometry', 'overflow', 'readability']);
    assert.equal(descriptor.portableSerialization, 'json');
    assert.ok(Object.isFrozen(descriptor));
    assert.throws(() => descriptor.allowedTargetRoles.push('title'));
  });
}
