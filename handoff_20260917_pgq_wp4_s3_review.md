# Independent Review Handoff — PGQ-WP4 Slice 3

## Scope

Review `d5201fddcba20787b09df26f794a4ab2f70ba1d6..8d39450` on branch `codex/pgq-wp4-s3`，並核對：

- `tasks/pgq-wp4-s3-sample-approval-freeze.md`
- `evidence/pgq-wp4-s3/slice-3-candidate-receipt.md`

唯讀 review；不要 repair、merge、push、deploy，也不要開 WP4 後續 Slice、EDX 或自動 mutation loop。

## Review focus

1. Public approval seam 是否真的重跑 hard gate，且 sample identity mismatch、non-PASS、非 human approval 均 fail loud。
2. Freeze fingerprints 是否只來自 sanitized content／composition／Style／contract version，deterministic 且不接受 caller 自報 hash/verdict。
3. Duplicate/missing sample slide、current deck identity mismatch、unknown feedback field/scope/code 是否 fail loud。
4. `slide-local` 是否只 target sample slide 並要求該頁 reapproval；`deck-wide` 是否只 target 未核准頁，不改 frozen sample。
5. `profile-opt-in` 是否必須 `remember=true`，但 pure seam／installed CLI 都沒有寫 `~/.pptskill/profile.json`。
6. current content／composition change 是否只 invalidated 對應頁；Style／contract version change 是否 invalidated 全 sample；非 sample change 是否完全 preserved。
7. Preserved sample 是否保留 freeze content/composition fingerprints，沒有 mutation、regeneration 或 full-deck PASS 宣告。
8. Direct 與 installed `approve-sample` 是否 parity；packaged Skill／Codex／Claude Code／Gemini 是否只指向同一 CLI seam。

## Reproduction commands

```bash
node --check runtime/sample-approval.js
node --check runtime/workflow-cli.mjs
node --test tests/pgq-wp4-s3-sample-approval.test.mjs
node --test tests/pgq-wp4-s1-representative-sample-plan.test.mjs tests/pgq-wp4-s2-hard-gate.test.mjs tests/pgq-wp4-s3-sample-approval.test.mjs
node --test tests/pgq-wp1*.test.mjs tests/pgq-wp2*.test.mjs tests/pgq-wp3*.test.mjs tests/pgq-wp4*.test.mjs tests/ps-002-validator.test.mjs tests/p0-r6-geometry-gate.test.mjs
pnpm test
pnpm build:dist
git diff --check d5201fddcba20787b09df26f794a4ab2f70ba1d6..8d39450
```

Expected ZIP：2,128,146 bytes  
Expected SHA-256：`a83a87df45b02da14dbb994f3341f1db129c78585c6a50aeedf299fdd5661af2`

## Verdict

- `GO — PGQ-WP4 Slice 3`，或
- `REQUEST CHANGES` with reproducible findings。

不要因為本 handoff 預設 WP4 Slice 4 必須存在；GO 後再由 Mainline 依 measured gap 決定下一 frontier。
