# P0-R3 Dynamic Style Gate Receipt

**Date:** 2026-09-06
**Result:** PASS

## Contract evidence

- `runtime/style-candidates.js` compiles exactly one Company Style slot and three AI Visual Routes from the same approved cover content.
- `validateRouteDiversity()` rejects candidate pairs with fewer than three non-colour differences across composition, density, typography, geometry, asset treatment and motion.
- `selectStyleCandidate()` requires explicit `approvedBy: "human"` and returns a compact StyleSpec.
- Missing Company Style Pack returns `blocked`; the bundled company candidate is explicitly marked fixture-only and is not presented as the real company identity.
- `tests/p0-r3-style-candidates.test.mjs` covers missing inputs, same-layout colour swaps, same-content compilation, real HTML output and human-only selection.

## Renderer evidence

Command:

```bash
pnpm run build:styles
```

Result: four offline 1600×900 HTML/CSS cover previews generated from one content object:

- `fixtures/style-candidate-previews/company-style-fixture.html`
- `fixtures/style-candidate-previews/route-technical-map.html`
- `fixtures/style-candidate-previews/route-editorial-rail.html`
- `fixtures/style-candidate-previews/route-split-proof.html`

Chrome screenshots:

- `screenshots/company-style-fixture.png`
- `screenshots/route-technical-map.png`
- `screenshots/route-editorial-rail.png`
- `screenshots/route-split-proof.png`

Visual QA found and repaired a Split Proof orphan-line defect before acceptance. The four final covers have no visible clipping, overflow or off-canvas content at 1600×900. Company Style remains synthetic fixture evidence until P1-R9 receives a real company PPTX/Style Pack.

## Regression evidence

```text
pnpm test: PASS (32/32)
git diff --check -- presentation-skill: PASS
```
