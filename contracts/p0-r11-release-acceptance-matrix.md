# P0-R11 — End-to-end MVP Release Acceptance Matrix

**Status:** COMPLETE / 18 OF 18 PASS
**Purpose:** Define the replayable final-release evidence for the reviewed Company Style Pack. This document adds no product feature and is not release evidence by itself.

## Fixed release subject

R11 SHALL test one immutable final ZIP identified by filename, version and SHA-256. Repo tests, an adapter `--version` probe, or evidence from an older ZIP SHALL NOT substitute for the employee-only ZIP journey.

## Entry conditions

- `P1-R9` Company Style Pack has passed Owner visual review.
- `P1-R10` remains complete.
- The final ZIP contains the reviewed Company Style Pack and the three AI Style paths.
- The test environment begins without an installed PPTSKILL runtime; any retained profile state is declared before the run.
- Test input contains representative user material that is safe to retain as release evidence.

## Acceptance matrix

| ID | Journey / gate | Replayable evidence | PASS condition |
|---|---|---|---|
| R11-01 | Freeze release artifact | ZIP, checksum file, independent checksum output | Tested ZIP SHA equals the declared release SHA. |
| R11-02 | Fresh employee install | Clean-environment install trace and package smoke result | Install succeeds without repo, Git, pnpm, branch or GitHub token. |
| R11-03 | Real AI entry | Codex, Claude Code or Gemini adapter entry transcript | A supported employee AI starts from the packaged `entry.md`; `--version` alone is insufficient. |
| R11-04 | Material intake and Grill | Sanitized interaction trace | Known facts are not re-asked; one question is asked at a time; source policy remains user-provided-only unless authorized. |
| R11-05 | Outline approval | Outline artifact plus explicit human approval event | Deck is at most 15 slides and every slide has title, subtitle and 3–5 key points before generation proceeds. |
| R11-06 | Four real cover previews | One montage plus per-cover browser receipts | Company Style and three visually distinct AI covers use the same approved content; none is a color-swap duplicate. |
| R11-07 | Style selection | Explicit human selection record | Generation uses only the selected candidate; Company Style does not become the default grammar for AI Styles. |
| R11-08 | Bounded full generation | Generation plan and batch trace | Full deck is generated in bounded units with one canonical DeckSpec and no four-deck duplication. |
| R11-09 | Static visual / Owner gate | Full-deck montage and Owner verdict | Company Style representative pages look recognizably company-authored and form one coherent deck. |
| R11-10 | Geometry | Browser receipts at 1600×900 and 1280×720 | No unintended overlap, overflow, off-canvas content or unreadable fallback type. |
| R11-11 | Motion and reduced motion | Normal and reduced-motion traces / captures | Semantic role and Style determine motion; resting geometry is unchanged and reduced motion exposes complete content. |
| R11-12 | Direct editing | Browser interaction trace | Text, supported component, image replacement, reorder, duplicate and delete remain functional. |
| R11-13 | Portable export and size guard | Export report and resulting HTML | Actual UTF-8 byte status is reported; a hard-limit failure produces no normal release artifact. |
| R11-14 | Sanitizer | Embedded DeckSpec inspection | No source body, profile, prompt, transcript, local path, private note or rejected draft is present. |
| R11-15 | Offline reopen | Network-disabled browser trace | The exported HTML opens and remains usable without external assets or requests. |
| R11-16 | Recipient-AI handoff | Second compatible AI parse-and-patch trace | Recipient receives only `deck.html`, reads `script#deck-spec`, applies one bounded patch and produces a reopenable HTML. |
| R11-17 | Content integrity | Before/after hashes | Composition-only patch preserves content hash; content edit changes only the targeted slide region. |
| R11-18 | ZIP lifecycle regression | Install/update/uninstall/profile receipts | Upgrade preserves the optional profile; default uninstall retains it; no profile data enters deck artifacts. |

## Required final evidence package

```text
evidence/p0-r11/
├── release-receipt.md
├── release-acceptance.json
├── final-zip-sha256.txt
├── fresh-install/
├── ai-entry-workflow/
├── owner-visual/
├── browser-geometry/
├── editor-export/
└── recipient-ai-handoff/
```

Every matrix row SHALL map to one or more immutable artifact paths in `release-acceptance.json`. Missing evidence, a stale ZIP SHA, or an Owner visual gate that is not explicitly PASS keeps R11 blocked.

## Out of scope

- New renderer, schema, visual grammar or media subsystem.
- Generic PPTX import.
- Reopening R8, R10, VQ2 or VQ3.
- Treating test preparation as authorization to declare release.
