import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { resolveSlideElementIdentities } from '../runtime/deck-spec.js';
import { fixture, mountedEditor } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const prepared = () => {
  const spec = fixture(0);
  const slide = spec.slides.find(item => item.id === 'portable');
  slide.content.components.push(
    { id: 's11-three', type: 'text', text: '第三個等間距元件' },
    { id: 's11-four', type: 'text', text: '第四個等間距元件' },
  );
  slide.composition.geometryOverrides = {
    'portable-quote': { x: 100, y: 100, width: 100, height: 100 },
    'perf-image': { x: 350, y: 300, width: 200, height: 150 },
    's11-three': { x: 800, y: 500, width: 120, height: 80 },
    's11-four': { x: 1300, y: 700, width: 100, height: 100 },
  };
  return spec;
};
const slideOf = spec => spec.slides.find(item => item.id === 'portable');
const elementIds = spec => resolveSlideElementIdentities(slideOf(spec)).components;
const boxes = spec => slideOf(spec).composition.geometryOverrides;
const request = (spec, distribution, ids = elementIds(spec)) => ({
  operation: 'distribute-selection', target: { slideId: 'portable', elementIds: ids }, value: { distribution },
});

const lanes = [
  ['Node', spec => { const editor = createDeckEditor(spec); return { execute: v => editor.executeOperation(v), getSpec: () => editor.getSpec() }; }],
  ['portable browser runtime', spec => { const h = mountedEditor(spec); return { execute: v => h.api.executeOperation(v), getSpec: () => h.getSpec() }; }],
];

for (const [lane, makeEditor] of lanes) {
  test(`S11 ${lane} horizontal/vertical equal-gap 頭尾固定且只改主軸`, () => {
    const horizontalInput = prepared();
    const horizontal = makeEditor(horizontalInput).execute(request(horizontalInput, 'horizontal-gaps'));
    assert.deepEqual(boxes(horizontal), {
      'portable-quote': { x: 100, y: 100, width: 100, height: 100 },
      'perf-image': { x: 460, y: 300, width: 200, height: 150 },
      's11-three': { x: 920, y: 500, width: 120, height: 80 },
      's11-four': { x: 1300, y: 700, width: 100, height: 100 },
    });

    const verticalInput = prepared();
    const vertical = makeEditor(verticalInput).execute(request(verticalInput, 'vertical-gaps'));
    assert.deepEqual(boxes(vertical), {
      'portable-quote': { x: 100, y: 100, width: 100, height: 100 },
      'perf-image': { x: 350, y: 290, width: 200, height: 150 },
      's11-three': { x: 800, y: 530, width: 120, height: 80 },
      's11-four': { x: 1300, y: 700, width: 100, height: 100 },
    });
  });

  test(`S11 ${lane} fractional gap 使用 deterministic Math.round`, () => {
    const input = prepared();
    const slide = slideOf(input);
    slide.content.components = slide.content.components.slice(0, 3);
    delete slide.composition.geometryOverrides['s11-four'];
    slide.composition.geometryOverrides['portable-quote'] = { x: 100, y: 100, width: 101, height: 100 };
    slide.composition.geometryOverrides['perf-image'] = { x: 500, y: 300, width: 200, height: 150 };
    slide.composition.geometryOverrides['s11-three'] = { x: 1000, y: 500, width: 99, height: 80 };
    const result = makeEditor(input).execute(request(input, 'horizontal-gaps'));
    assert.equal(boxes(result)['portable-quote'].x, 100);
    assert.equal(boxes(result)['perf-image'].x, 501);
    assert.equal(boxes(result)['s11-three'].x, 1000);
  });

  test(`S11 ${lane} same-start 以 stable element identity tie-break`, () => {
    const input = prepared();
    const slide = slideOf(input);
    const a = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa000zzzzzzzzzz';
    const b = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa003zzzzzzzzzz';
    slide.content.components[0].id = a;
    slide.content.components[1].id = b;
    delete slide.composition.geometryOverrides['portable-quote'];
    delete slide.composition.geometryOverrides['perf-image'];
    slide.composition.geometryOverrides = {
      ...slide.composition.geometryOverrides,
      [a]: { x: 100, y: 100, width: 100, height: 100 },
      [b]: { x: 100, y: 300, width: 100, height: 150 },
      's11-three': { x: 700, y: 500, width: 100, height: 80 },
      's11-four': { x: 1300, y: 700, width: 100, height: 100 },
    };
    const ids = elementIds(input);
    assert.ok(ids[1] < ids[0], 'fixture 必須讓 stable identity 排序與 component id 排序相反');
    const forward = makeEditor(input).execute(request(input, 'horizontal-gaps', ids));
    const reverse = makeEditor(input).execute(request(input, 'horizontal-gaps', [...ids].reverse()));
    assert.deepEqual(boxes(forward), boxes(reverse));
    assert.equal(boxes(forward)[b].x, 100, 'stable identity 較小者保持第一個固定 box');
    assert.equal(boxes(forward)[a].x, 500);
  });

  test(`S11 ${lane} negative gap 與 invalid input 全部原子拒絕`, () => {
    const input = prepared();
    const slide = slideOf(input);
    slide.content.components = slide.content.components.slice(0, 3);
    delete slide.composition.geometryOverrides['s11-four'];
    slide.composition.geometryOverrides = {
      'portable-quote': { x: 100, y: 100, width: 500, height: 100 },
      'perf-image': { x: 300, y: 300, width: 500, height: 150 },
      's11-three': { x: 600, y: 500, width: 500, height: 80 },
    };
    const editor = makeEditor(input), before = editor.getSpec();
    assert.throws(() => editor.execute(request(input, 'horizontal-gaps')), /gap|間距|空間/u);
    assert.deepEqual(editor.getSpec(), before);

    const ids = elementIds(input);
    for (const bad of [
      request(input, 'horizontal-gaps', ids.slice(0, 2)),
      request(input, 'horizontal-gaps', [ids[0], ids[1], ids[1]]),
      request(input, 'horizontal-gaps', [ids[0], ids[1], 'component-missing']),
      { ...request(input, 'horizontal-gaps'), value: { distribution: 'horizontal-gaps', extra: true } },
    ]) {
      const snapshot = editor.getSpec();
      assert.throws(() => editor.execute(bad));
      assert.deepEqual(editor.getSpec(), snapshot);
    }
  });

  test(`S11 ${lane} equal-gap canonical no-op`, () => {
    const input = prepared();
    const editor = makeEditor(input);
    editor.execute(request(input, 'horizontal-gaps'));
    const before = editor.getSpec();
    assert.deepEqual(editor.execute(request(before, 'horizontal-gaps')), before);
    assert.deepEqual(editor.getSpec(), before);
  });
}
