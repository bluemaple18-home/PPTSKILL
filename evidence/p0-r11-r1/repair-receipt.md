# P0-R11-R1 — Real AI Entry Enforcement Repair Receipt

**Date:** 2026-09-10
**Status:** REPAIR CANDIDATE — S1 PASS / S2 PASS / S3 PARTIAL
**Release status:** SUSPENDED

## Owner-observed failure

A colleague gave Claude Code an existing PPTSKILL HTML and asked it to apply PPTSKILL and redo the deck. Claude Code asked no questions, produced a replacement HTML, and changed both content and slide order.

## Root cause

The former ZIP contained three `entry.md` capability descriptions, not discoverable user skills. The installer deliberately left the three CLI configuration trees untouched. Grill and outline checks were optional library calls, and there was no guarded public entry for an existing HTML. The previous R11 acceptance exercised a controlled trace rather than the real free-form CLI entry that failed in practice.

## Repair

- Added one shared, packaged `pptskill` skill and reversible registration at the standard user-skill paths for Codex, Claude Code and Gemini CLI.
- Added a mandatory `restyle-existing` entry. It parses the embedded DeckSpec and locks slide IDs, order and every content field by default.
- A content or order change now requires an exact bounded change set with explicit human confirmation. Vague requests such as “重做” or “變好看” are not approval.
- A new deck still requires material review, a pressure-test answer, approved outline and explicit Style selection.
- Final HTML can only be emitted through the guarded workflow CLI. A blocked gate produces no artifact.
- Installation refuses an unrelated same-name skill. Update and uninstall only mutate an owned registration and preserve a user-modified registration.

## Deterministic acceptance

- Targeted preservation and lifecycle acceptance: **7/7 PASS**.
- Full repository regression: **117/117 PASS**.
- Manual `inspect-existing` parsed the ten-slide fixture, returned stable IDs/order/content hashes, and stopped at the pressure-test gate.
- Source fixture SHA-256 before and after replay: `dceba4e5d6738a4ce41dd5a36b8604756ed6906a457f4163a2ece9287b830c39`.
- No replay produced `new.html`.

## Real CLI replay

### Claude Code

The real `/pptskill` invocation discovered the skill, classified the request as an existing-deck restyle, explicitly committed to preserving slide IDs/order/content, and refused to handwrite or bypass the guarded output path. The non-interactive session denied the required local Node inspection command, so it stopped and requested authorization. This proves fail-closed behavior, but not a complete functional replay.

### Codex

The real `$pptskill` invocation discovered the skill and stated the same preservation and approval gates. Tool execution could not start because the local configuration enables `code_mode_host` while `/usr/local/bin/codex-code-mode-host` is missing. It failed closed; the source remained unchanged and no output was created. Repeating the same environment failure was stopped after the third occurrence.

### Gemini CLI

Not installed in the acceptance environment. The packaged registration and isolated lifecycle test pass, but a real invocation remains unverified.

## Decision

The unsafe behavior reported by the Owner is now blocked by code, not merely by prose. S1 and S2 are complete. S3 remains partial because the available real CLI environments could not execute the guarded local inspection path. The previous `P0-R11 COMPLETE` claim stays superseded; this candidate must not be described as a released MVP until the real installed-skill replay gate passes.

Machine-readable evidence: `evidence/p0-r11-r1/repair-acceptance.json`.
