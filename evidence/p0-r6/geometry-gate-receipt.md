# P0-R6 Browser Geometry Gate Receipt

**Date:** 2026-09-06
**Result:** PASS

## Hard gate

`tools/browser-geometry-qa.mjs` launches a fresh headless Chrome profile and measures live DOM geometry after fonts and two animation frames settle. It checks:

- text/text intersection;
- text/image intersection;
- image/image intersection;
- element overflow;
- off-canvas elements;
- font sizes below 14px;
- slide width beyond the current viewport.

The gate runs at 1600×900 and 1280×720. A measured 8px scroll/client tolerance avoids treating normal glyph optical overhang as content overflow.

## Evidence

- `full-deck-geometry.json`: PASS, six slides, zero issues at both viewports; measured slide widths are 1600px and 1280px respectively.
- `collision-geometry.json`: expected FAIL at both viewports and detects all six blocker classes (`TEXT_TEXT`, `TEXT_IMAGE`, `IMAGE_IMAGE`, `OVERFLOW`, `OFF_CANVAS`, `FONT_TOO_SMALL`).
- `repaired-geometry.json`: fresh-render PASS at both viewports with zero issues.
- `screenshots/full-deck-1600x900.png` and `screenshots/full-deck-1280x720.png`: visual support only; geometry JSON remains the acceptance authority.

## Repair policy

`runtime/layout-repair-policy.js` fixes in this order:

1. safer composition;
2. explicit, human-approved content shortening;
3. split slide.

When the sequence is exhausted it blocks for manual redesign; shrinking fonts is not a repair action.

## Verification

```text
pnpm test: PASS (41/41)
git diff --check -- presentation-skill: PASS
```
