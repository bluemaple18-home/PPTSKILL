import assert from 'node:assert/strict';
import test from 'node:test';
import { contentHash, migrateLegacyFixture, patchComposition, patchSlideContent } from '../runtime/deck-spec.js';
import { createCompositionPatchRequest, createGenerationPlan, createSlidePatchRequest } from '../runtime/generation-plan.js';

const slide = (index) => ({
  id: `s-${String(index).padStart(2, '0')}`,
  title: `第 ${index} 頁`,
  subtitle: `第 ${index} 頁小標`,
  keyPoints: [`重點 ${index}.1`, `重點 ${index}.2`, `重點 ${index}.3`],
});

const outline = (count) => ({ deckTitle: 'PPTSKILL', sourcePolicy: 'user-provided-only', slides: Array.from({ length: count }, (_, index) => slide(index + 1)) });

test('15 頁無論 direct 或 staged 都拆成多個 bounded units', () => {
  for (const mode of ['direct', 'staged']) {
    const plan = createGenerationPlan({ outline: outline(15), styleSpecId: 'selected-style', capacity: { maxSlidesPerUnit: 15 }, mode });
    assert.ok(plan.units.length > 1);
    assert.equal(plan.units.flatMap((unit) => unit.slides).length, 15);
  }
});

test('batch size 由 runtime capacity 決定，後續 unit 只帶 compact anchors 與必要鄰頁', () => {
  const plan = createGenerationPlan({ outline: outline(8), styleSpecId: 'selected-style', capacity: { maxSlidesPerUnit: 3 } });
  assert.deepEqual(plan.units.map((unit) => unit.slides.length), [3, 3, 2]);
  assert.deepEqual(Object.keys(plan.units[1].anchors).sort(), ['deckTitle', 'sourcePolicy', 'styleSpecId']);
  assert.deepEqual(Object.keys(plan.units[1].neighbors.previous).sort(), ['id', 'title']);
  assert.doesNotMatch(JSON.stringify(plan.units[1].neighbors), /keyPoints|body|components/);
});

test('sample preview 只能選 1～2 頁且不解除剩餘批次核准', () => {
  const plan = createGenerationPlan({ outline: outline(6), styleSpecId: 'selected-style', capacity: { maxSlidesPerUnit: 2 }, sampleCount: 2 });
  assert.deepEqual(plan.sample.slideIds, ['s-01', 's-02']);
  assert.equal(plan.sample.requiresApprovalBeforeRemaining, true);
  assert.throws(() => createGenerationPlan({ outline: outline(6), styleSpecId: 'selected-style', capacity: { maxSlidesPerUnit: 2 }, sampleCount: 3 }), /sampleCount/);
});

test('單頁內容修改只改目標 slide', () => {
  const legacy = { title: 'Deck', slides: [1, 2, 3].map((index) => ({ id: `s-0${index}`, title: `T${index}`, body: `B${index}` })) };
  const deck = migrateLegacyFixture(legacy);
  const before = deck.slides.map(contentHash);
  const request = createSlidePatchRequest({ deckSpec: deck, slideId: 's-02', instruction: '縮短第二頁' });
  assert.deepEqual(request.context.slide.id, 's-02');
  assert.equal(request.context.deckTitle, 'Deck');
  const patched = patchSlideContent(deck, 's-02', { title: '較短標題' });
  assert.equal(contentHash(patched.slides[0]), before[0]);
  assert.notEqual(contentHash(patched.slides[1]), before[1]);
  assert.equal(contentHash(patched.slides[2]), before[2]);
});

test('換排版 request 不攜帶 slide content，套用後 content hash 不變', () => {
  const deck = migrateLegacyFixture({ title: 'Deck', slides: [{ id: 's-01', title: 'T', body: 'B' }] });
  const before = contentHash(deck.slides[0]);
  const request = createCompositionPatchRequest({ deckSpec: deck, slideId: 's-01', instruction: '換成左右分割' });
  assert.deepEqual(Object.keys(request.context).sort(), ['composition', 'contentHashRequired', 'styleSpecId']);
  assert.equal('slide' in request.context, false);
  const patched = patchComposition(deck, 's-01', { primitive: 'split', variant: 'reverse', slots: { title: 'content.title' } });
  assert.equal(contentHash(patched.slides[0]), before);
});
