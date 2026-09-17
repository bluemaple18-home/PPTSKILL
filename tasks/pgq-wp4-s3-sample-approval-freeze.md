# PGQ-WP4-S3 — Sample Approval Freeze and Scoped Invalidation

**Status:** REPAIR 4 COMPLETE / MANAGED BROWSER ACCEPTANCE NO-GO
**traces_to:** `PGQ-D05`, `PGQ-D09`, `PGQ-D11`

## Objective

把 Slice 2 已通過的 Representative Sample hard gate 轉成可重播的 human approval freeze，並將回饋限定為 `slide-local | deck-wide | profile-opt-in`。後續狀態比較只使受影響樣張失效；未受影響的 approved sample 必須保留原 content／composition identity，不得靜默重生。

## Measured gap

- Slice 1 已提供 stable Typical／Stress identity，Slice 2 已提供 deterministic hard-gate result，但目前沒有把 human approval 與當下 content／composition／style／contract version 綁定。
- 現有 local profile 已要求 `remember=true` 才能寫入；PGQ 尚無 pure planner 將 `profile-opt-in` 與一般 deck feedback 隔離。
- 缺少 affected-only invalidation 時，任何後續修改都可能誤使全部核准頁失效，或反過來沿用已受影響的核准頁。

## Input / output contract

- Input：合法 Slice 1 `sample`、portable HTML artifact、sanitized DeckSpec、human approval、bounded feedback items、contract version，以及 optional current DeckSpec／contract version。
- Approval CLI 會以 packaged Chrome producer 直接重驗 artifact，再從 artifact 內 canonical DeckSpec 派生 trusted in-process evidence；caller 不得提交 hard gate、PASS、evidence object、fingerprint、invalidation verdict 或 propagation target。
- Freeze identity 由 runtime 依每張 sample 的 sanitized content、composition，加上 deck style 與 contract version deterministic 派生。
- Feedback scope 只接受 `slide-local | deck-wide | profile-opt-in`；slide-local 必須指向 sample slide，deck-wide 不得夾帶 target，profile-opt-in 必須明示 `remember=true`，但本 slice 不寫 profile。
- Output：immutable approval freeze、sorted feedback plan、每張 sample 的 `preserved | invalidated` 與 bounded reason codes、`remainingDeckAction`、`fullDeckQaRequired=true`。
- 未提供 current state 時只建立 freeze；提供時，content／composition 只使該頁失效，style 或 contract version 使全部 sample 失效；非 sample 頁變更不影響 freeze。

## Acceptance

1. 非 PASS hard gate、非 human approval、偽造／不一致 sample identity、DeckSpec 缺 sample slide 均 fail loud。
1a. Producer 必須把每張 sample 的 rendered slide DOM 與 embedded DeckSpec 重新 render 的 canonical slide 比對；只改可見 HTML、保留 `#deck-spec` 時 `content_integrity` 必須 fail，不得常數 PASS。
2. 同一 sanitized input 與 contract version 產生相同 fingerprint；input 與 output 不被 mutation。
3. slide-local feedback 只規劃目標頁；deck-wide 只規劃尚未核准頁，且若允許設定已改變，透過 current state 使受影響 sample 失效。
4. profile-opt-in 未明示 remember 時 fail loud；明示時只輸出 `profileWriteRequired=true`，不呼叫 local-profile writer。
5. sample content／composition 改變只 invalidated 該頁；style／contract version 改變 invalidated 全 sample；非 sample 內容改變維持全部 preserved。
6. preserved sample 的 content／composition fingerprints 必須與 freeze 一致；不得自動 patch、regenerate 或宣告 full-deck PASS。
7. Direct 與 installed CLI 使用同一 pure contract；portable output 不含 arbitrary JS、live DOM、review chain-of-thought 或未 allowlist 欄位。
8. Focused、WP4 Slice 1～2 compatibility、PGQ targeted、full regression、fresh ZIP lifecycle、syntax 與 `git diff --check` PASS。

## Blocking edges / checkpoint

- 已滿足：PGQ-WP4 Slice 1～2 COMPLETE，stable sample identity 與 hard-gate PASS contract 已存在。
- Frontier：本卡完成後，Layer-2 structure/readability advisory 與 Layer-3 Owner calibration 才有 stable freeze／invalidation boundary。
- Checkpoint：independent review GO 後再決定三層 readability 的最小後續 slice；不預設 Slice 4。

