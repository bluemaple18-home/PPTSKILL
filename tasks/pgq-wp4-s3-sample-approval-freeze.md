# PGQ-WP4-S3 — Sample Approval Freeze and Scoped Invalidation

**Status:** READY FOR INDEPENDENT REVIEW
**traces_to:** `PGQ-D05`, `PGQ-D09`, `PGQ-D11`

## Objective

把 Slice 2 已通過的 Representative Sample hard gate 轉成可重播的 human approval freeze，並將回饋限定為 `slide-local | deck-wide | profile-opt-in`。後續狀態比較只使受影響樣張失效；未受影響的 approved sample 必須保留原 content／composition identity，不得靜默重生。

## Measured gap

- Slice 1 已提供 stable Typical／Stress identity，Slice 2 已提供 deterministic hard-gate result，但目前沒有把 human approval 與當下 content／composition／style／contract version 綁定。
- 現有 local profile 已要求 `remember=true` 才能寫入；PGQ 尚無 pure planner 將 `profile-opt-in` 與一般 deck feedback 隔離。
- 缺少 affected-only invalidation 時，任何後續修改都可能誤使全部核准頁失效，或反過來沿用已受影響的核准頁。

## Input / output contract

- Input：合法 Slice 1 `sample`、可由 Slice 2 pure gate 重播的 `hardGateRequest`、sanitized DeckSpec、human approval、bounded feedback items、contract version，以及 optional current DeckSpec／contract version。
- Approval 會重跑 hard gate，且只接受結果 `status=pass`、`approved=true`、`approvedBy=human`；caller 不得自報 PASS、fingerprint、invalidation verdict 或 propagation target。
- Freeze identity 由 runtime 依每張 sample 的 sanitized content、composition，加上 deck style 與 contract version deterministic 派生。
- Feedback scope 只接受 `slide-local | deck-wide | profile-opt-in`；slide-local 必須指向 sample slide，deck-wide 不得夾帶 target，profile-opt-in 必須明示 `remember=true`，但本 slice 不寫 profile。
- Output：immutable approval freeze、sorted feedback plan、每張 sample 的 `preserved | invalidated` 與 bounded reason codes、`remainingDeckAction`、`fullDeckQaRequired=true`。
- 未提供 current state 時只建立 freeze；提供時，content／composition 只使該頁失效，style 或 contract version 使全部 sample 失效；非 sample 頁變更不影響 freeze。

## Acceptance

1. 非 PASS hard gate、非 human approval、偽造／不一致 sample identity、DeckSpec 缺 sample slide 均 fail loud。
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

- Focused：7/7 PASS；WP4 Slice 1～3 compatibility：19/19 PASS。
- PGQ targeted＋PS-002/R6：94/94 PASS；full regression：202/202 PASS。
- Fresh ZIP lifecycle PASS；2,129,589 bytes；SHA-256 `402b07030883ef9f15620701558963611f9f181645f97d86beb41db29d4fc95a`。
- Browser gate：NOT_APPLICABLE；本 slice 只新增 pure approval/freeze decision、CLI 與 packaged instructions，未改 renderer／DOM／CSS／browser runtime。
- Candidate implementation＋repair commit：`8d39450`、`1e06246`；等待 independent re-review，不 merge／push／開後續 Slice 或 EDX。

## Review repair

- Repair 1：Slice 2 hard gate 可接受 `validationContext`，從實際受驗的 sanitized sample content／composition、Style 與 contract version 自行派生 `validatedIdentity`；legacy 無 approval path 的 gate request 保持相容。
- Slice 3 approval 現要求同一 identity-bound hard-gate request，並重算 approval DeckSpec identity；舊 PASS evidence 搭配改後 content、composition、Style 或 contract 一律 fail loud，要求重新 hard gate。
- Direct 與 fresh installed CLI 均新增 stale-PASS regression；修補前為 RED，修補後 PASS。
