# Independent Review Handoff — PGQ-WP4 Slice 3

## Scope

Review `d5201fddcba20787b09df26f794a4ab2f70ba1d6..1e06246` on branch `codex/pgq-wp4-s3`，並特別 re-review repair range `8d39450..1e06246`：

- `tasks/pgq-wp4-s3-sample-approval-freeze.md`
- `evidence/pgq-wp4-s3/slice-3-candidate-receipt.md`

唯讀 review；不要 repair、merge、push、deploy，也不要開 WP4 後續 Slice、EDX 或自動 mutation loop。

## Review focus

1. Hard gate 是否從 `validationContext` 的實際 sanitized sample content／composition、Style／contract version 自行派生 `validatedIdentity`，而不是接受 caller 自報 hash/verdict。
2. Public approval seam 是否重跑同一 identity-bound hard gate，並拒絕 stale PASS 搭配改後 content、composition、Style 或 contract state。
3. Duplicate/missing sample slide、current deck identity mismatch、unknown feedback field/scope/code 是否 fail loud。
4. `slide-local` 是否只 target sample slide 並要求該頁 reapproval；`deck-wide` 是否只 target 未核准頁，不改 frozen sample。
5. `profile-opt-in` 是否必須 `remember=true`，但 pure seam／installed CLI 都沒有寫 `~/.pptskill/profile.json`。
6. current content／composition change 是否只 invalidated 對應頁；Style／contract version change 是否 invalidated 全 sample；非 sample change 是否完全 preserved。
7. Preserved sample 是否保留 freeze content/composition fingerprints，沒有 mutation、regeneration 或 full-deck PASS 宣告。
8. Direct 與 installed `approve-sample` 是否 parity；packaged Skill／Codex／Claude Code／Gemini 是否只指向同一 CLI seam。

## Reproduction commands

```bash
node --check runtime/sample-approval.js
node --check runtime/representative-sample-identity.js
node --check runtime/representative-qa-gate.js
node --check runtime/workflow-cli.mjs
node --test tests/pgq-wp4-s3-sample-approval.test.mjs
node --test tests/pgq-wp4-s1-representative-sample-plan.test.mjs tests/pgq-wp4-s2-hard-gate.test.mjs tests/pgq-wp4-s3-sample-approval.test.mjs
node --test tests/pgq-wp1*.test.mjs tests/pgq-wp2*.test.mjs tests/pgq-wp3*.test.mjs tests/pgq-wp4*.test.mjs tests/ps-002-validator.test.mjs tests/p0-r6-geometry-gate.test.mjs
pnpm test
pnpm build:dist
git diff --check d5201fddcba20787b09df26f794a4ab2f70ba1d6..1e06246
```

Expected ZIP：2,129,589 bytes
Expected SHA-256：`402b07030883ef9f15620701558963611f9f181645f97d86beb41db29d4fc95a`

## Verdict

- `GO — PGQ-WP4 Slice 3`，或
- `REQUEST CHANGES` with reproducible findings。

不要因為本 handoff 預設 WP4 Slice 4 必須存在；GO 後再由 Mainline 依 measured gap 決定下一 frontier。
