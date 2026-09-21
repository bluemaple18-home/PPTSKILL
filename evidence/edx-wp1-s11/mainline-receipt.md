# S11 Mainline acceptance receipt

狀態：**REVIEW_CANDIDATE / INDEPENDENT_REVIEW_PENDING**；2026-09-22。

Product SHA：`5589217175c443f407785f3a3b2aac110896d5f2`；branch `codex/edx-wp1-s11-equal-gap`；base `29c83fa415ad1424395f8d71612542c6a824f308`。

## Scope / root question

既有 `distribute-selection` 的 `horizontal-gaps` / `vertical-gaps` 是否能在真 multi-selection、canonical geometry、export/offline reopen 與 affected PGQ 中維持契約。本輪只補 host evidence，不修改 source/tests/harness/ZIP，不新增 AI Core repair 或 runtime。

## 已提交 non-browser evidence

產品開發 checkpoint `5b9f9cd` 保存 targeted **34/34**、focused **211/211**、full non-browser **416/416 PASS** 與 ZIP lifecycle PASS。本輪不重跑、不把既有數字宣稱成本輪 fresh；見 `mainline-checkpoint.md` 與各具名 log。

## 本輪 fresh host verification

- `host-acceptance/equal-gap/acceptance.json`：1280×720、1600×900 各 **13 checks PASS**（10 base + 3 S11 aggregated checks）。
- S11 真 shift multi-select：2-selection controls 隱藏、3-selection 顯示；水平／垂直不同尺寸 equal gap、頭尾固定、selection retained；export exact canonical，offline reopen selection empty、editor chrome 清除。
- Console/page/network/HTTP/remote errors 全 **0**；每 viewport `targetClosed=true`；帶 hash 的 HTML artifact 全 MATCH。
- `host-acceptance/pgq.log`：四支 affected PGQ 使用 `--test-concurrency=1` **單輪 16/16 unique named PASS**；fail/cancelled/skipped 全 0，耗時 746898.720166ms。沒有合併重試結果。
- AI Core `e155b3abeabe45c2442bcf86c30236237c84ffaa` 正式 managed host entry，`hostSandbox=null`。沒有清除 sandbox 旗標或放寬容量／檔案數／TTL／scanner gate。
- 12 秒 logical-line readiness PASS（不要求 final newline）；readiness / equal-gap / PGQ / Browser.close / supervisor 均 exit 0。
- `host-acceptance/lifecycle/evidence/session.json` 與 controller owned root 一致；owned root 已不存在、isolation marker absent。Cleanup **PASS**。

## Integrity / limits

`host-final-verification.json` 與 controller before/after：source **8/8 MATCH**、protected **4/4 MATCH**；ZIP **2,282,817 bytes**，SHA-256 `388e2bfefbcc9d483760f21a51f0b18458ef975ffb68ad58ce6e06d04530c959`。本輪沒有 rebuild ZIP。Product 到 evidence/control HEAD 不變更交付程式與 ZIP。

原 sandbox preflight pending 保留於 `browser-preflight.txt` / `mainline-checkpoint.md`；S11 本輪無 browser/PGQ FAIL。S10 歷史 scan-limit FAIL 保留於原 S10 evidence，沒有改寫成 S11 evidence 或刪除。

## Mainline decision / handoff

Host blocker 已解除，可交 Independent Review；本 receipt **不是 Independent GO**。交 `handoff_20260922_edx_wp1_s11_review.md`。未 merge／push／deploy，未開 S12。
