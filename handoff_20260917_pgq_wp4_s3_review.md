# Independent Review Handoff — PGQ-WP4 Slice 3

## Scope

Review `d5201fddcba20787b09df26f794a4ab2f70ba1d6..HEAD` on branch `codex/pgq-wp4-s3`，並特別 re-review producer-bound repair `88b1305..HEAD`：

- `tasks/pgq-wp4-s3-sample-approval-freeze.md`
- `evidence/pgq-wp4-s3/slice-3-candidate-receipt.md`

唯讀 review；不要 repair、merge、push、deploy，也不要開 WP4 後續 Slice、EDX 或自動 mutation loop。

## Review focus

1. Public approval seam 是否完全拒絕 caller-authored hard gate／PASS／evidence object／fingerprint，且 plain JSON clone 無法取得 trusted evidence authority。
2. Direct collector 與 installed `approve-sample --artifact` 是否都實際執行固定 packaged static＋normal Chrome producer，並從 artifact 內 canonical DeckSpec 派生 identity。
3. Caller 同改 DeckSpec/context、重算 fingerprint、沿用舊 PASS refs/status 是否仍 fail loud；artifact 在 producer 執行期間變更是否 fail loud。
4. Duplicate/missing sample slide、current deck identity mismatch、unknown feedback field/scope/code 是否 fail loud。
5. `slide-local` 是否只 target sample slide 並要求該頁 reapproval；`deck-wide` 是否只 target 未核准頁，不改 frozen sample。
6. `profile-opt-in` 是否必須 `remember=true`，但 pure seam／installed CLI 都沒有寫 `~/.pptskill/profile.json`。
7. current content／composition change 是否只 invalidated 對應頁；Style／contract version change 是否 invalidated 全 sample；非 sample change 是否完全 preserved。
8. Preserved sample 是否保留 freeze content/composition fingerprints，沒有 mutation、regeneration 或 full-deck PASS 宣告。
9. Direct 與 installed `approve-sample` 是否 parity；packaged Skill／Codex／Claude Code／Gemini 是否只指向同一 `--artifact` CLI seam。
10. Forced-static producer 是否使用 bounded runtime flag，而不是破壞 `IntersectionObserver`；static／normal receipts 是否都把 console、pageerror、network、HTTP 與 geometry 納入 PASS。

## Reproduction commands

```bash
node --check runtime/sample-approval.js
node --check runtime/representative-qa-evidence.js
node --check runtime/representative-sample-identity.js
node --check runtime/representative-qa-gate.js
node --check runtime/workflow-cli.mjs
node --test tests/pgq-wp4-s3-sample-approval.test.mjs
node --test tests/pgq-wp4-s1-representative-sample-plan.test.mjs tests/pgq-wp4-s2-hard-gate.test.mjs tests/pgq-wp4-s3-sample-approval.test.mjs
node --test tests/pgq-wp1*.test.mjs tests/pgq-wp2*.test.mjs tests/pgq-wp3*.test.mjs tests/pgq-wp4*.test.mjs tests/ps-002-validator.test.mjs tests/p0-r6-geometry-gate.test.mjs
pnpm test
pnpm build:dist
git diff --check d5201fddcba20787b09df26f794a4ab2f70ba1d6..HEAD
```

Expected ZIP：2,140,638 bytes
Expected SHA-256：`3f971fc33a390952e0ba84ff6c3d9df1e9086ba240c218d86babfa205462a73b`

## Verdict

- `GO — PGQ-WP4 Slice 3`，或
- `REQUEST CHANGES` with reproducible findings。

不要因為本 handoff 預設 WP4 Slice 4 必須存在；GO 後再由 Mainline 依 measured gap 決定下一 frontier。
