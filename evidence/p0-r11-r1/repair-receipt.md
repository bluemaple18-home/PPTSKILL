# P0-R11-R1 — Real AI Entry Enforcement Repair Receipt

**Date:** 2026-09-10
**Closure date:** 2026-09-14
**Status:** COMPLETE — S1 PASS / S2 PASS / S3 PASS for available real CLIs
**Release status:** RESTORED

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

Claude Code 2.1.270 discovered the installed `/pptskill`, executed `workflow-cli.mjs inspect-existing`, classified the seven-slide source as `restyle-existing`, and stopped at the pressure-test question pending human approval. The source hash was unchanged and `new.html` was absent.

### Codex

Codex CLI 0.148.0-alpha.9 discovered the installed `$pptskill`, executed `workflow-cli.mjs inspect-existing --input ./deck.html` through the Codex.app bundled binary, returned `status=pass` and `mode=restyle-existing` with all seven original slide IDs and content hashes, then stopped at the pressure-test gate. The source hash was unchanged and `new.html` was absent.

### Gemini CLI

Not installed in the acceptance environment. The packaged registration and isolated lifecycle test pass, but a real invocation remains unverified.

## 2026-09-14 closure

The earlier Claude Code command-denial result and Codex `/usr/local/bin/codex-code-mode-host` launch-path failure are superseded as current blockers by successful real installed-CLI replays. Both available CLIs executed the guarded inspection path and satisfied the source/output invariants. Gemini remains `UNVERIFIED` because no supported Gemini CLI is installed; this is the explicit deferred-on-availability case allowed by the S3 acceptance contract.

Installed package evidence: `dist/PPTSKILL-0.1.0.zip`, SHA-256 `824471ae05ec5ee045f796fbde3da993f4115e5b01c7639bb7c1b44e1b1337fd`; runtime version `0.1.0`; owned skill registrations were present for Codex, Claude Code and Gemini paths.

Closure write-back verification: targeted `node --test tests/p0-r11-r1-entry-enforcement.test.mjs` passed 7/7; full `pnpm test` passed 117/117; final `git diff --check` passed.

## Decision

The unsafe behavior reported by the Owner is blocked by the deterministic gate and confirmed through the available real CLI entries. S1, S2 and S3 are complete, the `P0-R11-R1` release blocker is closed, and MVP release status is restored. This verdict does not convert the unavailable Gemini invocation into a PASS and does not reopen renderer or visual-quality work.

Machine-readable evidence: `evidence/p0-r11-r1/repair-acceptance.json`.
