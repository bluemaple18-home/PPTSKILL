# P0-R11-R1 — Real AI Entry Enforcement

**Status:** ACTIVE / RELEASE BLOCKER — S1/S2 COMPLETE, S3 PARTIAL
**Owner report:** 2026-09-10 — Claude Code received an existing draft HTML, skipped Grill and outline approval, then changed both content and slide order while producing a replacement HTML.

## Objective

Make the packaged PPTSKILL entry a real, discoverable skill for Codex, Claude Code and Gemini CLI. Existing PPTSKILL HTML must default to a preservation-safe restyle flow: no content, slide order or slide ID changes without an explicit human-approved change set.

## Requirements

- `FR-R11R1-01`: Each supported CLI receives a discoverable `pptskill` skill entry during explicit PPTSKILL installation, with a reversible uninstall/update lifecycle.
- `FR-R11R1-02`: The skill must classify an existing `deck.html` as `restyle-existing` before rendering.
- `FR-R11R1-03`: `restyle-existing` preserves slide IDs, order and every slide content hash by default.
- `FR-R11R1-04`: Any requested content or order mutation must first produce a bounded change set and remain blocked until explicit human approval.
- `FR-R11R1-05`: A new-deck flow still requires material review, Grill completion and human outline approval before rendering.
- `FR-R11R1-06`: Failure to load the skill or satisfy a gate must fail loud; an adapter instruction alone is not acceptance evidence.

## Slices

### `R11R1-S1` — Preservation contract and deterministic gate

**Status:** COMPLETE — 7/7 targeted acceptance; blocked paths emit no HTML.

**traces_to:** `FR-R11R1-02`, `FR-R11R1-03`, `FR-R11R1-04`, `FR-R11R1-05`, `FR-R11R1-06`
**depends_on:** none
**acceptance:** A public runtime entry validates mode and approval state; an unapproved existing-deck rewrite or reorder is rejected, while a Style/Composition-only restyle preserves IDs, order and content hashes.
**verification:** RED/GREEN unit and integration tests using an existing portable HTML fixture.

### `R11R1-S2` — Portable real-skill packaging and lifecycle

**Status:** COMPLETE — ZIP installs, updates and uninstalls owned skills for all three supported CLI paths; unrelated same-name skills are preserved and installation refuses the collision.

**traces_to:** `FR-R11R1-01`, `FR-R11R1-06`
**depends_on:** `R11R1-S1`
**acceptance:** The ZIP contains one shared skill payload plus thin CLI registration descriptors; install/update/uninstall are reversible in an isolated home and never overwrite an unrelated existing skill.
**verification:** ZIP lifecycle acceptance for Codex, Claude Code and Gemini CLI paths.

### `R11R1-S3` — Real CLI replay

**Status:** PARTIAL — Claude Code and Codex both discovered the skill and failed closed without changing the source or producing `new.html`. Full command execution is not yet proven: Claude Code's non-interactive session denied the required local Node command; Codex's configured code-mode host binary is missing; Gemini CLI is unavailable.

**traces_to:** `FR-R11R1-01` through `FR-R11R1-06`
**depends_on:** `R11R1-S1`, `R11R1-S2`
**acceptance:** Real Codex and Claude Code invocations receive an existing HTML and a “套 PPTSKILL 重做” request; both stop for the required gate and do not output a rewritten HTML. Gemini uses the same packaged contract and must be replayed when a supported CLI is available.
**verification:** Isolated CLI transcripts plus before/after artifact inventory and hashes.

## Checkpoints

- Checkpoint A after `S1`: preservation gate RED→GREEN and no renderer/visual changes.
- Checkpoint B after `S2`: clean ZIP install/update/uninstall and unrelated-skill collision test PASS.
- Final gate after `S3`: do not restore MVP release status until available real CLI replays pass; unavailable Gemini remains explicitly unverified, not silently PASS.

## Out of scope

- Renderer redesign, Company Style changes or new visual grammar.
- Generic HTML/PPTX import.
- Automatic external research or source expansion.
- A second runtime, ledger, database or unbounded workflow engine.

## Trace preflight

- Stable requirement and slice IDs: PASS.
- Every slice has dependencies, acceptance and verification: PASS.
- No dangling references or unresolved product decision: PASS.
- Current frontier: `R11R1-S3` real installed-CLI replay.
