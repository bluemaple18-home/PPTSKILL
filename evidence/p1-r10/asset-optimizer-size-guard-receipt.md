# P1-R10 — Asset Optimizer / Portable Size Guard Receipt

**Status:** PASS / COMPLETE  
**Date:** 2026-09-10  
**Scope:** embedded raster normalization before DeckSpec commit, UTF-8 portable HTML size verification, and the existing editor/export seam only.

## Locked boundary

- Keep the existing renderer, visual grammar, motion, geometry, DeckSpec, StyleSpec and CompositionSpec contracts.
- Optimize only user-selected JPEG / PNG / WebP assets that will be embedded in `deck.html`.
- Preserve SVG as vector and GIF as animation; oversized GIF is warning-only and is never flattened silently.
- Use browser-native decode/canvas APIs; add no native image dependency and no second export path.
- Final HTML above the hard limit must fail loudly and must not be downloaded as a normal release artifact.

## Single policy

- Raster long edge: 2560 px
- JPEG quality: 0.82
- WebP quality: 0.82
- Single asset warning: 4 MiB
- Deck warning: 12 MiB
- Deck hard fail: 20 MiB

## Acceptance

The machine-readable result will be written to `portable-size-acceptance.json`. It must cover large JPEG, transparent PNG, WebP, SVG preserve, GIF warning, small-image preservation, no upscale, replacement/export/reopen, embedded DeckSpec parseability, sanitizer regression, geometry invariance, UTF-8 byte counting, largest asset attribution, and hard-limit no-artifact behavior.

## Implementation result

- `runtime/asset-policy.js` is the single threshold/MIME policy authority.
- `runtime/browser-asset-optimizer.js` uses browser-native `createImageBitmap` and canvas. It never upscales; an over-dimension raster is normalized before the optimized data URI enters DeckSpec.
- `runtime/portable-size-guard.js` counts actual UTF-8 bytes, aggregates embedded image bytes by MIME, identifies the largest slide/component, and returns PASS/WARN/FAIL.
- `runtime/deck-editor.js` routes file replacement, direct save and programmatic export through the same optimizer/guard seam. A hard-limit failure returns no HTML and the download path performs no click.
- SVG is preserved byte-equivalent as vector. GIF is preserved as animation; an oversized GIF produces an explicit warning.
- The stale `BACKLOG.md` frontier that still pointed to VQ3/R7 was removed.

## Evidence

- Regression: **105/105 PASS** via `pnpm test`.
- R10 targeted unit acceptance: **14/14 PASS**.
- Browser acceptance: **15/15 PASS** with zero page errors, network failures, or HTTP errors.
- Large JPEG: `3200×1800 / 200,685 bytes` → `2560×1440 / 96,303 bytes`.
- Transparent PNG: normalized to `2560×1365`; alpha preserved.
- WebP: normalized to `2560×1404` and reopened successfully.
- Geometry: unchanged at both `1600×900` and `1280×720` before/after replacement.
- Exported HTML: `324,702` UTF-8 bytes; DeckSpec reopened from the single file; sanitizer leak = false.
- Hard-limit download: blocked with zero release-artifact click.
- Machine receipt: `evidence/p1-r10/portable-size-acceptance.json`.
- Rebuilt portable ZIP: `dist/PPTSKILL-0.1.0.zip`.
- ZIP SHA-256: `3e7a8b8e19c57356241a6e89da5c4e1ccdf50d4b62637164249b3ced3db854fe`.

## Decision

`P1-R10` is complete. Do not reopen visual grammar, renderer composition, motion, R7, or R8. Next is `P1-R9`, waiting for the Owner company PPTX; `P1-R11` remains blocked until R9 is complete.