## Likely files

- `runtime/sample-approval.js`
- `runtime/workflow-cli.mjs`
- `tests/pgq-wp4-s3-sample-approval.test.mjs`
- packaged Skill／thin adapters（只同步唯一 CLI contract）

## Non-goals

- 不執行 deck mutation、自動 regenerate、Layer-2 AI advisory、Layer-3 aesthetic verdict、full-deck orchestration或 profile write。
- 不新增 DB、ledger、service、hook、agent、任意 feedback runtime 或第二套 DeckSpec truth。
- 不重開 WP3 Slice 4、WP4 Slice 1～2、EDX、Golden grammar 或 renderer primitive。

## Verification

- TDD RED：approval prerequisites、stable fingerprints、scope allowlist、profile explicit opt-in、local/global/contract invalidation、unaffected preservation、input/output immutability。
- Direct/installed CLI parity；WP4 Slice 1～2 compatibility。
- PGQ targeted、full suite、fresh ZIP install/smoke/uninstall、syntax、`git diff --check`。

## Candidate result

- Focused：8/8 PASS；WP4 Slice 1～3 compatibility：20/20 PASS。
- PGQ targeted＋PS-002/R6：95/95 PASS；full regression：203/203 PASS。
- Fresh ZIP lifecycle PASS；2,141,327 bytes；SHA-256 `591c5d5ac331e0f53cdeedd19bac6ddaaccf868c6700f965c46f2f939678db46`。
- Managed Browser gate：NO-GO。Chrome 啟動後，AI Core resource observer 以 `resource observation unknown (symlink or special file)` fail-closed；exit 2，owned tmp root 已回收。不得沿用 Repair 3 的舊 browser PASS。
- Candidate implementation＋repair commits：`8d39450`、`1e06246`、`eea6b7c`、`dab445a`、`105197f`；等待 managed browser gate 可重跑與 independent re-review，不 merge／push／開後續 Slice 或 EDX。

## Review repair

- Repair 1：Slice 2 hard gate 可接受 `validationContext`，從實際受驗的 sanitized sample content／composition、Style 與 contract version 自行派生 `validatedIdentity`；legacy 無 approval path 的 gate request 保持相容。
- Slice 3 approval 現要求同一 identity-bound hard-gate request，並重算 approval DeckSpec identity；舊 PASS evidence 搭配改後 content、composition、Style 或 contract 一律 fail loud，要求重新 hard gate。
- Direct 與 fresh installed CLI 均新增 stale-PASS regression；修補前為 RED，修補後 PASS。
- Repair 2：每筆 hard-check result 現必須攜帶與 gate `validationContext` 派生結果完全相同的 `identityFingerprint`；缺漏、單筆竄改，或同步換 DeckSpec/context 卻沿用舊 checks 均 fail loud。Legacy 無 validation context 的 gate request維持既有形狀。
- Repair 3（Mainline replan）：移除 approval 對 caller-authored hard-check result／fingerprint 的信任。`approve-sample` 現要求 `--artifact`，自行執行 packaged static＋normal Chrome producer；只有同一 runtime 內由 producer 建立、以 private capability 綁定的 evidence 可進 approval gate，序列化／重算／改寫的新 fingerprint 一律 fail loud。Slice 2 `qa-sample` 保留為 legacy bounded repair planner，但不再具有 approval authority。
- Forced-static browser seam 改用明確 bounded runtime flag，不再刪除 `IntersectionObserver`；producer 同時把 console 納入 PASS gate。Direct＋fresh-installed regression、PGQ targeted 94/94、full 202/202 及真 Chrome acceptance 均 PASS。
- Repair 4：`content_integrity` 不再常數 PASS。Producer 從 embedded DeckSpec 重建 canonical deck，對每張 rendered slide 做 bounded normalization 後比對；visible HTML 與 canonical state 分歧會進 receipt 並 fail。RED 為 `Missing expected rejection`，修後 direct producer 與 fresh-installed approval 均拒絕同一 tampered artifact。
- Repair 4 產品 regressions 全綠，但正式 managed browser lifecycle 本輪 NO-GO；待環境可完整觀測後重跑，才能恢復 Browser Acceptance PASS／Slice GO。
