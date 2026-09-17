# PGQ-WP4 Slice 3 Candidate Receipt

Date：2026-09-17
Branch：`codex/pgq-wp4-s3`
Base：`d5201fddcba20787b09df26f794a4ab2f70ba1d6`
Implementation：`8d39450`
Repair 1：`1e06246`
Repair 2：`eea6b7c`
Repair 3：`dab445a`

## Delivered contract

- `approveRepresentativeSample()` 只接受同一 runtime 內由 trusted Chrome producer 建立的 branded evidence；JSON clone、caller PASS、evidence refs 或重算 fingerprint 都不能取得 authority。
- Installed `approve-sample` 要求 `--artifact`，自行跑 packaged static＋normal producer，並從 artifact 內 canonical DeckSpec 派生 `validatedIdentity`；approval request 不接受 `hardGateRequest` 或 `qaEvidence`。
- Artifact 在 producer 執行前後會比對 SHA-256；DeckSpec／Style／contract 與 producer identity 不一致時 fail loud。
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
- Browser producer：static／normal 在 1600×900、1280×720 全部 PASS；console、pageerror、network failure、HTTP error、geometry issue 均為 0，layout stable 且 resting visible。
- Browser evidence：`producer-browser-acceptance.json`；artifact SHA-256 `a185dea10de1c3c1f239fba2c7fd3277e4c0df9b315555df4aafa0a991e337c3`。
- Fresh ZIP：2,140,638 bytes；SHA-256 `3f971fc33a390952e0ba84ff6c3d9df1e9086ba240c218d86babfa205462a73b`。

## Preserved boundaries

- 沒有自動 patch／regenerate、Layer-2 advisory、Layer-3 aesthetic verdict、full-deck orchestration或 profile write。
- 沒有新增 DB、ledger、service、hook、agent 或第二套 DeckSpec truth。
- WP4 後續 Slice 與 EDX 未開始；未 merge／push。
