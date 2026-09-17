# PGQ-WP4 Slice 3 Candidate Receipt

Date：2026-09-17
Branch：`codex/pgq-wp4-s3`
Base：`d5201fddcba20787b09df26f794a4ab2f70ba1d6`
Implementation：`8d39450`
Repair 1：`1e06246`
Repair 2：`eea6b7c`

## Delivered contract

- `approveRepresentativeSample()` 重跑 Slice 2 pure hard gate；caller 不能只自報 PASS。
- Hard gate 的 `validationContext` 會從實際受驗 DeckSpec／contract 自行派生 `validatedIdentity`；approval identity 不一致時必須重驗，不能沿用 stale PASS。
- 每筆 hard check 必須攜帶同一 identity fingerprint；missing/mismatch 立即 fail loud，不能只換 validation context 後重用舊 evidence refs/status。
- 只有 `approved=true` 且 `approvedBy=human` 可建立 freeze。
- Freeze 由 sanitized DeckSpec 的 sample content、composition、deck Style 與 bounded contract version 派生 SHA-256 fingerprints。
- Feedback 只接受 allowlisted `slide-local | deck-wide | profile-opt-in` code；不接受 raw prompt／任意 instruction。
- slide-local 只使目標 sample 進入 reapproval；deck-wide 只規劃未核准頁；profile-opt-in 必須 `remember=true`，本 seam 不呼叫 profile writer。
- current state 比對只使受影響 sample 失效：content／composition 是 per-slide，Style／contract version 是全 sample，非 sample change 不影響 freeze。
- Output 始終保留 `fullDeckQaRequired=true`，不執行 deck mutation 或靜默 regenerate。

## Verification

- Focused Slice 3：7/7 PASS。
- WP4 Slice 1～3 compatibility：19/19 PASS。
- PGQ targeted＋PS-002/R6：94/94 PASS。
- Full regression：202/202 PASS。
- Syntax、branch-range `git diff --check`：PASS。
- Fresh ZIP install/smoke/uninstall：PASS。
- ZIP：2,130,008 bytes。
- SHA-256：`d23d31a4be8399178ababc0c168db7523a7ea51e7e8ddf8fc050c70500846848`。
- Browser gate：NOT_APPLICABLE；沒有 renderer／DOM／CSS／browser runtime 變更。

## Preserved boundaries

- 沒有自動 patch／regenerate、Layer-2 advisory、Layer-3 aesthetic verdict、full-deck orchestration或 profile write。
- 沒有新增 DB、ledger、service、hook、agent 或第二套 DeckSpec truth。
- WP4 後續 Slice 與 EDX 未開始；未 merge／push。
