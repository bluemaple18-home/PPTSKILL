const primitiveDefinitions = Object.freeze({
  cover: { slots: ['title', 'subtitle'], kind: 'opening' },
  'section-break': { slots: ['title', 'subtitle'], kind: 'transition' },
  'title-points': { slots: ['title', 'subtitle', 'points'], kind: 'explanation' },
  'split-proof': { slots: ['title', 'subtitle', 'points', 'evidence'], kind: 'evidence' },
  'metric-grid': { slots: ['title', 'subtitle', 'points'], kind: 'evidence' },
  'process-flow': { slots: ['title', 'subtitle', 'points'], kind: 'sequence' },
  'component-focus': { slots: ['title', 'subtitle', 'component'], kind: 'asset' },
});

export const listCompositionPrimitives = () => Object.entries(primitiveDefinitions).map(([id, definition]) => ({ id, ...definition }));

export function validateCompositionForSlide(slide) {
  const errors = [];
  const composition = slide?.composition;
  const definition = primitiveDefinitions[composition?.primitive];
  if (!definition) return { status: 'fail', errors: [`${slide?.id || 'unknown'} 使用未核准的 composition primitive。`] };

  const componentIds = new Set((slide.content?.components ?? []).map(({ id }) => id));
  for (const [slot, ref] of Object.entries(composition.slots ?? {})) {
    if (!definition.slots.includes(slot)) errors.push(`${slide.id} 的 ${composition.primitive} 不接受 slot：${slot}。`);
    const componentMatch = ref.match(/^content\.components\.([a-z0-9][a-z0-9._-]{0,79})$/);
    if (componentMatch && !componentIds.has(componentMatch[1])) errors.push(`${slide.id} 的 slot 指向不存在的 component：${componentMatch[1]}。`);
  }

  if (composition.primitive === 'component-focus' && !Object.values(composition.slots ?? {}).some((ref) => ref.startsWith('content.components.'))) {
    errors.push(`${slide.id} 的 component-focus 缺少 component slot。`);
  }
  return { status: errors.length ? 'fail' : 'pass', errors };
}

export function validateDeckCompositions(spec) {
  const errors = (spec?.slides ?? []).flatMap((slide) => validateCompositionForSlide(slide).errors);
  return { status: errors.length ? 'fail' : 'pass', errors };
}
