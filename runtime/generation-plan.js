const assertOutline = (outline) => {
  if (!Array.isArray(outline?.slides) || outline.slides.length < 1 || outline.slides.length > 15) throw new Error('Outline 必須是 1～15 頁。');
};

export function createGenerationPlan({ outline, styleSpecId, capacity, mode = 'direct', sampleCount = 0 }) {
  assertOutline(outline);
  if (!Number.isInteger(capacity?.maxSlidesPerUnit) || capacity.maxSlidesPerUnit < 1) throw new Error('Runtime 必須明示 maxSlidesPerUnit。');
  if (!['direct', 'staged'].includes(mode)) throw new Error('mode 必須是 direct 或 staged。');
  if (![0, 1, 2].includes(sampleCount)) throw new Error('sampleCount 只能是 0、1 或 2。');

  const batchSize = Math.min(capacity.maxSlidesPerUnit, outline.slides.length === 15 ? 14 : outline.slides.length);
  const units = [];
  for (let start = 0; start < outline.slides.length; start += batchSize) {
    const slides = outline.slides.slice(start, start + batchSize);
    units.push({
      id: `unit-${String(units.length + 1).padStart(2, '0')}`,
      anchors: {
        deckTitle: outline.deckTitle,
        styleSpecId,
        sourcePolicy: outline.sourcePolicy,
      },
      slides: slides.map(({ id, title, subtitle, keyPoints }) => ({ id, title, subtitle, keyPoints: [...keyPoints] })),
      neighbors: {
        previous: start > 0 ? { id: outline.slides[start - 1].id, title: outline.slides[start - 1].title } : null,
        next: start + slides.length < outline.slides.length ? { id: outline.slides[start + slides.length].id, title: outline.slides[start + slides.length].title } : null,
      },
    });
  }

  return {
    version: 1,
    mode,
    sample: sampleCount ? { slideIds: outline.slides.slice(0, sampleCount).map((slide) => slide.id), requiresApprovalBeforeRemaining: true } : null,
    units,
  };
}

export function createSlidePatchRequest({ deckSpec, slideId, instruction }) {
  const slide = deckSpec.slides.find((item) => item.id === slideId);
  if (!slide) throw new Error(`找不到 slide：${slideId}`);
  return {
    operation: 'patch-slide-content',
    slideId,
    instruction,
    context: { deckTitle: deckSpec.title, styleSpecId: deckSpec.style.id, slide },
  };
}

export function createCompositionPatchRequest({ deckSpec, slideId, instruction }) {
  const slide = deckSpec.slides.find((item) => item.id === slideId);
  if (!slide) throw new Error(`找不到 slide：${slideId}`);
  return {
    operation: 'patch-slide-composition',
    slideId,
    instruction,
    context: { styleSpecId: deckSpec.style.id, contentHashRequired: true, composition: slide.composition },
  };
}
