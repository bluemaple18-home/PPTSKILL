# P0-R11 — End-to-end MVP Release Acceptance Receipt

**Status:** SUPERSEDED — real Claude Code entry failure invalidated R11-03; see `evidence/p0-r11-r1/repair-receipt.md`
**Date:** 2026-09-10  
**Release artifact:** `dist/PPTSKILL-0.1.0.zip`  
**SHA-256:** `71fa2387f9eae3293eeebe93cc6e5b661cabe3853f8f1919ee2f07df116979c6`

## Verdict

The fixed ZIP passed all 18 rows in `contracts/p0-r11-release-acceptance-matrix.md`. The journey began from an isolated employee-like home without a repo, Git dependency or installed PPTSKILL runtime; read the packaged Codex adapter entry; completed material intake, Grill, human-approved outline, four-cover comparison, human Style selection and bounded generation; then verified Company Style rendering, motion, reduced motion, direct editing, image replacement, slide operations, sanitizer, size guard, offline reopen and profile-preserving lifecycle behavior.

The recipient handoff used a second isolated OpenAI Codex invocation after explicit Owner approval. Its working directory contained only `deck.html`, it returned one schema-bounded subtitle patch, and the trusted runtime applied that patch without changing Style, Composition or any other slide content. The resulting HTML reopened offline with no console, page, network or HTTP errors.

## Evidence summary

- Release checksum is deterministic across independent rebuilds in two timezones.
- Fresh install and selected Codex adapter smoke passed; the optional `--all` capability matrix was partial only because Gemini CLI was absent. This does not block an employee using the recognized Codex adapter.
- Company Style plus three AI covers are visually distinct and use the same approved content.
- Release Company deck passed 1600×900 and 1280×720 browser geometry in normal and reduced-motion modes.
- Direct edit/export journey passed every check. Final HTML was 3,232,922 UTF-8 bytes and below the hard limit.
- A generated JPEG was dimension-normalized to 2560×1440 but encoded larger than its synthetic source. R10 defines optimization as policy normalization rather than guaranteed byte reduction; the final artifact size gate remains PASS.
- Composition-only patch changed no content hash. Recipient content patch changed only `company-content-gradient`.
- Regression suite: **110/110 PASS**.

Machine-readable row mapping: `evidence/p0-r11/release-acceptance.json`.

## Repair discovered during R11

The first four-cover run exposed overflow for a long Chinese title without spaces. `splitTitleLines()` now chunks overlong tokens by display units and avoids 1–2 Han-character orphan lines. The repair is covered by regression tests; all four cover receipts were regenerated against the final ZIP.

## Release boundary

R11 closes MVP release acceptance. It does not authorize a new renderer, generic PPTX import, Company Style redesign, or reopening VQ2/VQ3/R7/R8/R10.
