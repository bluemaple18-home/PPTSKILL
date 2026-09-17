# PGQ-WP4 Slice 3 Candidate Receipt

Date：2026-09-17
Branch：`codex/pgq-wp4-s3`
Base：`d5201fddcba20787b09df26f794a4ab2f70ba1d6`
Implementation：`8d39450`
Repair 1：`1e06246`
Repair 2：`eea6b7c`
Repair 3：`dab445a`
Repair 4：branch `HEAD`（本 receipt 隨 repair commit 提交）

## Delivered contract

- `approveRepresentativeSample()` 只接受同一 runtime 內由 trusted Chrome producer 建立的 branded evidence；JSON clone、caller PASS、evidence refs 或重算 fingerprint 都不能取得 authority。
- Installed `approve-sample` 要求 `--artifact`，自行跑 packaged static＋normal producer，並從 artifact 內 canonical DeckSpec 派生 `validatedIdentity`；approval request 不接受 `hardGateRequest` 或 `qaEvidence`。
- Artifact 在 producer 執行前後會比對 SHA-256；DeckSpec／Style／contract 與 producer identity 不一致時 fail loud。
- Producer 會從 embedded DeckSpec 重建 canonical deck，逐頁正規化並比對 rendered slide DOM；`content_integrity` 只由實際比對結果產生，不接受常數或 caller verdict。
- 只有 `approved=true` 且 `approvedBy=human` 可建立 freeze。
- Freeze 由 sanitized DeckSpec 的 sample content、composition、deck Style 與 bounded contract version 派生 SHA-256 fingerprints。
- Feedback 只接受 allowlisted `slide-local | deck-wide | profile-opt-in` code；不接受 raw prompt／任意 instruction。
- slide-local 只使目標 sample 進入 reapproval；deck-wide 只規劃未核准頁；profile-opt-in 必須 `remember=true`，本 seam 不呼叫 profile writer。
- current state 比對只使受影響 sample 失效：content／composition 是 per-slide，Style／contract version 是全 sample，非 sample change 不影響 freeze。
- Output 始終保留 `fullDeckQaRequired=true`，不執行 deck mutation 或靜默 regenerate。

## Verification

- Focused Slice 3：8/8 PASS。
- WP4 Slice 1～3 compatibility：20/20 PASS。
- PGQ targeted＋PS-002/R6：95/95 PASS。
- Full regression：203/203 PASS。
- Syntax、branch-range `git diff --check`：PASS。
- Fresh ZIP install/smoke/uninstall：PASS。
- Adversarial product probe：篡改 sample 可見 title、保留 embedded DeckSpec，修前 producer 錯誤 PASS；修後 direct 與 installed CLI 均 fail loud。
- Managed Browser Acceptance：NO-GO；`tmp_session.py browser` 在 Chrome 啟動後因 `resource observation unknown (symlink or special file)` exit 2。證據：`browser-repair4-managed/evidence/`；owned root cleanup 已確認。
- `producer-browser-acceptance.json` 是 Repair 3 的歷史 receipt，因 producer code 已變更而失效，不得作為 Repair 4 PASS。
- Fresh ZIP：2,141,327 bytes；SHA-256 `591c5d5ac331e0f53cdeedd19bac6ddaaccf868c6700f965c46f2f939678db46`。

## Preserved boundaries

- 沒有自動 patch／regenerate、Layer-2 advisory、Layer-3 aesthetic verdict、full-deck orchestration或 profile write。
- 沒有新增 DB、ledger、service、hook、agent 或第二套 DeckSpec truth。
- WP4 後續 Slice 與 EDX 未開始；未 merge／push。
- Current acceptance status：產品修復 GREEN；正式 Browser Acceptance NO-GO，尚不能宣告 Slice GO。
