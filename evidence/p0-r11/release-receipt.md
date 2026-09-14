# P0-R11 — End-to-end MVP Release Acceptance Receipt

**Status:** COMPLETE / RESEALED — P0-R11-R1 closed the R11-03 gap; current release artifact identity verified
**Original date:** 2026-09-10
**Reseal date:** 2026-09-14
**Release artifact:** `dist/PPTSKILL-0.1.0.zip`
**SHA-256:** `824471ae05ec5ee045f796fbde3da993f4115e5b01c7639bb7c1b44e1b1337fd`

The original R11 artifact SHA-256 was `71fa2387f9eae3293eeebe93cc6e5b661cabe3853f8f1919ee2f07df116979c6`. Its session-level receipts remain immutable historical evidence; they do not identify the current ZIP after the bounded P0-R11-R1 repair.

## Verdict

The release evidence chain passes all 18 rows in `contracts/p0-r11-release-acceptance-matrix.md`. The original R11 journey proved the product and distribution path; P0-R11-R1 supplied the repaired real installed-CLI entry evidence. The current ZIP was then resealed against its exact checksum and isolated lifecycle/package smoke without changing runtime, renderer, visuals or features.

The recipient handoff used a second isolated OpenAI Codex invocation after explicit Owner approval. Its working directory contained only `deck.html`, it returned one schema-bounded subtitle patch, and the trusted runtime applied that patch without changing Style, Composition or any other slide content. The resulting HTML reopened offline with no console, page, network or HTTP errors.

## Evidence summary

- Current ZIP SHA-256 matches `dist/PPTSKILL-0.1.0.zip.sha256`, `evidence/p0-r11/final-zip-sha256.txt` and the isolated reseal probe: `824471ae05ec5ee045f796fbde3da993f4115e5b01c7639bb7c1b44e1b1337fd`.
- Isolated current-ZIP install/lifecycle and package smoke PASS; shared core is ready and singular, profile save/preservation PASS.
- Host capability probe recognizes Codex CLI 0.148.0-alpha.9 and Claude Code 2.1.270. Gemini CLI is unavailable and remains trigger-only `UNVERIFIED`, not a release PASS.
- Fresh install and selected Codex adapter smoke passed; the optional `--all` capability matrix was partial only because Gemini CLI was absent. This does not block an employee using the recognized Codex adapter.
- Company Style plus three AI covers are visually distinct and use the same approved content.
- Release Company deck passed 1600×900 and 1280×720 browser geometry in normal and reduced-motion modes.
- Direct edit/export journey passed every check. Final HTML was 3,232,922 UTF-8 bytes and below the hard limit.
- A generated JPEG was dimension-normalized to 2560×1440 but encoded larger than its synthetic source. R10 defines optimization as policy normalization rather than guaranteed byte reduction; the final artifact size gate remains PASS.
- Composition-only patch changed no content hash. Recipient content patch changed only `company-content-gradient`.
- Regression suite after P0-R11-R1 closure: **117/117 PASS**.

Machine-readable row mapping: `evidence/p0-r11/release-acceptance.json`. Current-artifact smoke: `evidence/p0-r11/reseal-smoke-20260914.json`.

## Repair discovered during R11

The first four-cover run exposed overflow for a long Chinese title without spaces. `splitTitleLines()` now chunks overlong tokens by display units and avoids 1–2 Han-character orphan lines. The repair is covered by regression tests; all four cover receipts were regenerated against the final ZIP.

## Release boundary

The resealed R11 + R11-R1 evidence chain closes MVP. It does not authorize a new renderer, generic PPTX import, Company Style redesign, reopening VQ2/VQ3/R7/R8/R9/R10, or a new feature card. Post-MVP engineering starts only from a measured gap; Gemini replay remains dormant until a supported CLI is available.
