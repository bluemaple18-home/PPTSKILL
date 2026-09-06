# P0-VQ1 Basic Motion Baseline Receipt

**Date:** 2026-09-06  
**Status:** IMPLEMENTED / VISUAL REBUILD + OWNER REVIEW PENDING

## Added

Portable motion layer adapted from the existing AI Core frontend-design Motion Director rules:

- `fade-up` for title / subtitle / eyebrow / identity;
- stagger reveal for points, metric cards and process steps;
- line-grow for rules and chart bars;
- soft-scale for image / proof / visual panels;
- number-pop for folio / chapter / KPI-style large numbers.

The runtime is local CSS + IntersectionObserver only. No external animation library is added to the employee ZIP.

## Style behavior

Motion is still driven by existing StyleSpec fields:

- `motion.personality`
- `motion.durationMs`
- `motion.easing`
- `motion.reducedMotion`

Supported personalities remain `none`, `corporate`, `premium`, `playful`, `energetic`; each maps to bounded distance / scale / stagger values rather than slide-local handwritten animation code.

## Safety

- only opacity / transform transitions are used;
- no width / height / margin / top / left animation;
- `prefers-reduced-motion: reduce` disables transitions and forces content visible;
- browser geometry QA now emulates reduced motion before measuring static overlap / overflow / off-canvas geometry;
- motion does not change DeckSpec content or CompositionSpec.

## Files

- `design/materials/motion-baseline.md`
- `runtime/motion-primitives.js`
- `runtime/style-candidates.js`
- `runtime/full-deck-renderer.js`
- `tools/browser-geometry-qa.mjs`
- `tests/p0-vq1-motion-baseline.test.mjs`

## Pending

This receipt does **not** mark P0-VQ1 or P0-VQ2 complete. The generated style previews / full-deck fixture must be rebuilt in a normal repo checkout, tests and geometry QA must run, and owner visual review is still required. Motion alone does not fix the current shallow cover composition vocabulary.
